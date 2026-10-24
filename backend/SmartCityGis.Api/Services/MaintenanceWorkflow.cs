using Microsoft.EntityFrameworkCore;
using SmartCityGis.Api.Data;
using SmartCityGis.Api.Models;

namespace SmartCityGis.Api.Services;

// Bakım durum makinesi ve varlık durumuyla senkronizasyon.
//
//   Planlandı ──► Devam ediyor ──► Tamamlandı
//       │               │
//       └───────────────┴──────► İptal edildi
//
// Tamamlandı ve İptal edildi son durumlardır.
public static class MaintenanceWorkflow
{
    public static bool CanTransition(MaintenanceStatus from, MaintenanceStatus to) => (from, to) switch
    {
        (MaintenanceStatus.Planned, MaintenanceStatus.InProgress) => true,
        (MaintenanceStatus.Planned, MaintenanceStatus.Cancelled) => true,
        (MaintenanceStatus.InProgress, MaintenanceStatus.Completed) => true,
        (MaintenanceStatus.InProgress, MaintenanceStatus.Cancelled) => true,
        _ => false
    };

    public static bool IsEditable(MaintenanceStatus status) =>
        status is MaintenanceStatus.Planned or MaintenanceStatus.InProgress;

    // Varlığın durumu bakımlarla tutarlı kalır:
    // devam eden bakım varsa "Bakımda", hiç yoksa ve "Bakımda" idiyse "Aktif"e döner.
    // Elle "Pasif" yapılmış varlığa dokunulmaz (devam eden bakım yoksa).
    public static async Task SyncAssetStatusAsync(AppDbContext db, Asset asset, CancellationToken ct)
    {
        var inProgress = await db.MaintenanceRecords
            .AnyAsync(m => m.AssetId == asset.Id && m.Status == MaintenanceStatus.InProgress, ct);

        if (inProgress)
        {
            asset.Status = AssetStatus.UnderMaintenance;
        }
        else if (asset.Status == AssetStatus.UnderMaintenance)
        {
            asset.Status = AssetStatus.Active;
        }
    }
}
