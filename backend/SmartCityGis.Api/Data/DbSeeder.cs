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
            new Asset { Name = "Gençlik Parkı", Category = AssetCategory.Park, Neighborhood = "Ulus", Location = Geo.Point(39.9376, 32.8497), Description = "Şehir merkezindeki büyük park" },
            new Asset { Name = "Kuğulu Park", Category = AssetCategory.Park, Neighborhood = "Çankaya", Location = Geo.Point(39.9017, 32.8606), Description = "Göletiyle bilinen şehir parkı" },
            new Asset { Name = "Seğmenler Parkı", Category = AssetCategory.Park, Neighborhood = "Çankaya", Location = Geo.Point(39.9047, 32.8627) },

            new Asset { Name = "Kızılay Meydanı Lambası", Category = AssetCategory.StreetLight, Neighborhood = "Kızılay", Location = Geo.Point(39.9208, 32.8541), Status = AssetStatus.UnderMaintenance },
            new Asset { Name = "Tunalı Hilmi Lambası", Category = AssetCategory.StreetLight, Neighborhood = "Kavaklıdere", Location = Geo.Point(39.9094, 32.8600) },
            new Asset { Name = "Atatürk Bulvarı Lambası", Category = AssetCategory.StreetLight, Neighborhood = "Kızılay", Location = Geo.Point(39.9185, 32.8530) },

            new Asset { Name = "Atatürk Bulvarı Kavşağı", Category = AssetCategory.Road, Neighborhood = "Kızılay", Location = Geo.Point(39.9195, 32.8535) },
            new Asset { Name = "Eskişehir Yolu Kesimi", Category = AssetCategory.Road, Neighborhood = "Söğütözü", Location = Geo.Point(39.9086, 32.8068), Status = AssetStatus.UnderMaintenance },

            new Asset { Name = "Belediye Hizmet Binası", Category = AssetCategory.Building, Neighborhood = "Ulus", Location = Geo.Point(39.9432, 32.8587) },
            new Asset { Name = "Tandoğan Spor Salonu", Category = AssetCategory.Building, Neighborhood = "Tandoğan", Location = Geo.Point(39.9250, 32.8369), Status = AssetStatus.Inactive },

            new Asset { Name = "Çankaya Su Deposu", Category = AssetCategory.Infrastructure, Neighborhood = "Çankaya", Location = Geo.Point(39.8960, 32.8620) },
            new Asset { Name = "Yenimahalle Trafo Merkezi", Category = AssetCategory.Infrastructure, Neighborhood = "Yenimahalle", Location = Geo.Point(39.9690, 32.8100) },
            new Asset { Name = "Etimesgut Pompa İstasyonu", Category = AssetCategory.Infrastructure, Neighborhood = "Etimesgut", Location = Geo.Point(39.9540, 32.6860), Status = AssetStatus.Inactive }
        );

        await db.SaveChangesAsync();
    }
}
