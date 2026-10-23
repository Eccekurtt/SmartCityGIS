using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartCityGis.Api.Data;
using SmartCityGis.Api.Dtos;
using SmartCityGis.Api.Models;

namespace SmartCityGis.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AssetsController : ControllerBase
{
    private readonly AppDbContext _db;

    // DbContext, Program.cs'te AddDbContext ile kaydedildiği için ASP.NET Core
    // her istekte controller'a otomatik olarak verir (dependency injection).
    public AssetsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Asset>>> GetAll()
    {
        var assets = await _db.Assets.AsNoTracking().OrderBy(a => a.Id).ToListAsync();
        return Ok(assets);
    }

    // GET /api/assets/nearby?lat=39.92&lon=32.85&radius=1000&category=StreetLight
    // Verilen noktanın radius (metre) yakınındaki varlıkları, en yakından uzağa doğru döndürür.
    [HttpGet("nearby")]
    public async Task<ActionResult<IEnumerable<NearbyAssetResponse>>> GetNearby(
        [Range(-90, 90)] double lat,
        [Range(-180, 180)] double lon,
        [Range(1, 50000)] double radius = 1000,
        AssetCategory? category = null)
    {
        var origin = Geo.Point(lat, lon);

        var query = _db.Assets.AsNoTracking()
            .Where(a => EF.Functions.IsWithinDistance(a.Location, origin, radius, true));

        if (category is not null)
        {
            query = query.Where(a => a.Category == category);
        }

        var rows = await query
            .Select(a => new
            {
                Asset = a,
                Distance = EF.Functions.Distance(a.Location, origin, true)
            })
            .OrderBy(x => x.Distance)
            .ToListAsync();

        var result = rows.Select(x => new NearbyAssetResponse
        {
            Id = x.Asset.Id,
            Name = x.Asset.Name,
            Category = x.Asset.Category,
            Status = x.Asset.Status,
            Neighborhood = x.Asset.Neighborhood,
            Latitude = x.Asset.Latitude,
            Longitude = x.Asset.Longitude,
            DistanceMeters = Math.Round(x.Distance, 1)
        });

        return Ok(result);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<Asset>> GetById(int id)
    {
        var asset = await _db.Assets.AsNoTracking().FirstOrDefaultAsync(a => a.Id == id);

        if (asset is null)
        {
            return NotFound();
        }

        return Ok(asset);
    }

    [HttpPost]
    public async Task<ActionResult<Asset>> Create(AssetRequest request)
    {
        var asset = new Asset
        {
            Name = request.Name,
            Category = request.Category,
            Status = request.Status,
            Neighborhood = request.Neighborhood,
            Location = Geo.Point(request.Latitude, request.Longitude),
            Description = request.Description
        };

        _db.Assets.Add(asset);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = asset.Id }, asset);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, AssetRequest request)
    {
        var asset = await _db.Assets.FindAsync(id);
        if (asset is null)
        {
            return NotFound();
        }

        asset.Name = request.Name;
        asset.Category = request.Category;
        asset.Status = request.Status;
        asset.Neighborhood = request.Neighborhood;
        asset.Location = Geo.Point(request.Latitude, request.Longitude);
        asset.Description = request.Description;

        await _db.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var asset = await _db.Assets.FindAsync(id);
        if (asset is null)
        {
            return NotFound();
        }

        _db.Assets.Remove(asset);
        await _db.SaveChangesAsync();

        return NoContent();
    }
}
