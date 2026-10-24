using System.Text.Json;
using NetTopologySuite.Features;
using NetTopologySuite.IO.Converters;
using SmartCityGis.Api.Common;
using SmartCityGis.Api.Data;
using SmartCityGis.Api.Models;

namespace SmartCityGis.Api.Services;

public record GeoJsonRowResult(int Index, string? Name, bool Ok, string? Message);

public class GeoJsonImportReport
{
    public int Total { get; set; }
    public int Valid { get; set; }
    public int Invalid { get; set; }
    public int Created { get; set; }
    public bool DryRun { get; set; }
    // Yanıtı küçük tutmak için yalnızca ilk hatalar listelenir.
    public List<GeoJsonRowResult> Problems { get; set; } = [];
}

// Dışarıdan gelen GeoJSON dosyasını (başka kurum, QGIS çıktısı...) doğrulayıp varlık olarak içe aktarır.
public class GeoJsonImporter(AppDbContext db, NeighborhoodLocator locator)
{
    public const int MaxFeatures = 5000;
    private const int MaxReportedProblems = 50;

    private static readonly JsonSerializerOptions JsonOptions = CreateOptions();

    private static JsonSerializerOptions CreateOptions()
    {
        var options = new JsonSerializerOptions();
        options.Converters.Add(new GeoJsonConverterFactory());
        return options;
    }

    public async Task<GeoJsonImportReport> ImportAsync(Stream stream, bool dryRun, CancellationToken ct)
    {
        FeatureCollection? collection;
        try
        {
            collection = await JsonSerializer.DeserializeAsync<FeatureCollection>(stream, JsonOptions, ct);
        }
        catch (JsonException ex)
        {
            throw new ArgumentException($"Dosya geçerli bir GeoJSON FeatureCollection değil: {ex.Message}");
        }

        if (collection is null || collection.Count == 0)
            throw new ArgumentException("Dosyada hiç özellik (feature) bulunamadı.");
        if (collection.Count > MaxFeatures)
            throw new ArgumentException($"Tek seferde en fazla {MaxFeatures} özellik içe aktarılabilir (dosyada {collection.Count} var).");

        var report = new GeoJsonImportReport { Total = collection.Count, DryRun = dryRun };
        var assets = new List<Asset>();
        var index = 0;

        foreach (var feature in collection)
        {
            index++;
            var (asset, error) = Convert(feature);

            if (asset is null)
            {
                report.Invalid++;
                if (report.Problems.Count < MaxReportedProblems)
                    report.Problems.Add(new GeoJsonRowResult(index, NameOf(feature), false, error));
                continue;
            }

            report.Valid++;
            assets.Add(asset);
        }

        if (dryRun || assets.Count == 0) return report;

        foreach (var asset in assets)
        {
            // Mahalle verilmediyse konumdan (mekânsal sorguyla) bul.
            if (string.IsNullOrWhiteSpace(asset.Neighborhood))
                asset.Neighborhood = await locator.FindNameAsync(asset.Geometry, ct);
        }

        db.Assets.AddRange(assets);
        await db.SaveChangesAsync(ct);
        report.Created = assets.Count;
        return report;
    }

    private static (Asset? Asset, string? Error) Convert(IFeature feature)
    {
        var attributes = feature.Attributes;
        var name = Text(attributes, "name") ?? Text(attributes, "ad") ?? Text(attributes, "isim");
        if (string.IsNullOrWhiteSpace(name)) return (null, "'name' (ad) özelliği zorunludur.");
        if (name.Length > 100) name = name[..100];

        if (feature.Geometry is null) return (null, "Geometri yok.");
        feature.Geometry.SRID = Geo.Wgs84;

        var geometryError = GeometryValidator.Validate(feature.Geometry);
        if (geometryError is not null) return (null, geometryError);

        if (!TryParseCategory(Text(attributes, "category") ?? Text(attributes, "kategori"), out var category))
            return (null, "'category' şunlardan biri olmalı: Park, Road, Building, StreetLight, Infrastructure " +
                          "(veya Türkçe: Park, Yol, Bina, Sokak Lambası, Altyapı).");

        var status = AssetStatus.Active;
        var statusText = Text(attributes, "status") ?? Text(attributes, "durum");
        if (statusText is not null && !TryParseStatus(statusText, out status))
            return (null, "'status' şunlardan biri olmalı: Active, UnderMaintenance, Inactive (Aktif, Bakımda, Pasif).");

        var description = Text(attributes, "description") ?? Text(attributes, "aciklama");

        return (new Asset
        {
            Name = name.Trim(),
            Category = category,
            Status = status,
            Neighborhood = (Text(attributes, "neighborhood") ?? Text(attributes, "mahalle") ?? "").Trim(),
            Geometry = feature.Geometry,
            Description = description is { Length: > 500 } ? description[..500] : description,
            Source = "geojson",
        }, null);
    }

    private static string? NameOf(IFeature feature) => Text(feature.Attributes, "name") ?? Text(feature.Attributes, "ad");

    private static string? Text(IAttributesTable? attributes, string key) =>
        attributes is not null && attributes.Exists(key) && attributes[key] is { } value
            ? System.Convert.ToString(value, System.Globalization.CultureInfo.InvariantCulture)
            : null;

    private static bool TryParseCategory(string? text, out AssetCategory category)
    {
        category = default;
        if (string.IsNullOrWhiteSpace(text)) return false;

        var key = TextFolding.Fold(text).Replace(" ", "");
        var map = new Dictionary<string, AssetCategory>
        {
            ["park"] = AssetCategory.Park,
            ["road"] = AssetCategory.Road, ["yol"] = AssetCategory.Road,
            ["building"] = AssetCategory.Building, ["bina"] = AssetCategory.Building,
            ["streetlight"] = AssetCategory.StreetLight, ["sokaklambasi"] = AssetCategory.StreetLight,
            ["infrastructure"] = AssetCategory.Infrastructure, ["altyapi"] = AssetCategory.Infrastructure,
        };
        return map.TryGetValue(key, out category);
    }

    private static bool TryParseStatus(string text, out AssetStatus status)
    {
        status = AssetStatus.Active;
        var map = new Dictionary<string, AssetStatus>
        {
            ["active"] = AssetStatus.Active, ["aktif"] = AssetStatus.Active,
            ["undermaintenance"] = AssetStatus.UnderMaintenance, ["bakimda"] = AssetStatus.UnderMaintenance,
            ["inactive"] = AssetStatus.Inactive, ["pasif"] = AssetStatus.Inactive,
        };
        return map.TryGetValue(TextFolding.Fold(text).Replace(" ", ""), out status);
    }
}
