using System.Globalization;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;
using SmartCityGis.Api.Common;
using SmartCityGis.Api.Dtos;
using SmartCityGis.Api.Models;

namespace SmartCityGis.Api.Data;

public static class AssetQueryExtensions
{
    public static IQueryable<Asset> ApplyFilters(this IQueryable<Asset> query, AssetFilter filter)
    {
        var term = TextFolding.Fold(filter.Search);
        if (term != "")
        {
            // SearchText zaten sadeleştirilmiş küçük harfli; pg_trgm GIN indeksi bu LIKE'ı hızlandırır.
            var pattern = $"%{TextFolding.EscapeLike(term)}%";
            query = query.Where(a => EF.Functions.Like(a.SearchText, pattern, "\\"));
        }

        if (filter.Categories.Count > 0)
            query = query.Where(a => filter.Categories.Contains(a.Category));

        if (filter.Statuses.Count > 0)
            query = query.Where(a => filter.Statuses.Contains(a.Status));

        if (!string.IsNullOrWhiteSpace(filter.Neighborhood))
            query = query.Where(a => a.Neighborhood == filter.Neighborhood);

        var bbox = ParseBbox(filter.Bbox);
        if (bbox is not null)
            query = query.Where(a => a.Geometry.Intersects(bbox)); // ST_Intersects: GiST indeksini kullanır

        return query;
    }

    public static IQueryable<Asset> ApplySort(this IQueryable<Asset> query, AssetListQuery q) =>
        (q.Sort.ToLowerInvariant(), q.Desc) switch
        {
            ("category", false) => query.OrderBy(a => a.Category).ThenBy(a => a.Id),
            ("category", true) => query.OrderByDescending(a => a.Category).ThenBy(a => a.Id),
            ("status", false) => query.OrderBy(a => a.Status).ThenBy(a => a.Id),
            ("status", true) => query.OrderByDescending(a => a.Status).ThenBy(a => a.Id),
            ("neighborhood", false) => query.OrderBy(a => a.Neighborhood).ThenBy(a => a.Id),
            ("neighborhood", true) => query.OrderByDescending(a => a.Neighborhood).ThenBy(a => a.Id),
            // Boyutu olmayan (nokta) kayıtlar her iki yönde de en sonda kalır.
            ("size", false) => query.OrderBy(a => (a.AreaSquareMeters ?? a.LengthMeters) == null)
                .ThenBy(a => a.AreaSquareMeters ?? a.LengthMeters).ThenBy(a => a.Id),
            ("size", true) => query.OrderBy(a => (a.AreaSquareMeters ?? a.LengthMeters) == null)
                .ThenByDescending(a => a.AreaSquareMeters ?? a.LengthMeters).ThenBy(a => a.Id),
            ("created", false) => query.OrderBy(a => a.CreatedAt).ThenBy(a => a.Id),
            ("created", true) => query.OrderByDescending(a => a.CreatedAt).ThenBy(a => a.Id),
            (_, true) => query.OrderByDescending(a => a.Name).ThenBy(a => a.Id),
            _ => query.OrderBy(a => a.Name).ThenBy(a => a.Id),
        };

    private static Polygon? ParseBbox(string? bbox)
    {
        if (string.IsNullOrWhiteSpace(bbox)) return null;

        var parts = bbox.Split(',');
        if (parts.Length != 4) return null;

        var values = new double[4];
        for (var i = 0; i < 4; i++)
        {
            if (!double.TryParse(parts[i], NumberStyles.Float, CultureInfo.InvariantCulture, out values[i]))
                return null;
        }

        // Envelope(minX, maxX, minY, maxY)
        var polygon = Geo.Factory.ToGeometry(new Envelope(values[0], values[2], values[1], values[3])) as Polygon;
        if (polygon is not null) polygon.SRID = Geo.Wgs84;
        return polygon;
    }
}
