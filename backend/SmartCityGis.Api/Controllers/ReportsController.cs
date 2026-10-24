using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartCityGis.Api.Common;
using SmartCityGis.Api.Data;
using SmartCityGis.Api.Models;

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

    public record NeighborhoodCount(string Name, int Assets, int UnderMaintenance);

    public record MonthlyPoint(string Month, int Completed, decimal Cost);

    public record UpcomingItem(
        int Id, int AssetId, string AssetName, string Title, MaintenanceType Type,
        MaintenancePriority Priority, DateOnly ScheduledDate, bool IsOverdue);

    public record DashboardResponse(
        SummaryResponse Summary,
        IReadOnlyList<NeighborhoodCount> TopNeighborhoods,
        IReadOnlyList<MonthlyPoint> MaintenanceByMonth,
        IReadOnlyList<CountItem> MaintenanceByType,
        IReadOnlyList<CountItem> MaintenanceByStatus,
        IReadOnlyList<UpcomingItem> Upcoming,
        int OverdueCount,
        decimal CostLast12Months,
        double? AvgCompletionDays,
        int AssetsNeverMaintained);

    /// <summary>Tüm envanterin özeti: durum, kategori, geometri türü dağılımı ve toplam uzunluk/alan.</summary>
    [HttpGet("summary")]
    public Task<SummaryResponse> Summary(CancellationToken ct) => BuildSummaryAsync(ct);

    /// <summary>Yönetim paneli: envanter, mahalle, bakım trendi ve yaklaşan işler tek yanıtta.</summary>
    [HttpGet("dashboard")]
    public async Task<DashboardResponse> Dashboard(CancellationToken ct)
    {
        var summary = await BuildSummaryAsync(ct);
        var today = Clock.Today;

        // Mahalle bazında varlık ve bakımdaki varlık sayısı (ilk 10).
        // (Sıralama, kayıt türüne dönüştürmeden önce yapılır; EF Core çevirisi için gerekli.)
        var neighborhoodRows = await db.Assets.AsNoTracking()
            .GroupBy(a => a.Neighborhood)
            .Select(g => new
            {
                Name = g.Key,
                Assets = g.Count(),
                UnderMaintenance = g.Count(a => a.Status == AssetStatus.UnderMaintenance)
            })
            .OrderByDescending(n => n.Assets).ThenBy(n => n.Name)
            .Take(10)
            .ToListAsync(ct);
        var neighborhoods = neighborhoodRows
            .Select(n => new NeighborhoodCount(n.Name, n.Assets, n.UnderMaintenance))
            .ToList();

        // Son 12 ayın tamamlanan bakımları: ay bazında adet ve maliyet. Eksik aylar 0 ile doldurulur.
        var firstMonth = new DateTime(today.Year, today.Month, 1, 0, 0, 0, DateTimeKind.Utc).AddMonths(-11);
        var monthlyRaw = await db.MaintenanceRecords.AsNoTracking()
            .Where(m => m.Status == MaintenanceStatus.Completed && m.CompletedAt >= firstMonth)
            .GroupBy(m => new { m.CompletedAt!.Value.Year, m.CompletedAt!.Value.Month })
            .Select(g => new { g.Key.Year, g.Key.Month, Count = g.Count(), Cost = g.Sum(m => m.Cost ?? 0) })
            .ToListAsync(ct);

        var monthly = Enumerable.Range(0, 12)
            .Select(i => firstMonth.AddMonths(i))
            .Select(month =>
            {
                var row = monthlyRaw.FirstOrDefault(r => r.Year == month.Year && r.Month == month.Month);
                return new MonthlyPoint($"{month:yyyy-MM}", row?.Count ?? 0, row?.Cost ?? 0);
            })
            .ToList();

        var byType = await db.MaintenanceRecords.AsNoTracking()
            .GroupBy(m => m.Type)
            .Select(g => new CountItem(g.Key.ToString(), g.Count()))
            .ToListAsync(ct);

        var byStatus = await db.MaintenanceRecords.AsNoTracking()
            .GroupBy(m => m.Status)
            .Select(g => new CountItem(g.Key.ToString(), g.Count()))
            .ToListAsync(ct);

        // Gecikmişler önce, sonra önümüzdeki 14 günün planlı işleri.
        var horizon = today.AddDays(14);
        var upcoming = await db.MaintenanceRecords.AsNoTracking()
            .Where(m => m.Status == MaintenanceStatus.Planned && m.ScheduledDate <= horizon)
            .OrderBy(m => m.ScheduledDate).ThenByDescending(m => m.Priority)
            .Take(8)
            .Select(m => new UpcomingItem(
                m.Id, m.AssetId, m.Asset.Name, m.Title, m.Type, m.Priority, m.ScheduledDate,
                m.ScheduledDate < today))
            .ToListAsync(ct);

        var overdue = await db.MaintenanceRecords.CountAsync(
            m => m.Status == MaintenanceStatus.Planned && m.ScheduledDate < today, ct);

        var cost = await db.MaintenanceRecords
            .Where(m => m.Status == MaintenanceStatus.Completed && m.CompletedAt >= firstMonth)
            .SumAsync(m => m.Cost ?? 0, ct);

        // Başlangıç -> bitiş süresi (gün) ortalaması.
        var durations = await db.MaintenanceRecords.AsNoTracking()
            .Where(m => m.Status == MaintenanceStatus.Completed && m.StartedAt != null && m.CompletedAt != null)
            .Select(m => new { m.StartedAt, m.CompletedAt })
            .ToListAsync(ct);
        double? avgDays = durations.Count == 0
            ? null
            : Math.Round(durations.Average(d => (d.CompletedAt!.Value - d.StartedAt!.Value).TotalDays), 1);

        var neverMaintained = await db.Assets.CountAsync(a => !a.MaintenanceRecords.Any(), ct);

        return new DashboardResponse(
            summary, neighborhoods, monthly, byType, byStatus, upcoming, overdue, cost, avgDays, neverMaintained);
    }

    private async Task<SummaryResponse> BuildSummaryAsync(CancellationToken ct)
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
