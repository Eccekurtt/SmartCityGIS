using System.Text.Json.Serialization;
using NetTopologySuite.Geometries;

namespace SmartCityGis.Api.Models;

public class Asset
{
    public int Id { get; set; }

    public required string Name { get; set; }

    public AssetCategory Category { get; set; }

    public AssetStatus Status { get; set; } = AssetStatus.Active;

    public required string Neighborhood { get; set; }

    // PostGIS geometry(Geometry, 4326): nokta, çizgi veya alan. API'de GeoJSON olarak görünür.
    public Geometry Geometry { get; set; } = null!;

    public string? Description { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }

    // ---- Aşağıdakiler PostgreSQL'in ürettiği (generated, stored) sütunlardır. ----
    // Geometry değişince veritabanı bunları kendisi yeniden hesaplar; uygulama yazmaz.

    // Geometrinin etiket/merkez noktası (ST_PointOnSurface, alan içinde kalması garanti).
    public double Latitude { get; private set; }

    public double Longitude { get; private set; }

    // Point, LineString, Polygon, MultiPolygon...
    public string GeometryType { get; private set; } = "";

    // Yalnızca çizgilerde dolu: jeodezik uzunluk (metre).
    public double? LengthMeters { get; private set; }

    // Yalnızca alanlarda dolu: jeodezik alan (m²).
    public double? AreaSquareMeters { get; private set; }

    // Türkçe karakterleri sadeleştirilmiş küçük harfli arama metni (ad + mahalle).
    [JsonIgnore]
    public string SearchText { get; private set; } = "";
}
