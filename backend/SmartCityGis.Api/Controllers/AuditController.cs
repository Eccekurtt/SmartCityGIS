using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartCityGis.Api.Common;
using SmartCityGis.Api.Data;
using SmartCityGis.Api.Security;

namespace SmartCityGis.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = Policies.AdminOnly)]
public class AuditController(AppDbContext db) : ControllerBase
{
    public class AuditQuery
    {
        [Range(1, int.MaxValue)]
        public int Page { get; set; } = 1;

        [Range(1, 200)]
        public int PageSize { get; set; } = 25;

        public string? EntityType { get; set; }
        public string? Action { get; set; }
        public string? UserName { get; set; }
        public DateOnly? From { get; set; }
        public DateOnly? To { get; set; }
    }

    public record AuditDto(
        long Id, DateTime At, string UserName, string Action, string EntityType, string? EntityId,
        string? Summary, string? Changes, string? IpAddress);

    /// <summary>Denetim kaydı: en yeni önce, filtrelenebilir ve sayfalı.</summary>
    [HttpGet]
    public async Task<ActionResult<PagedResult<AuditDto>>> List([FromQuery] AuditQuery q, CancellationToken ct)
    {
        var query = db.AuditLogs.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(q.EntityType)) query = query.Where(a => a.EntityType == q.EntityType);
        if (!string.IsNullOrWhiteSpace(q.Action)) query = query.Where(a => a.Action == q.Action);
        if (!string.IsNullOrWhiteSpace(q.UserName))
        {
            var user = q.UserName.Trim().ToLowerInvariant();
            query = query.Where(a => a.UserName == user);
        }
        if (q.From is { } from)
            query = query.Where(a => a.At >= from.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc));
        if (q.To is { } to)
            query = query.Where(a => a.At < to.AddDays(1).ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc));

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderByDescending(a => a.At).ThenByDescending(a => a.Id)
            .Skip((q.Page - 1) * q.PageSize).Take(q.PageSize)
            .Select(a => new AuditDto(
                a.Id, a.At, a.UserName, a.Action, a.EntityType, a.EntityId, a.Summary, a.Changes, a.IpAddress))
            .ToListAsync(ct);

        return new PagedResult<AuditDto>(items, total, q.Page, q.PageSize);
    }
}
