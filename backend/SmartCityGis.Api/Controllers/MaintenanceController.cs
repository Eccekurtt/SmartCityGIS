using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartCityGis.Api.Common;
using SmartCityGis.Api.Data;
using SmartCityGis.Api.Dtos;
using SmartCityGis.Api.Models;
using SmartCityGis.Api.Security;
using SmartCityGis.Api.Services;

namespace SmartCityGis.Api.Controllers;

[ApiController]
public class MaintenanceController(AppDbContext db) : ControllerBase
{
    public record MaintenanceSummary(
        int Planned,
        int InProgress,
        int Overdue,
        int DueNext7Days,
        int CompletedLast30Days,
        decimal CostLast30Days);

    // ------------------------------------------------------------------ Varlığa bağlı uç noktalar

    /// <summary>Bir varlığın bakım geçmişi (en yeni tarih önce).</summary>
    [HttpGet("api/assets/{assetId:int}/maintenance")]
    public async Task<ActionResult<IEnumerable<MaintenanceDto>>> ListForAsset(int assetId, CancellationToken ct)
    {
        if (!await db.Assets.AnyAsync(a => a.Id == assetId, ct)) return NotFound();

        var today = Clock.Today;
        var ordered = db.MaintenanceRecords.AsNoTracking()
            .Where(m => m.AssetId == assetId)
            .OrderByDescending(m => m.ScheduledDate).ThenByDescending(m => m.Id);
        var items = await Dtos(ordered, today).ToListAsync(ct);

        return Ok(items);
    }

    /// <summary>Varlık için yeni bakım planlar.</summary>
    [HttpPost("api/assets/{assetId:int}/maintenance")]
    [Authorize(Policy = Policies.CanWrite)]
    public async Task<ActionResult<MaintenanceDto>> Create(int assetId, MaintenanceRequest request, CancellationToken ct)
    {
        if (!await db.Assets.AnyAsync(a => a.Id == assetId, ct)) return NotFound();

        var record = new MaintenanceRecord
        {
            AssetId = assetId,
            Title = request.Title.Trim(),
            Type = request.Type,
            Priority = request.Priority,
            ScheduledDate = request.ScheduledDate!.Value,
            Description = request.Description,
            Technician = request.Technician,
            Cost = request.Cost
        };

        db.MaintenanceRecords.Add(record);
        await db.SaveChangesAsync(ct);

        var dto = await GetDtoAsync(record.Id, ct);
        return CreatedAtAction(nameof(Get), new { id = record.Id }, dto);
    }

    // ------------------------------------------------------------------ Genel uç noktalar

    /// <summary>Tüm bakım kayıtları: filtreli, sayfalı. Planlı ve tarihi geçmiş olanlar "gecikmiş" sayılır.</summary>
    [HttpGet("api/maintenance")]
    public async Task<ActionResult<PagedResult<MaintenanceDto>>> List([FromQuery] MaintenanceQuery q, CancellationToken ct)
    {
        var today = Clock.Today;
        var query = db.MaintenanceRecords.AsNoTracking().AsQueryable();

        if (q.Statuses.Count > 0) query = query.Where(m => q.Statuses.Contains(m.Status));
        if (q.Types.Count > 0) query = query.Where(m => q.Types.Contains(m.Type));
        if (q.AssetId is not null) query = query.Where(m => m.AssetId == q.AssetId);
        if (q.OverdueOnly) query = query.Where(m => m.Status == MaintenanceStatus.Planned && m.ScheduledDate < today);

        var term = TextFolding.Fold(q.Search);
        if (term != "")
        {
            var pattern = $"%{TextFolding.EscapeLike(term)}%";
            query = query.Where(m => EF.Functions.Like(m.Asset.SearchText, pattern, "\\"));
        }

        var total = await query.CountAsync(ct);

        // Sıralama varlık (entity) üzerinde yapılır, dönüştürme (DTO) en son; EF Core çevirisi için gerekli.
        var ordered = query
            // Açık işler (planlı / devam eden) önce, kendi içinde tarihe göre; kapananlar sonda.
            .OrderBy(m => m.Status == MaintenanceStatus.Completed || m.Status == MaintenanceStatus.Cancelled)
            .ThenBy(m => m.ScheduledDate)
            .ThenBy(m => m.Id)
            .Skip((q.Page - 1) * q.PageSize)
            .Take(q.PageSize);

        var items = await Dtos(ordered, today).ToListAsync(ct);

        return new PagedResult<MaintenanceDto>(items, total, q.Page, q.PageSize);
    }

    /// <summary>Bakım iş yükü özeti.</summary>
    [HttpGet("api/maintenance/summary")]
    public async Task<MaintenanceSummary> Summary(CancellationToken ct)
    {
        var today = Clock.Today;
        var nextWeek = today.AddDays(7);
        var since = DateTime.UtcNow.AddDays(-30);
        var records = db.MaintenanceRecords.AsNoTracking();

        var planned = await records.CountAsync(m => m.Status == MaintenanceStatus.Planned, ct);
        var inProgress = await records.CountAsync(m => m.Status == MaintenanceStatus.InProgress, ct);
        var overdue = await records.CountAsync(m => m.Status == MaintenanceStatus.Planned && m.ScheduledDate < today, ct);
        var due = await records.CountAsync(
            m => m.Status == MaintenanceStatus.Planned && m.ScheduledDate >= today && m.ScheduledDate <= nextWeek, ct);
        var completed = await records.CountAsync(
            m => m.Status == MaintenanceStatus.Completed && m.CompletedAt >= since, ct);
        var cost = await records
            .Where(m => m.Status == MaintenanceStatus.Completed && m.CompletedAt >= since)
            .SumAsync(m => m.Cost ?? 0, ct);

        return new MaintenanceSummary(planned, inProgress, overdue, due, completed, cost);
    }

