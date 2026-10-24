using System.ComponentModel.DataAnnotations;
using SmartCityGis.Api.Models;

namespace SmartCityGis.Api.Dtos;

public class MaintenanceRequest
{
    [Required(ErrorMessage = "Başlık zorunludur."), StringLength(120, ErrorMessage = "Başlık en fazla 120 karakter olabilir.")]
    public string Title { get; set; } = "";

    [EnumDataType(typeof(MaintenanceType), ErrorMessage = "Geçersiz bakım türü.")]
    public MaintenanceType Type { get; set; }

    [EnumDataType(typeof(MaintenancePriority), ErrorMessage = "Geçersiz öncelik.")]
    public MaintenancePriority Priority { get; set; } = MaintenancePriority.Normal;

    [Required(ErrorMessage = "Planlanan tarih zorunludur.")]
    public DateOnly? ScheduledDate { get; set; }

    [StringLength(1000, ErrorMessage = "Açıklama en fazla 1000 karakter olabilir.")]
    public string? Description { get; set; }

    [StringLength(100, ErrorMessage = "Teknisyen adı en fazla 100 karakter olabilir.")]
    public string? Technician { get; set; }

    [Range(0, 100_000_000, ErrorMessage = "Maliyet 0 ile 100.000.000 arasında olmalıdır.")]
    public decimal? Cost { get; set; }
}

public class MaintenanceStatusRequest
{
    [EnumDataType(typeof(MaintenanceStatus), ErrorMessage = "Geçersiz durum.")]
    public MaintenanceStatus Status { get; set; }

    // Tamamlarken girilen gerçekleşen maliyet.
    [Range(0, 100_000_000, ErrorMessage = "Maliyet 0 ile 100.000.000 arasında olmalıdır.")]
    public decimal? Cost { get; set; }
}

public class MaintenanceQuery
{
    [System.ComponentModel.DataAnnotations.Range(1, int.MaxValue)]
    public int Page { get; set; } = 1;

    [System.ComponentModel.DataAnnotations.Range(1, 200)]
    public int PageSize { get; set; } = 20;

    [Microsoft.AspNetCore.Mvc.FromQuery(Name = "status")]
    public List<MaintenanceStatus> Statuses { get; set; } = [];

    [Microsoft.AspNetCore.Mvc.FromQuery(Name = "type")]
    public List<MaintenanceType> Types { get; set; } = [];

    public int? AssetId { get; set; }

    // Planlı ama tarihi geçmiş kayıtlar
    public bool OverdueOnly { get; set; }

    // Varlık adı / mahalle araması (Türkçe karakter duyarsız)
    public string? Search { get; set; }
}

public record MaintenanceDto(
    int Id,
    int AssetId,
    string AssetName,
    AssetCategory AssetCategory,
    string Title,
    MaintenanceType Type,
    MaintenancePriority Priority,
    MaintenanceStatus Status,
    DateOnly ScheduledDate,
    DateTime? StartedAt,
    DateTime? CompletedAt,
    string? Description,
    string? Technician,
    decimal? Cost,
    bool IsOverdue,
    DateTime CreatedAt);
