using System.ComponentModel.DataAnnotations;
using SmartCityGis.Api.Models;

namespace SmartCityGis.Api.Dtos;

public class AssetRequest
{
    [Required, StringLength(100)]
    public string Name { get; set; } = "";

    [EnumDataType(typeof(AssetCategory))]
    public AssetCategory Category { get; set; }

    [EnumDataType(typeof(AssetStatus))]
    public AssetStatus Status { get; set; } = AssetStatus.Active;

    [Required, StringLength(100)]
    public string Neighborhood { get; set; } = "";

    [Range(-90, 90)]
    public double Latitude { get; set; }

    [Range(-180, 180)]
    public double Longitude { get; set; }

    [StringLength(500)]
    public string? Description { get; set; }
}
