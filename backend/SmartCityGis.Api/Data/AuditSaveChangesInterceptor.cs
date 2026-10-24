using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.EntityFrameworkCore.Metadata;
using SmartCityGis.Api.Models;
using SmartCityGis.Api.Security;

namespace SmartCityGis.Api.Data;

// Her SaveChanges çağrısında Asset, MaintenanceRecord, Neighborhood ve AppUser değişikliklerini denetim kaydına yazar.
// Kayıt, asıl değişiklikle aynı işlemde (transaction) oluşur; biri başarısız olursa ikisi de geri alınır.
public class AuditSaveChangesInterceptor(IHttpContextAccessor http) : SaveChangesInterceptor
{
    // Bu eşikten fazla kayıt tek seferde değişirse (örn. OSM içe aktarma) tek bir toplu kayıt yazılır.
    private const int BulkThreshold = 25;

    private static readonly HashSet<string> Ignored = ["PasswordHash", "SearchText"];

    private readonly List<(AuditLog Log, EntityEntry Entry)> _pendingCreates = [];

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData, InterceptionResult<int> result, CancellationToken cancellationToken = default)
    {
        if (eventData.Context is { } context) Capture(context);
        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    public override InterceptionResult<int> SavingChanges(DbContextEventData eventData, InterceptionResult<int> result)
    {
        if (eventData.Context is { } context) Capture(context);
        return base.SavingChanges(eventData, result);
    }

    public override async ValueTask<int> SavedChangesAsync(
        SaveChangesCompletedEventData eventData, int result, CancellationToken cancellationToken = default)
    {
        // Yeni eklenen kayıtların kimliği ancak kayıttan sonra bilinir; denetim satırına şimdi yazılır.
        if (_pendingCreates.Count > 0 && eventData.Context is { } context)
        {
            foreach (var (log, entry) in _pendingCreates)
                log.EntityId = entry.Property("Id").CurrentValue?.ToString();

            _pendingCreates.Clear();
            await context.SaveChangesAsync(cancellationToken);
        }

        return await base.SavedChangesAsync(eventData, result, cancellationToken);
    }

    private void Capture(DbContext context)
    {
        context.ChangeTracker.DetectChanges();

        var entries = context.ChangeTracker.Entries()
            .Where(e => e.Entity is Asset or MaintenanceRecord or Neighborhood or AppUser)
            .Where(e => e.State is EntityState.Added or EntityState.Modified or EntityState.Deleted)
            // Girişte yalnızca LastLoginAt değişir; bu, "Login" kaydıyla zaten belgelendiği için ayrıca yazılmaz.
            .Where(e => !(e.Entity is AppUser && e.State == EntityState.Modified &&
                          e.Properties.Where(p => p.IsModified).All(p => p.Metadata.Name == "LastLoginAt")))
            .ToList();
        if (entries.Count == 0) return;

        var httpContext = http.HttpContext;
        var userId = httpContext?.User.Id();
        var userName = httpContext?.User.Name() ?? "sistem";
        var ip = httpContext?.Connection.RemoteIpAddress?.ToString();

        foreach (var group in entries.GroupBy(e => (Type: e.Entity.GetType().Name, e.State)))
        {
            var items = group.ToList();

            if (items.Count > BulkThreshold)
            {
                context.Set<AuditLog>().Add(new AuditLog
                {
                    Action = ActionOf(group.Key.State),
                    EntityType = group.Key.Type,
                    UserId = userId,
                    UserName = userName,
                    Summary = $"{items.Count} kayıt (toplu işlem)",
                    IpAddress = ip
                });
                continue;
            }

            foreach (var entry in items)
            {
                var log = new AuditLog
                {
                    Action = ActionOf(entry.State),
                    EntityType = group.Key.Type,
                    UserId = userId,
                    UserName = userName,
                    Summary = Truncate(SummaryOf(entry.Entity), 200),
                    Changes = ChangesOf(entry),
                    IpAddress = ip
                };

                if (entry.State == EntityState.Added) _pendingCreates.Add((log, entry));
                else log.EntityId = entry.Property("Id").OriginalValue?.ToString();

                context.Set<AuditLog>().Add(log);
            }
        }
    }

    private static string ActionOf(EntityState state) => state switch
    {
        EntityState.Added => "Create",
        EntityState.Deleted => "Delete",
        _ => "Update"
    };

    private static string? SummaryOf(object entity) => entity switch
    {
        Asset a => a.Name,
        MaintenanceRecord m => m.Title,
        Neighborhood n => $"{n.Name} ({n.District})",
        AppUser u => u.UserName,
        _ => null
    };

    // Değişen alanların eski ve yeni değerleri. Geometri büyük olduğu için yalnızca "değişti" olarak işaretlenir.
    private static string? ChangesOf(EntityEntry entry)
    {
        if (entry.State == EntityState.Deleted) return null;

        var changes = new Dictionary<string, object?>();

        foreach (var property in entry.Properties)
        {
            var meta = property.Metadata;
            if (Ignored.Contains(meta.Name) || meta.ValueGenerated != ValueGenerated.Never) continue;
            if (entry.State == EntityState.Modified && !property.IsModified) continue;

            if (meta.ClrType.Name is "Geometry" or "Point" or "Polygon" or "LineString" or "MultiPolygon" or "MultiLineString")
            {
                changes[meta.Name] = new { changed = true };
                continue;
            }

            if (entry.State == EntityState.Added)
                changes[meta.Name] = new { @new = Format(property.CurrentValue) };
            else if (!Equals(property.OriginalValue, property.CurrentValue))
                changes[meta.Name] = new { old = Format(property.OriginalValue), @new = Format(property.CurrentValue) };
        }

        return changes.Count == 0 ? null : JsonSerializer.Serialize(changes);
    }

    private static object? Format(object? value) => value switch
    {
        null => null,
        Enum e => e.ToString(),
        DateTime or DateOnly or decimal or int or long or double or bool => value,
        string s => Truncate(s, 300),
        _ => Truncate(value.ToString(), 300)
    };

    private static string? Truncate(string? value, int max) =>
        value is null || value.Length <= max ? value : value[..max] + "…";
}
