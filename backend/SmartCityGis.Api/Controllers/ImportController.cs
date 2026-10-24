using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using SmartCityGis.Api.Services;

namespace SmartCityGis.Api.Controllers;

[ApiController]
[Route("api/import")]
public class ImportController(OsmImporter osm) : ControllerBase
{
    public class OsmNeighborhoodsRequest
    {
        [Required(ErrorMessage = "İlçe adı zorunludur."), StringLength(60, MinimumLength = 2)]
        public string District { get; set; } = "";
    }

    public class OsmAssetsRequest : OsmNeighborhoodsRequest
    {
        [Required(ErrorMessage = "En az bir veri türü seçin."), MinLength(1, ErrorMessage = "En az bir veri türü seçin.")]
        public List<OsmKind> Kinds { get; set; } = [];

        [Range(1, 1000, ErrorMessage = "Tür başına en fazla 1000 kayıt alınabilir.")]
        public int MaxPerKind { get; set; } = 100;
    }

    /// <summary>OpenStreetMap'ten bir ilçenin mahalle sınırlarını içe aktarır (Overpass API).</summary>
    [HttpPost("osm/neighborhoods")]
    public async Task<ActionResult<ImportResult>> Neighborhoods(OsmNeighborhoodsRequest request, CancellationToken ct)
    {
        try
        {
            return await osm.ImportNeighborhoodsAsync(request.District.Trim(), ct);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new ProblemDetails { Title = "Geçersiz istek", Detail = ex.Message, Status = 400 });
        }
        catch (HttpRequestException ex)
        {
            return Problem(title: "OpenStreetMap sunucusuna ulaşılamadı", detail: ex.Message, statusCode: 502);
        }
    }

    /// <summary>OpenStreetMap'ten parkları, yolları, kamu binalarını vb. varlık olarak içe aktarır.</summary>
    [HttpPost("osm/assets")]
    public async Task<ActionResult<ImportResult>> Assets(OsmAssetsRequest request, CancellationToken ct)
    {
        try
        {
            return await osm.ImportAssetsAsync(request.District.Trim(), request.Kinds, request.MaxPerKind, ct);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new ProblemDetails { Title = "Geçersiz istek", Detail = ex.Message, Status = 400 });
        }
        catch (HttpRequestException ex)
        {
            return Problem(title: "OpenStreetMap sunucusuna ulaşılamadı", detail: ex.Message, statusCode: 502);
        }
    }
}
