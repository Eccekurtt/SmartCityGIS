using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Features;
using SmartCityGis.Api.Data;
using SmartCityGis.Api.Models;
using SmartCityGis.Api.Services;

namespace SmartCityGis.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class NeighborhoodsController(AppDbContext db) : ControllerBase
{
    public record NeighborhoodStats(
        int Id,
        string Name,
        string District,
        double AreaKm2,
        int AssetCount,
        int MaintenanceCount,
        double AssetsPerKm2);

    /// <summary>Mahalleler ve içlerindeki varlık sayıları (mekânsal birleştirme: ST_Intersects).</summary>
    [HttpGet]
    public async Task<IEnumerable<NeighborhoodStats>> List([FromQuery] string? district, CancellationToken ct)
    {
        var rows = await StatsQuery(district).ToListAsync(ct);
        return rows.Select(ToStats).OrderByDescending(s => s.AssetCount).ThenBy(s => s.Name);
    }

    /// <summary>Mahalle sınırları GeoJSON olarak, varlık sayılarıyla (haritada koroplet gösterimi için).</summary>
    [HttpGet("geojson")]
    [Produces("application/geo+json", "application/json")]
    public async Task<ActionResult<FeatureCollection>> GeoJson([FromQuery] string? district, CancellationToken ct)
    {
        var rows = await StatsQuery(district).ToListAsync(ct);

        var collection = new FeatureCollection();
        foreach (var row in rows)
        {
            var stats = ToStats(row);
            collection.Add(new Feature(row.Boundary, new AttributesTable
            {
                { "id", stats.Id },
                { "name", stats.Name },
                { "district", stats.District },
                { "areaKm2", stats.AreaKm2 },
                { "assetCount", stats.AssetCount },
                { "maintenanceCount", stats.MaintenanceCount },
                { "assetsPerKm2", stats.AssetsPerKm2 },
            }));
        }

        return collection;
    }

    /// <summary>Verilen noktanın hangi mahallede olduğunu söyler.</summary>
    [HttpGet("at")]
    public async Task<ActionResult<object>> At(
        [FromQuery] double lat, [FromQuery] double lon, CancellationToken ct)
    {
        if (lat is < -90 or > 90 || lon is < -180 or > 180)
            return BadRequest(new ProblemDetails { Title = "Geçersiz koordinat", Status = 400 });

        var point = Geo.Point(lat, lon);
        var found = await db.Neighborhoods.AsNoTracking()
            .Where(n => n.Boundary.Intersects(point))
            .OrderBy(n => n.AreaSquareMeters)
            .Select(n => new { n.Name, n.District })
            .FirstOrDefaultAsync(ct);

        return found is null ? NotFound() : Ok(found);
    }

    /// <summary>"Belirsiz" mahalleli varlıkları konumlarına göre yeniden eşleştirir.</summary>
    [HttpPost("reassign")]
    public async Task<ActionResult<object>> Reassign(CancellationToken ct)
    {
        // Tek bir SQL: her varlığın temsil noktasını kapsayan en küçük mahalleyi bulur.
        var updated = await db.Database.ExecuteSqlRawAsync(
            """
            UPDATE "Assets" a
            SET "Neighborhood" = n."Name"
            FROM (
                SELECT DISTINCT ON (a2."Id") a2."Id" AS asset_id, nb."Name"
                FROM "Assets" a2
                JOIN "Neighborhoods" nb ON ST_Intersects(nb."Boundary", ST_PointOnSurface(a2."Geometry"))
                WHERE a2."Neighborhood" = {0}
                ORDER BY a2."Id", nb."AreaSquareMeters"
            ) n
            WHERE a."Id" = n.asset_id
            """,
            [NeighborhoodLocator.Unknown],
            ct);

        return Ok(new { updated });
    }

    private IQueryable<StatsRow> StatsQuery(string? district)
    {
        var query = db.Neighborhoods.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(district)) query = query.Where(n => n.District == district);

        return query.Select(n => new StatsRow(
            n.Id, n.Name, n.District, n.AreaSquareMeters, n.Boundary,
            db.Assets.Count(a => a.Geometry.Intersects(n.Boundary)),
            db.Assets.Count(a => a.Status == AssetStatus.UnderMaintenance && a.Geometry.Intersects(n.Boundary))));
    }

    private static NeighborhoodStats ToStats(StatsRow r)
    {
        var areaKm2 = r.AreaSquareMeters / 1_000_000;
        return new NeighborhoodStats(
            r.Id, r.Name, r.District, Math.Round(areaKm2, 3), r.AssetCount, r.MaintenanceCount,
            areaKm2 > 0 ? Math.Round(r.AssetCount / areaKm2, 2) : 0);
    }

    private record StatsRow(
        int Id, string Name, string District, double AreaSquareMeters,
        NetTopologySuite.Geometries.Geometry Boundary, int AssetCount, int MaintenanceCount);
}
