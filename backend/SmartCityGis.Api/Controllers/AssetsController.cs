using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Features;
using SmartCityGis.Api.Common;
using SmartCityGis.Api.Data;
using SmartCityGis.Api.Dtos;
using SmartCityGis.Api.Models;

namespace SmartCityGis.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AssetsController(AppDbContext db) : ControllerBase
{
    // Harita tek istekte bu kadar özelliğe kadar alır; fazlası için bbox ile daraltılır.
    private const int GeoJsonLimit = 5000;

    /// <summary>Filtrelenmiş, sıralanmış ve sayfalanmış varlık listesi (geometri içermez).</summary>
    [HttpGet]
    public async Task<ActionResult<PagedResult<AssetListItem>>> List(
        [FromQuery] AssetListQuery query, CancellationToken ct)
    {
        var filtered = db.Assets.AsNoTracking().ApplyFilters(query);

        var total = await filtered.CountAsync(ct);
        var items = await filtered
            .ApplySort(query)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .Select(a => new AssetListItem(
                a.Id, a.Name, a.Category, a.Status, a.Neighborhood, a.GeometryType,
                a.Latitude, a.Longitude, a.LengthMeters, a.AreaSquareMeters, a.CreatedAt))
            .ToListAsync(ct);

        return new PagedResult<AssetListItem>(items, total, query.Page, query.PageSize);
    }

    /// <summary>Aynı filtrelerle GeoJSON FeatureCollection (harita, QGIS gibi CBS araçları için).</summary>
    [HttpGet("geojson")]
    [Produces("application/geo+json", "application/json")]
    public async Task<ActionResult<FeatureCollection>> GeoJson([FromQuery] AssetFilter filter, CancellationToken ct)
    {
        var rows = await db.Assets.AsNoTracking()
            .ApplyFilters(filter)
            .OrderBy(a => a.Id)
            .Take(GeoJsonLimit + 1)
            .Select(a => new
            {
                a.Id, a.Name, a.Category, a.Status, a.Neighborhood, a.GeometryType,
                a.Latitude, a.Longitude, a.LengthMeters, a.AreaSquareMeters, a.Geometry
            })
            .ToListAsync(ct);

        Response.Headers["X-Truncated"] = rows.Count > GeoJsonLimit ? "true" : "false";

        var collection = new FeatureCollection();
        foreach (var row in rows.Take(GeoJsonLimit))
        {
            var properties = new AttributesTable
            {
                { "id", row.Id },
                { "name", row.Name },
                { "category", row.Category.ToString() },
                { "status", row.Status.ToString() },
                { "neighborhood", row.Neighborhood },
                { "geometryType", row.GeometryType },
                { "latitude", row.Latitude },
                { "longitude", row.Longitude },
                { "lengthMeters", row.LengthMeters },
                { "areaSquareMeters", row.AreaSquareMeters },
            };
            collection.Add(new Feature(row.Geometry, properties));
        }

        return collection;
    }

    /// <summary>Varlıklarda geçen mahalle adları (filtre listesi için), Türkçe alfabe sırasıyla.</summary>
    [HttpGet("neighborhoods")]
    public async Task<IEnumerable<string>> Neighborhoods(CancellationToken ct)
    {
        var names = await db.Assets.AsNoTracking().Select(a => a.Neighborhood).Distinct().ToListAsync(ct);
        // Veritabanı harmanlaması "C" olduğu için Türkçe sıralamayı burada yapıyoruz.
        var turkish = System.Globalization.CultureInfo.GetCultureInfo("tr-TR");
        return names.OrderBy(n => n, StringComparer.Create(turkish, ignoreCase: true));
    }

    /// <summary>Verilen noktanın radius (metre) çevresindeki varlıklar, en yakından uzağa.</summary>
    [HttpGet("nearby")]
    public async Task<ActionResult<IEnumerable<NearbyAssetResponse>>> Nearby(
        [Range(-90, 90, ErrorMessage = "Enlem -90 ile 90 arasında olmalıdır.")] double lat,
        [Range(-180, 180, ErrorMessage = "Boylam -180 ile 180 arasında olmalıdır.")] double lon,
        [Range(1, 50000, ErrorMessage = "Yarıçap 1 ile 50000 metre arasında olmalıdır.")] double radius = 1000,
        [FromQuery(Name = "category")] List<AssetCategory>? categories = null,
        CancellationToken ct = default)
    {
        var origin = Geo.Point(lat, lon);

        var query = db.Assets.AsNoTracking()
            .Where(a => EF.Functions.IsWithinDistance(a.Geometry, origin, radius, true));

        if (categories is { Count: > 0 })
            query = query.Where(a => categories.Contains(a.Category));

        var rows = await query
            .Select(a => new { Asset = a, Distance = EF.Functions.Distance(a.Geometry, origin, true) })
            .OrderBy(x => x.Distance)
            .Select(x => new NearbyAssetResponse(
                x.Asset.Id, x.Asset.Name, x.Asset.Category, x.Asset.Status, x.Asset.Neighborhood,
                x.Asset.GeometryType, x.Asset.Latitude, x.Asset.Longitude, Math.Round(x.Distance, 1)))
            .ToListAsync(ct);

        return Ok(rows);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<Asset>> GetById(int id, CancellationToken ct)
    {
        var asset = await db.Assets.AsNoTracking().FirstOrDefaultAsync(a => a.Id == id, ct);
        return asset is null ? NotFound() : Ok(asset);
    }

    [HttpPost]
    public async Task<ActionResult<Asset>> Create(AssetRequest request, CancellationToken ct)
    {
        request.Geometry!.SRID = Geo.Wgs84;

        var asset = new Asset
        {
            Name = request.Name.Trim(),
            Category = request.Category,
            Status = request.Status,
            Neighborhood = request.Neighborhood.Trim(),
            Geometry = request.Geometry,
            Description = request.Description
        };

        db.Assets.Add(asset);
        await db.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(GetById), new { id = asset.Id }, asset);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<Asset>> Update(int id, AssetRequest request, CancellationToken ct)
    {
        var asset = await db.Assets.FindAsync([id], ct);
        if (asset is null)
        {
            return NotFound();
        }

        request.Geometry!.SRID = Geo.Wgs84;

        asset.Name = request.Name.Trim();
        asset.Category = request.Category;
        asset.Status = request.Status;
        asset.Neighborhood = request.Neighborhood.Trim();
        asset.Geometry = request.Geometry;
        asset.Description = request.Description;
        asset.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);

        return Ok(asset);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var deleted = await db.Assets.Where(a => a.Id == id).ExecuteDeleteAsync(ct);
        return deleted == 0 ? NotFound() : NoContent();
    }
}
