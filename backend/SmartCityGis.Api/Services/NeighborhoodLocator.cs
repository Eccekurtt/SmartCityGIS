using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;
using SmartCityGis.Api.Data;

namespace SmartCityGis.Api.Services;

// Bir geometrinin hangi mahallede olduğunu mekânsal sorguyla (ST_Intersects) bulur.
public class NeighborhoodLocator(AppDbContext db)
{
    public const string Unknown = "Belirsiz";

    public async Task<string> FindNameAsync(Geometry geometry, CancellationToken ct = default)
    {
        // Çizgi ve alanlar için temsil noktası: geometrinin içinde kalması garanti (ST_PointOnSurface).
        var point = geometry is Point ? geometry : geometry.InteriorPoint;
        point.SRID = Geo.Wgs84;

        // Sınırlar çakışırsa en küçük (en spesifik) mahalleyi seç.
        var name = await db.Neighborhoods.AsNoTracking()
            .Where(n => n.Boundary.Intersects(point))
            .OrderBy(n => n.AreaSquareMeters)
            .Select(n => n.Name)
            .FirstOrDefaultAsync(ct);

        return name ?? Unknown;
    }
}
