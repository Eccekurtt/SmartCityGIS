using System.Text.Json.Serialization;

namespace SmartCityGis.Api.Models;

public enum MaintenanceType
{
    Routine,      // Periyodik bakım
    Repair,       // Onarım
    Inspection,   // Denetim / kontrol
    Replacement,  // Parça / ekipman değişimi
    Emergency     // Acil müdahale
}

public enum MaintenanceStatus
{
    Planned,      // Planlandı
    InProgress,   // Devam ediyor
    Completed,    // Tamamlandı
    Cancelled     // İptal edildi
}

public enum MaintenancePriority
{
    Low,
    Normal,
    High,
    Critical
}

// Bir varlığa bağlı bakım kaydı. Varlık : Bakım = 1 : N (bire-çok ilişki).
public class MaintenanceRecord
{
    public int Id { get; set; }

    public int AssetId { get; set; }

    [JsonIgnore]
    public Asset Asset { get; set; } = null!;

    public required string Title { get; set; }

    public MaintenanceType Type { get; set; }

    public MaintenancePriority Priority { get; set; } = MaintenancePriority.Normal;

    public MaintenanceStatus Status { get; set; } = MaintenanceStatus.Planned;

    // Planlanan tarih (yalnızca gün; saat dilimi sorunu yaşamamak için DateOnly).
    public DateOnly ScheduledDate { get; set; }

    public DateTime? StartedAt { get; set; }

    public DateTime? CompletedAt { get; set; }

    public string? Description { get; set; }

    public string? Technician { get; set; }

    // Maliyet (TL). Tamamlanınca girilir.
    public decimal? Cost { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }
}
