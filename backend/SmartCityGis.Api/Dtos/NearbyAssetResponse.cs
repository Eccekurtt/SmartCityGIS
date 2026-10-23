using SmartCityGis.Api.Models;

namespace SmartCityGis.Api.Dtos;

public class NearbyAssetResponse
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public AssetCategory Category { get; set; }
    public AssetStatus Status { get; set; }
    public string Neighborhood { get; set; } = "";
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public double DistanceMeters { get; set; }
}
