using Microsoft.AspNetCore.Mvc;
using SmartCityGis.Api.Dtos;
using SmartCityGis.Api.Models;

namespace SmartCityGis.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AssetsController : ControllerBase
{
    // Geçici bellek içi veri. Aşama 3'te PostgreSQL ile değişecek.
    private static readonly List<Asset> _assets =
    [
        new Asset
        {
            Id = 1,
            Name = "Gençlik Parkı",
            Category = AssetCategory.Park,
            Neighborhood = "Ulus",
            Latitude = 39.9376,
            Longitude = 32.8497
        },
        new Asset
        {
            Id = 2,
            Name = "Kızılay Meydanı Lambası",
            Category = AssetCategory.StreetLight,
            Neighborhood = "Kızılay",
            Latitude = 39.9208,
            Longitude = 32.8541,
            Status = AssetStatus.UnderMaintenance
        },
        new Asset
        {
            Id = 3,
            Name = "Kuğulu Park",
            Category = AssetCategory.Park,
            Neighborhood = "Çankaya",
            Latitude = 39.9017,
            Longitude = 32.8606,
            Description = "Göletiyle bilinen şehir parkı"
        }
    ];

    private static int _nextId = 4;

    [HttpGet]
    public ActionResult<IEnumerable<Asset>> GetAll()
    {
        return Ok(_assets);
    }

    [HttpGet("{id:int}")]
    public ActionResult<Asset> GetById(int id)
    {
        var asset = _assets.FirstOrDefault(a => a.Id == id);

        if (asset is null)
        {
            return NotFound();
        }

        return Ok(asset);
    }

    [HttpPost]
    public ActionResult<Asset> Create(AssetRequest request)
    {
        var asset = new Asset
        {
            Id = _nextId++,
            Name = request.Name,
            Category = request.Category,
            Status = request.Status,
            Neighborhood = request.Neighborhood,
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            Description = request.Description
        };

        _assets.Add(asset);

        return CreatedAtAction(nameof(GetById), new { id = asset.Id }, asset);
    }

    [HttpPut("{id:int}")]
    public IActionResult Update(int id, AssetRequest request)
    {
        var asset = _assets.FirstOrDefault(a => a.Id == id);
        if (asset is null)
        {
            return NotFound();
        }

        asset.Name = request.Name;
        asset.Category = request.Category;
        asset.Status = request.Status;
        asset.Neighborhood = request.Neighborhood;
        asset.Latitude = request.Latitude;
        asset.Longitude = request.Longitude;
        asset.Description = request.Description;

        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public IActionResult Delete(int id)
    {
        var asset = _assets.FirstOrDefault(a => a.Id == id);
        if (asset is null)
        {
            return NotFound();
        }

        _assets.Remove(asset);

        return NoContent();
    }
}