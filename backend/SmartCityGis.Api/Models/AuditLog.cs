namespace SmartCityGis.Api.Models;

// Kim, ne zaman, neyi değiştirdi? Kurumsal yazılımda izlenebilirlik için değiştirilemez (yalnızca eklenir) kayıt.
public class AuditLog
{
    public long Id { get; set; }

    public DateTime At { get; set; } = DateTime.UtcNow;

    public int? UserId { get; set; }

    public string UserName { get; set; } = "sistem";

    // Create | Update | Delete | Login | LoginFailed
    public required string Action { get; set; }

    // Asset | MaintenanceRecord | Neighborhood | AppUser | Auth
    public required string EntityType { get; set; }

    public string? EntityId { get; set; }

    // İnsan tarafından okunabilir özet: varlığın adı vb.
    public string? Summary { get; set; }

    // Değişen alanlar: { "Status": { "old": "Active", "new": "UnderMaintenance" } } (PostgreSQL jsonb)
    public string? Changes { get; set; }

    public string? IpAddress { get; set; }
}
