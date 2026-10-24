using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartCityGis.Api.Data;

namespace SmartCityGis.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ReportsController(AppDbContext db) : ControllerBase
{
    public record CountItem(string Key, int Count);

    public record SummaryResponse(
        int Total,
        IReadOnlyList<CountItem> ByStatus,
        IReadOnlyList<CountItem> ByCategory,
        IReadOnlyList<CountItem> ByGeometryType,
        double TotalLengthKm,
        double TotalAreaHectares);

    /// <summary>Tüm envanterin özeti: durum, kategori, geometri türü dağılımı ve toplam uzunluk/alan.</summary>
    [HttpGet("summary")]
    public async Task<SummaryResponse> Summary(CancellationToken ct)
    {
        var assets = db.Assets.AsNoTracking();

        var byStatus = await assets.GroupBy(a => a.Status)
            .Select(g => new CountItem(g.Key.ToString(), g.Count())).ToListAsync(ct);
        var byCategory = await assets.GroupBy(a => a.Category)
            .Select(g => new CountItem(g.Key.ToString(), g.Count())).ToListAsync(ct);
        var byGeometryType = await assets.GroupBy(a => a.GeometryType)
            .Select(g => new CountItem(g.Key, g.Count())).ToListAsync(ct);

        var lengthMeters = await assets.SumAsync(a => a.LengthMeters ?? 0, ct);
        var areaSquareMeters = await assets.SumAsync(a => a.AreaSquareMeters ?? 0, ct);

        return new SummaryResponse(
            byStatus.Sum(x => x.Count),
            byStatus, byCategory, byGeometryType,
            Math.Round(lengthMeters / 1000, 2),
            Math.Round(areaSquareMeters / 10_000, 2));
    }
}