    [HttpGet("api/maintenance/{id:int}")]
    public async Task<ActionResult<MaintenanceDto>> Get(int id, CancellationToken ct)
    {
        var dto = await GetDtoAsync(id, ct);
        return dto is null ? NotFound() : Ok(dto);
    }

    /// <summary>Planlı veya devam eden kaydın alanlarını günceller.</summary>
    [HttpPut("api/maintenance/{id:int}")]
    [Authorize(Policy = Policies.CanWrite)]
    public async Task<ActionResult<MaintenanceDto>> Update(int id, MaintenanceRequest request, CancellationToken ct)
    {
        var record = await db.MaintenanceRecords.FindAsync([id], ct);
        if (record is null) return NotFound();

        if (!MaintenanceWorkflow.IsEditable(record.Status))
            return Conflict(new ProblemDetails
            {
                Title = "Kayıt düzenlenemez",
                Detail = "Tamamlanan veya iptal edilen bakım kaydı değiştirilemez.",
                Status = StatusCodes.Status409Conflict
            });

        record.Title = request.Title.Trim();
        record.Type = request.Type;
        record.Priority = request.Priority;
        record.ScheduledDate = request.ScheduledDate!.Value;
        record.Description = request.Description;
        record.Technician = request.Technician;
        record.Cost = request.Cost;
        record.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);
        return Ok(await GetDtoAsync(id, ct));
    }

    /// <summary>Durum geçişi (başlat, tamamla, iptal et). Varlığın durumu otomatik güncellenir.</summary>
    [HttpPost("api/maintenance/{id:int}/status")]
    [Authorize(Policy = Policies.CanWrite)]
    public async Task<ActionResult<MaintenanceDto>> ChangeStatus(
        int id, MaintenanceStatusRequest request, CancellationToken ct)
    {
        var record = await db.MaintenanceRecords.Include(m => m.Asset).FirstOrDefaultAsync(m => m.Id == id, ct);
        if (record is null) return NotFound();

        if (!MaintenanceWorkflow.CanTransition(record.Status, request.Status))
            return Conflict(new ProblemDetails
            {
                Title = "Geçersiz durum geçişi",
                Detail = $"'{Label(record.Status)}' durumundaki kayıt '{Label(request.Status)}' durumuna alınamaz.",
                Status = StatusCodes.Status409Conflict
            });

        var now = DateTime.UtcNow;
        record.Status = request.Status;
        record.UpdatedAt = now;

        switch (request.Status)
        {
            case MaintenanceStatus.InProgress:
                record.StartedAt = now;
                break;
            case MaintenanceStatus.Completed:
                record.CompletedAt = now;
                record.StartedAt ??= now;
                if (request.Cost is not null) record.Cost = request.Cost;
                break;
        }

        // Önce bakım durumunu kaydet, sonra varlığın durumunu bakımlara göre eşitle.
        await db.SaveChangesAsync(ct);
        await MaintenanceWorkflow.SyncAssetStatusAsync(db, record.Asset, ct);
        record.Asset.UpdatedAt = now;
        await db.SaveChangesAsync(ct);

        return Ok(await GetDtoAsync(id, ct));
    }

    [HttpDelete("api/maintenance/{id:int}")]
    [Authorize(Policy = Policies.AdminOnly)]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var record = await db.MaintenanceRecords.Include(m => m.Asset).FirstOrDefaultAsync(m => m.Id == id, ct);
        if (record is null) return NotFound();

        db.MaintenanceRecords.Remove(record);
        await db.SaveChangesAsync(ct);

        await MaintenanceWorkflow.SyncAssetStatusAsync(db, record.Asset, ct);
        await db.SaveChangesAsync(ct);

        return NoContent();
    }

    // ------------------------------------------------------------------ Yardımcılar

    private async Task<MaintenanceDto?> GetDtoAsync(int id, CancellationToken ct) =>
        await Dtos(db.MaintenanceRecords.AsNoTracking().Where(m => m.Id == id), Clock.Today)
            .FirstOrDefaultAsync(ct);

    private static IQueryable<MaintenanceDto> Dtos(IQueryable<MaintenanceRecord> query, DateOnly today) =>
        query.Select(m => new MaintenanceDto(
            m.Id, m.AssetId, m.Asset.Name, m.Asset.Category, m.Title, m.Type, m.Priority, m.Status,
            m.ScheduledDate, m.StartedAt, m.CompletedAt, m.Description, m.Technician, m.Cost,
            m.Status == MaintenanceStatus.Planned && m.ScheduledDate < today, m.CreatedAt));

    private static string Label(MaintenanceStatus status) => status switch
    {
        MaintenanceStatus.Planned => "Planlandı",
        MaintenanceStatus.InProgress => "Devam ediyor",
        MaintenanceStatus.Completed => "Tamamlandı",
        _ => "İptal edildi"
    };
}
