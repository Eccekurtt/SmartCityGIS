using System.Text.Json.Serialization;
using NetTopologySuite.Geometries;

namespace SmartCityGis.Api.Models;

// İdari mahalle sınırı. Varlıkların mahallesi bu poligonlarla mekânsal olarak (ST_Intersects) belirlenir.
public class Neighborhood
{
    public int Id { get; set; }

    // "Kızılay" (OSM'deki "Mahallesi" eki atılmış)
    public required string Name { get; set; }

    // İlçe: "Çankaya"
    public required string District { get; set; }

    // Polygon veya MultiPolygon, WGS84.
    [JsonIgnore]
    public Geometry Boundary { get; set; } = null!;

    // Verinin kaynağı: "osm" | "manual"
    public string Source { get; set; } = "manual";

    // Dış sistemdeki kimliği (örn. "osm:relation/1812321"); tekrar içe aktarmada eşleştirmek için.
    public string? ExternalId { get; set; }

    // PostgreSQL'in ürettiği jeodezik alan (m²).
    public double AreaSquareMeters { get; private set; }
}
