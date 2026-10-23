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

    // Veritabanında PostGIS geometry(Point, 4326) olarak saklanır.
    // JSON'a doğrudan yazılmaz; API eskisi gibi latitude/longitude döndürür.
    [JsonIgnore]
    public Point Location { get; set; } = null!;

    // Veritabanında sütun değil, Location'dan türetilen salt okunur değerler.
    // PostGIS/GeoJSON sırası (X = boylam, Y = enlem).
    public double Latitude => Location.Y;

    public double Longitude => Location.X;

    public string? Description { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
