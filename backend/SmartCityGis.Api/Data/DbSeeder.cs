using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Features;
using NetTopologySuite.IO.Converters;
using SmartCityGis.Api.Models;
using SmartCityGis.Api.Services;

namespace SmartCityGis.Api.Data;

// Geliştirme ortamında tablolar boşsa örnek veri yükler.
// - Mahalle sınırları: SeedData/neighborhoods.geojson (OpenStreetMap, ODbL; Ankara'nın 9 merkez ilçesi)
// - Varlıklar: elle hazırlanmış yaklaşık koordinatlı örnekler. Gerçek veri için OSM içe aktarmayı kullanın.
public static class DbSeeder
{
    public static async Task SeedAsync(AppDbContext db, NeighborhoodLocator locator, string contentRoot)
    {
        await SeedNeighborhoodsAsync(db, Path.Combine(contentRoot, "SeedData", "neighborhoods.geojson"));
        await SeedAssetsAsync(db, locator);
    }

    private static async Task SeedNeighborhoodsAsync(AppDbContext db, string path)
    {
        if (await db.Neighborhoods.AnyAsync() || !File.Exists(path))
        {
            return;
        }

        var options = new JsonSerializerOptions();
        options.Converters.Add(new GeoJsonConverterFactory());

        await using var stream = File.OpenRead(path);
        var collection = await JsonSerializer.DeserializeAsync<FeatureCollection>(stream, options);

        foreach (var feature in collection ?? [])
        {
            var boundary = feature.Geometry;
            boundary.SRID = Geo.Wgs84;

            db.Neighborhoods.Add(new Neighborhood
            {
                Name = (string)feature.Attributes["name"],
                District = (string)feature.Attributes["district"],
                ExternalId = feature.Attributes["externalId"] as string,
                Source = "osm",
                Boundary = boundary
            });
        }

        await db.SaveChangesAsync();
    }

