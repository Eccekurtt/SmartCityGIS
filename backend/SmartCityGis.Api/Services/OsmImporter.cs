using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;
using NetTopologySuite.Operation.Polygonize;
using SmartCityGis.Api.Common;
using SmartCityGis.Api.Data;
using SmartCityGis.Api.Models;

namespace SmartCityGis.Api.Services;

public enum OsmKind
{
    Parks,
    Roads,
    StreetLights,
    PublicBuildings,
    Infrastructure
}

public class ImportResult
{
    public int Created { get; set; }
    public int Updated { get; set; }
    public int Skipped { get; set; }
    public int Invalid { get; set; }
    public Dictionary<string, int> ByKind { get; set; } = [];
    public List<string> Messages { get; set; } = [];
}

// OpenStreetMap verisini Overpass API'sinden çeker ve uygulamanın modeline dönüştürür.
// Veri © OpenStreetMap katkıda bulunanlar, ODbL lisansı.
public partial class OsmImporter(
    HttpClient http,
    AppDbContext db,
    NeighborhoodLocator locator,
    ILogger<OsmImporter> logger)
{
    private const string Attribution = "Kaynak: OpenStreetMap katkıda bulunanlar (ODbL)";

    // Overpass sorgusuna enjeksiyonu önlemek için ilçe adı yalnızca harf, boşluk ve tire içerebilir.
    [GeneratedRegex(@"^[\p{L} \-']{2,60}$")]
    private static partial Regex SafeName();

    // ------------------------------------------------------------------ Mahalle sınırları

    public async Task<ImportResult> ImportNeighborhoodsAsync(string district, CancellationToken ct)
    {
        EnsureSafe(district);
        var result = new ImportResult();

        var query = $$"""
            [out:json][timeout:180];
            {{AreaPrefix(district)}}
            rel(area.d)["boundary"="administrative"]["admin_level"="8"];
            out geom;
            """;

        var elements = await QueryAsync(query, ct);
        var existing = await db.Neighborhoods.ToDictionaryAsync(n => n.ExternalId ?? "", ct);

        foreach (var element in elements)
        {
            if (!element.TryGetProperty("tags", out var tags) || !tags.TryGetProperty("name", out var nameProp))
                continue;

            var name = StripSuffix(nameProp.GetString() ?? "");
            var externalId = $"osm:relation/{element.GetProperty("id").GetInt64()}";

            var boundary = BuildAreaFromRelation(element);
            if (boundary is null)
            {
                result.Invalid++;
                result.Messages.Add($"'{name}' sınırı oluşturulamadı (kapalı halka yok).");
                continue;
            }

            // Sadeleştirme burada değil, tüm mahalleler kaydedildikten sonra PostGIS'te (ST_CoverageSimplify)
            // yapılır: komşu sınırlar birlikte sadeleşir, aralarında boşluk/çakışma oluşmaz.
            if (!boundary.IsValid) boundary = boundary.Buffer(0);
            boundary.SRID = Geo.Wgs84;

            if (existing.TryGetValue(externalId, out var current))
            {
                current.Name = name;
                current.District = district;
                current.Boundary = boundary;
                result.Updated++;
            }
            else
            {
                db.Neighborhoods.Add(new Neighborhood
                {
                    Name = name,
                    District = district,
                    Boundary = boundary,
                    Source = "osm",
                    ExternalId = externalId
                });
                result.Created++;
            }
        }

        await db.SaveChangesAsync(ct);
        await SimplifyBoundariesAsync(ct);
        return result;
    }

    // Tüm mahalle sınırlarını bir "kapsama" (coverage) olarak ~8 m toleransla sadeleştirir.
    // Tek tek sadeleştirmenin aksine ST_CoverageSimplify ortak kenarları birlikte işler,
    // böylece komşu mahalleler arasında ince boşluk veya çakışma kalmaz.
    private Task<int> SimplifyBoundariesAsync(CancellationToken ct) =>
        db.Database.ExecuteSqlRawAsync(
            """
            WITH simplified AS (
                SELECT "Id", ST_CoverageSimplify("Boundary", 0.00008) OVER () AS geom
                FROM "Neighborhoods"
            )
            UPDATE "Neighborhoods" n
            SET "Boundary" = simplified.geom
            FROM simplified
            WHERE n."Id" = simplified."Id" AND simplified.geom IS NOT NULL AND NOT ST_IsEmpty(simplified.geom)
            """, ct);

    // ------------------------------------------------------------------ Varlıklar

    public async Task<ImportResult> ImportAssetsAsync(
        string district, IEnumerable<OsmKind> kinds, int maxPerKind, CancellationToken ct)
    {
        EnsureSafe(district);
        var result = new ImportResult();

        foreach (var kind in kinds.Distinct())
        {
            ct.ThrowIfCancellationRequested();

            var query = $$"""
                [out:json][timeout:180];
                {{AreaPrefix(district)}}
                (
                {{Selectors(kind)}}
                );
                out geom {{maxPerKind}};
                """;

            List<JsonElement> elements;
            try
            {
                elements = await QueryAsync(query, ct);
            }
            catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException && !ct.IsCancellationRequested)
            {
                logger.LogWarning(ex, "OSM sorgusu başarısız: {Kind}", kind);
                result.Messages.Add($"{kind}: Overpass sunucusuna ulaşılamadı ({ex.Message}).");
                continue;
            }

            var externalIds = elements.Select(ExternalIdOf).ToList();
            var known = (await db.Assets.Where(a => a.ExternalId != null && externalIds.Contains(a.ExternalId))
                .Select(a => a.ExternalId!).ToListAsync(ct)).ToHashSet();

            var created = 0;
            foreach (var element in elements)
            {
                var externalId = ExternalIdOf(element);
                if (known.Contains(externalId))
                {
                    result.Skipped++;
                    continue;
                }

                var geometry = BuildGeometry(element, kind);
                if (geometry is null || GeometryValidator.Validate(geometry) is not null)
                {
                    result.Invalid++;
                    continue;
                }

                var tags = element.TryGetProperty("tags", out var t) ? t : default;
                var asset = new Asset
                {
                    Name = NameOf(tags, kind, element.GetProperty("id").GetInt64()),
                    Category = CategoryOf(kind),
                    Status = AssetStatus.Active,
                    Neighborhood = await locator.FindNameAsync(geometry, ct),
                    Geometry = geometry,
                    Description = DescribeTags(tags),
                    Source = "osm",
                    ExternalId = externalId
                };

                db.Assets.Add(asset);
                created++;
            }

            await db.SaveChangesAsync(ct);
            result.Created += created;
            result.ByKind[kind.ToString()] = created;

            // Overpass sunucusuna nazik davran: sorgular arasında bekle.
            await Task.Delay(1500, ct);
        }

        result.Messages.Add(Attribution);
        return result;
    }

    // ------------------------------------------------------------------ Overpass

    private static void EnsureSafe(string district)
    {
        if (!SafeName().IsMatch(district))
            throw new ArgumentException("İlçe adı yalnızca harf, boşluk ve tire içerebilir.");
    }

    // "Ankara" ili içindeki verilen ilçeyi bulup alan olarak (area.d) tanımlar.
    private static string AreaPrefix(string district) =>
        $"""
         area["name"="Ankara"]["admin_level"="4"]->.p;
         rel(area.p)["boundary"="administrative"]["admin_level"="6"]["name"="{district}"];
         map_to_area->.d;
         """;

    private static string Selectors(OsmKind kind) => kind switch
    {
        OsmKind.Parks => """
            nwr["leisure"="park"]["name"](area.d);
            """,
        OsmKind.Roads => """
            way["highway"~"^(motorway|trunk|primary|secondary)$"]["name"](area.d);
            """,
        OsmKind.StreetLights => """
            node["highway"="street_lamp"](area.d);
            """,
        OsmKind.PublicBuildings => """
            nwr["amenity"~"^(townhall|police|fire_station|hospital|library|community_centre|courthouse)$"]["name"](area.d);
            """,
        OsmKind.Infrastructure => """
            nwr["man_made"~"^(water_tower|water_tank|wastewater_plant|reservoir_covered)$"](area.d);
            nwr["power"="substation"](area.d);
            """,
        _ => throw new ArgumentOutOfRangeException(nameof(kind))
    };

    private async Task<List<JsonElement>> QueryAsync(string query, CancellationToken ct)
    {
        for (var attempt = 1; ; attempt++)
        {
            using var content = new FormUrlEncodedContent([new KeyValuePair<string, string>("data", query)]);
            using var response = await http.PostAsync("api/interpreter", content, ct);

            if (response.IsSuccessStatusCode)
            {
                await using var stream = await response.Content.ReadAsStreamAsync(ct);
                using var document = await JsonDocument.ParseAsync(stream, cancellationToken: ct);
                // JsonElement'ler document'a bağlıdır; Clone ile belge kapandıktan sonra da kullanılabilir yapılır.
                return document.RootElement.GetProperty("elements").EnumerateArray().Select(e => e.Clone()).ToList();
            }

            var transient = (int)response.StatusCode is 429 or 502 or 503 or 504;
            if (!transient || attempt >= 4) response.EnsureSuccessStatusCode();

            var delay = TimeSpan.FromSeconds(5 * attempt);
            logger.LogInformation("Overpass {Status}, {Delay} sn sonra yeniden denenecek.", (int)response.StatusCode, delay.TotalSeconds);
            await Task.Delay(delay, ct);
        }
    }

    // ------------------------------------------------------------------ Dönüştürme

    private static string ExternalIdOf(JsonElement e) =>
        $"osm:{e.GetProperty("type").GetString()}/{e.GetProperty("id").GetInt64()}";

    private static string StripSuffix(string name)
    {
        var trimmed = name.Trim();
        foreach (var suffix in new[] { " Mahallesi", " Mah.", " Mahalle" })
        {
            if (trimmed.EndsWith(suffix, StringComparison.OrdinalIgnoreCase))
                return trimmed[..^suffix.Length].Trim();
        }
        return trimmed;
    }

    private static AssetCategory CategoryOf(OsmKind kind) => kind switch
    {
        OsmKind.Parks => AssetCategory.Park,
        OsmKind.Roads => AssetCategory.Road,
        OsmKind.StreetLights => AssetCategory.StreetLight,
        OsmKind.PublicBuildings => AssetCategory.Building,
        _ => AssetCategory.Infrastructure
    };

    private static string NameOf(JsonElement tags, OsmKind kind, long id)
    {
        if (tags.ValueKind == JsonValueKind.Object && tags.TryGetProperty("name", out var name))
        {
            var text = name.GetString()?.Trim();
            if (!string.IsNullOrEmpty(text)) return text.Length > 100 ? text[..100] : text;
        }

        return kind switch
        {
            OsmKind.StreetLights => $"Sokak Lambası (OSM {id})",
            OsmKind.Infrastructure => $"Altyapı Tesisi (OSM {id})",
            _ => $"OSM {id}"
        };
    }

    private static string DescribeTags(JsonElement tags)
    {
        if (tags.ValueKind != JsonValueKind.Object) return Attribution;

        foreach (var key in new[] { "amenity", "man_made", "power", "highway", "leisure" })
        {
            if (tags.TryGetProperty(key, out var value))
                return $"OpenStreetMap: {key}={value.GetString()}. {Attribution}";
        }
        return Attribution;
    }

    private static Geometry? BuildGeometry(JsonElement element, OsmKind kind)
    {
        switch (element.GetProperty("type").GetString())
        {
            case "node":
                return Geo.Point(element.GetProperty("lat").GetDouble(), element.GetProperty("lon").GetDouble());

            case "way":
            {
                var coordinates = ReadCoordinates(element);
                if (coordinates.Length < 2) return null;

                var closed = coordinates.Length >= 4 && coordinates[0].Equals2D(coordinates[^1]);
                if (kind != OsmKind.Roads && closed)
                    return Geo.Factory.CreatePolygon(coordinates);

                return kind == OsmKind.Roads || !closed ? Geo.Factory.CreateLineString(coordinates) : null;
            }

            case "relation":
                return BuildAreaFromRelation(element);

            default:
                return null;
        }
    }

    // İlişkinin "outer" yollarını halkalara birleştirir (Polygonizer) ve alan geometrisi üretir.
    private static Geometry? BuildAreaFromRelation(JsonElement relation)
    {
        if (!relation.TryGetProperty("members", out var members)) return null;

        var lines = new List<Geometry>();
        foreach (var member in members.EnumerateArray())
        {
            if (member.GetProperty("type").GetString() != "way") continue;
            if (member.TryGetProperty("role", out var role) && role.GetString() == "inner") continue;

            var coordinates = ReadCoordinates(member);
            if (coordinates.Length >= 2) lines.Add(Geo.Factory.CreateLineString(coordinates));
        }

        if (lines.Count == 0) return null;

        var polygonizer = new Polygonizer();
        polygonizer.Add(lines);
        var polygons = polygonizer.GetPolygons().OfType<Polygon>().ToArray();

        return polygons.Length switch
        {
            0 => null,
            1 => polygons[0],
            _ => Geo.Factory.CreateMultiPolygon(polygons)
        };
    }

    private static Coordinate[] ReadCoordinates(JsonElement element)
    {
        if (!element.TryGetProperty("geometry", out var geometry) || geometry.ValueKind != JsonValueKind.Array)
            return [];

        return geometry.EnumerateArray()
            .Where(p => p.ValueKind == JsonValueKind.Object)
            .Select(p => new Coordinate(p.GetProperty("lon").GetDouble(), p.GetProperty("lat").GetDouble()))
            .ToArray();
    }
}
