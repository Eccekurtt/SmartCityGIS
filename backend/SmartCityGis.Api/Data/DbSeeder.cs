using Microsoft.EntityFrameworkCore;
using SmartCityGis.Api.Models;

namespace SmartCityGis.Api.Data;

// Geliştirme ortamında tablo boşsa örnek veri yükler.
// Koordinatlar Ankara için yaklaşık değerlerdir, gerçek envanter değildir.
public static class DbSeeder
{
    public static async Task SeedAsync(AppDbContext db)
    {
        if (await db.Assets.AnyAsync())
        {
            return;
        }

        db.Assets.AddRange(
            new Asset { Name = "Gençlik Parkı", Category = AssetCategory.Park, Neighborhood = "Ulus", Latitude = 39.9376, Longitude = 32.8497, Description = "Şehir merkezindeki büyük park" },
            new Asset { Name = "Kuğulu Park", Category = AssetCategory.Park, Neighborhood = "Çankaya", Latitude = 39.9017, Longitude = 32.8606, Description = "Göletiyle bilinen şehir parkı" },
            new Asset { Name = "Seğmenler Parkı", Category = AssetCategory.Park, Neighborhood = "Çankaya", Latitude = 39.9047, Longitude = 32.8627 },

            new Asset { Name = "Kızılay Meydanı Lambası", Category = AssetCategory.StreetLight, Neighborhood = "Kızılay", Latitude = 39.9208, Longitude = 32.8541, Status = AssetStatus.UnderMaintenance },
            new Asset { Name = "Tunalı Hilmi Lambası", Category = AssetCategory.StreetLight, Neighborhood = "Kavaklıdere", Latitude = 39.9094, Longitude = 32.8600 },
            new Asset { Name = "Atatürk Bulvarı Lambası", Category = AssetCategory.StreetLight, Neighborhood = "Kızılay", Latitude = 39.9185, Longitude = 32.8530 },

            new Asset { Name = "Atatürk Bulvarı Kavşağı", Category = AssetCategory.Road, Neighborhood = "Kızılay", Latitude = 39.9195, Longitude = 32.8535 },
            new Asset { Name = "Eskişehir Yolu Kesimi", Category = AssetCategory.Road, Neighborhood = "Söğütözü", Latitude = 39.9086, Longitude = 32.8068, Status = AssetStatus.UnderMaintenance },

            new Asset { Name = "Belediye Hizmet Binası", Category = AssetCategory.Building, Neighborhood = "Ulus", Latitude = 39.9432, Longitude = 32.8587 },
            new Asset { Name = "Tandoğan Spor Salonu", Category = AssetCategory.Building, Neighborhood = "Tandoğan", Latitude = 39.9250, Longitude = 32.8369, Status = AssetStatus.Inactive },

            new Asset { Name = "Çankaya Su Deposu", Category = AssetCategory.Infrastructure, Neighborhood = "Çankaya", Latitude = 39.8960, Longitude = 32.8620 },
            new Asset { Name = "Yenimahalle Trafo Merkezi", Category = AssetCategory.Infrastructure, Neighborhood = "Yenimahalle", Latitude = 39.9690, Longitude = 32.8100 },
            new Asset { Name = "Etimesgut Pompa İstasyonu", Category = AssetCategory.Infrastructure, Neighborhood = "Etimesgut", Latitude = 39.9540, Longitude = 32.6860, Status = AssetStatus.Inactive }
        );

        await db.SaveChangesAsync();
    }
}