    private static async Task SeedAssetsAsync(AppDbContext db, NeighborhoodLocator locator)
    {
        if (await db.Assets.AnyAsync())
        {
            return;
        }

        var assets = new List<Asset>();
        assets.AddRange(new[]
        {
            // ---- Parklar (alan) ----
            new Asset
            {
                Name = "Gençlik Parkı", Category = AssetCategory.Park, Neighborhood = "Ulus",
                Description = "Şehir merkezindeki büyük park",
                Geometry = Geo.Polygon((32.8450, 39.9360), (32.8520, 39.9345), (32.8537, 39.9385), (32.8482, 39.9402))
            },
            new Asset
            {
                Name = "Kuğulu Park", Category = AssetCategory.Park, Neighborhood = "Çankaya",
                Description = "Göletiyle bilinen şehir parkı",
                Geometry = Geo.Polygon((32.8596, 39.9011), (32.8614, 39.9011), (32.8614, 39.9023), (32.8596, 39.9023))
            },
            new Asset
            {
                Name = "Seğmenler Parkı", Category = AssetCategory.Park, Neighborhood = "Çankaya",
                Geometry = Geo.Polygon((32.8608, 39.9034), (32.8652, 39.9034), (32.8652, 39.9062), (32.8608, 39.9062))
            },
            new Asset
            {
                Name = "Güvenpark", Category = AssetCategory.Park, Neighborhood = "Kızılay",
                Geometry = Geo.Polygon((32.8528, 39.9206), (32.8545, 39.9206), (32.8545, 39.9217), (32.8528, 39.9217))
            },

            // ---- Yollar (çizgi) ----
            new Asset
            {
                Name = "Atatürk Bulvarı", Category = AssetCategory.Road, Neighborhood = "Kızılay",
                Description = "Ulus - Çankaya ana aksı",
                Geometry = Geo.Line((32.8540, 39.9440), (32.8537, 39.9330), (32.8532, 39.9250), (32.8538, 39.9195),
                    (32.8560, 39.9100), (32.8590, 39.9020), (32.8625, 39.8960))
            },
            new Asset
            {
                Name = "Eskişehir Yolu Kesimi", Category = AssetCategory.Road, Neighborhood = "Söğütözü",
                Status = AssetStatus.UnderMaintenance,
                Geometry = Geo.Line((32.7800, 39.9070), (32.7950, 39.9085), (32.8068, 39.9086), (32.8200, 39.9100))
            },
            new Asset
            {
                Name = "Tunalı Hilmi Caddesi", Category = AssetCategory.Road, Neighborhood = "Kavaklıdere",
                Geometry = Geo.Line((32.8545, 39.9100), (32.8575, 39.9095), (32.8605, 39.9092), (32.8640, 39.9086))
            },

            // ---- Binalar (alan) ----
            new Asset
            {
                Name = "Belediye Hizmet Binası", Category = AssetCategory.Building, Neighborhood = "Ulus",
                Geometry = Geo.Polygon((32.8582, 39.9428), (32.8593, 39.9428), (32.8593, 39.9436), (32.8582, 39.9436))
            },
            new Asset
            {
                Name = "Tandoğan Spor Salonu", Category = AssetCategory.Building, Neighborhood = "Tandoğan",
                Status = AssetStatus.Inactive,
                Geometry = Geo.Polygon((32.8362, 39.9246), (32.8376, 39.9246), (32.8376, 39.9254), (32.8362, 39.9254))
            },
            new Asset
            {
                Name = "Kızılay Hizmet Birimi", Category = AssetCategory.Building, Neighborhood = "Kızılay",
                Geometry = Geo.Polygon((32.8551, 39.9188), (32.8560, 39.9188), (32.8560, 39.9194), (32.8551, 39.9194))
            },

            // ---- Sokak lambaları (nokta) ----
            new Asset
            {
                Name = "Kızılay Meydanı Lambası", Category = AssetCategory.StreetLight, Neighborhood = "Kızılay",
                Status = AssetStatus.UnderMaintenance, Geometry = Geo.Point(39.9208, 32.8541)
            },
            new Asset
            {
                Name = "Tunalı Hilmi Lambası", Category = AssetCategory.StreetLight, Neighborhood = "Kavaklıdere",
                Geometry = Geo.Point(39.9094, 32.8600)
            },
            new Asset
            {
                Name = "Atatürk Bulvarı Lambası 1", Category = AssetCategory.StreetLight, Neighborhood = "Kızılay",
                Geometry = Geo.Point(39.9185, 32.8530)
            },
            new Asset
            {
                Name = "Atatürk Bulvarı Lambası 2", Category = AssetCategory.StreetLight, Neighborhood = "Kızılay",
                Geometry = Geo.Point(39.9260, 32.8534)
            },
            new Asset
            {
                Name = "Atatürk Bulvarı Lambası 3", Category = AssetCategory.StreetLight, Neighborhood = "Çankaya",
                Geometry = Geo.Point(39.9060, 32.8575)
            },

            // ---- Altyapı (alan, nokta, çizgi) ----
            new Asset
            {
                Name = "Çankaya Su Deposu", Category = AssetCategory.Infrastructure, Neighborhood = "Çankaya",
                Geometry = Geo.Polygon((32.8612, 39.8957), (32.8628, 39.8957), (32.8628, 39.8968), (32.8612, 39.8968))
            },
            new Asset
            {
                Name = "Yenimahalle Trafo Merkezi", Category = AssetCategory.Infrastructure, Neighborhood = "Yenimahalle",
                Geometry = Geo.Point(39.9690, 32.8100)
            },
            new Asset
            {
                Name = "Etimesgut Pompa İstasyonu", Category = AssetCategory.Infrastructure, Neighborhood = "Etimesgut",
                Status = AssetStatus.Inactive, Geometry = Geo.Point(39.9540, 32.6860)
            },
            new Asset
            {
                Name = "Doğalgaz Ana Hattı", Category = AssetCategory.Infrastructure, Neighborhood = "Ulus",
                Geometry = Geo.Line((32.8000, 39.9500), (32.8300, 39.9450), (32.8540, 39.9380))
            },
            new Asset
            {
                Name = "Kanalizasyon Hattı", Category = AssetCategory.Infrastructure, Neighborhood = "Çankaya",
                Status = AssetStatus.UnderMaintenance,
                Geometry = Geo.Line((32.8570, 39.9000), (32.8650, 39.8990), (32.8730, 39.8975))
            }
        });

        // Elle yazılmış mahalle adları yerine konumdan (mahalle sınırlarıyla) gerçek mahalleyi bul.
        // Sınır verisi yoksa yazılan ad olduğu gibi kalır.
        if (await db.Neighborhoods.AnyAsync())
        {
            foreach (var asset in assets)
            {
                asset.Neighborhood = await locator.FindNameAsync(asset.Geometry);
            }
        }

        db.Assets.AddRange(assets);
        await db.SaveChangesAsync();
    }
}
