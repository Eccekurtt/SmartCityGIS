using SmartCityGis.Api.Models;

namespace SmartCityGis.Api.Dtos;

// Tablo için hafif kayıt: geometrinin kendisi yok (ağır olabilir), yalnızca özet değerleri var.
public record AssetListItem(
    int Id,
    string Name,
    AssetCategory Category,
    AssetStatus Status,
    string Neighborhood,
    string GeometryType,
    double Latitude,
    double Longitude,
    double? LengthMeters,
    double? AreaSquareMeters,
    DateTime CreatedAt);

public record NearbyAssetResponse(
    int Id,
    string Name,
    AssetCategory Category,
    AssetStatus Status,
    string Neighborhood,
    string GeometryType,
    double Latitude,
    double Longitude,
    double DistanceMeters);
