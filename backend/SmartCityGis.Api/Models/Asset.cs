namespace SmartCityGis.Api.Models;

public class Asset
{
    public int Id { get; set; }

    public required string Name { get; set; }

    public AssetCategory Category { get; set; }

    public AssetStatus Status { get; set; } = AssetStatus.Active;

    public required string Neighborhood { get; set; }

    public double Latitude { get; set; }

    public double Longitude { get; set; }

    public string? Description { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}