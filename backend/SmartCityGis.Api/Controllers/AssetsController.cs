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
