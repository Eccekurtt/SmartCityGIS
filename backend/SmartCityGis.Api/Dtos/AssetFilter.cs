using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using SmartCityGis.Api.Models;

namespace SmartCityGis.Api.Dtos;

// Liste, GeoJSON ve dışa aktarma uç noktalarının ortak filtreleri.
public class AssetFilter
{
    public string? Search { get; set; }

    [FromQuery(Name = "category")]
    public List<AssetCategory> Categories { get; set; } = [];

    [FromQuery(Name = "status")]
    public List<AssetStatus> Statuses { get; set; } = [];

    public string? Neighborhood { get; set; }

    // "minBoylam,minEnlem,maxBoylam,maxEnlem" (harita görünümü)
    public string? Bbox { get; set; }
}

public class AssetListQuery : AssetFilter
{
    [Range(1, int.MaxValue, ErrorMessage = "Sayfa 1 veya daha büyük olmalıdır.")]
    public int Page { get; set; } = 1;

    [Range(1, 200, ErrorMessage = "Sayfa boyutu 1 ile 200 arasında olmalıdır.")]
    public int PageSize { get; set; } = 25;

    public string Sort { get; set; } = "name";

    public bool Desc { get; set; }
}
