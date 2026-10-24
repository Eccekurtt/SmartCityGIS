using System.ComponentModel.DataAnnotations;
using NetTopologySuite.Geometries;
using SmartCityGis.Api.Common;
using SmartCityGis.Api.Models;

namespace SmartCityGis.Api.Dtos;

public class AssetRequest : IValidatableObject
{
    [Required(ErrorMessage = "Ad zorunludur."), StringLength(100, ErrorMessage = "Ad en fazla 100 karakter olabilir.")]
    public string Name { get; set; } = "";

    [EnumDataType(typeof(AssetCategory), ErrorMessage = "Geçersiz kategori.")]
    public AssetCategory Category { get; set; }

    [EnumDataType(typeof(AssetStatus), ErrorMessage = "Geçersiz durum.")]
    public AssetStatus Status { get; set; } = AssetStatus.Active;

    // Boş bırakılırsa konumdan (mahalle sınırlarıyla mekânsal sorgu) otomatik belirlenir.
    [StringLength(100, ErrorMessage = "Mahalle en fazla 100 karakter olabilir.")]
    public string? Neighborhood { get; set; }

    // GeoJSON geometri nesnesi: { "type": "Polygon", "coordinates": [...] }
    public Geometry? Geometry { get; set; }

    [StringLength(500, ErrorMessage = "Açıklama en fazla 500 karakter olabilir.")]
    public string? Description { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        var error = GeometryValidator.Validate(Geometry);
        if (error is not null)
        {
            yield return new ValidationResult(error, [nameof(Geometry)]);
        }
    }
}
