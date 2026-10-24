using System.Globalization;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using NetTopologySuite.Features;
using SmartCityGis.Api.Data;
using SmartCityGis.Api.Dtos;

namespace SmartCityGis.Api.Controllers;

// Envanteri başka sistemlerle (QGIS, Excel, ArcGIS, başka kurumlar) paylaşmak için dışa aktarma.
[ApiController]
[Route("api/export")]
public class ExportController(AppDbContext db, IOptions<Microsoft.AspNetCore.Mvc.JsonOptions> jsonOptions) : ControllerBase
{
    private const int MaxRows = 50_000;

    /// <summary>Filtrelenmiş varlıkları GeoJSON dosyası olarak indirir (QGIS/ArcGIS'e doğrudan açılır).</summary>
    [HttpGet("assets.geojson")]
    public async Task<IActionResult> GeoJson([FromQuery] AssetFilter filter, CancellationToken ct)
    {
        var rows = await db.Assets.AsNoTracking()
            .ApplyFilters(filter)
            .OrderBy(a => a.Id)
            .Take(MaxRows)
            .Select(a => new
            {
                a.Id, a.Name, a.Category, a.Status, a.Neighborhood, a.GeometryType, a.Description,
                a.Source, a.ExternalId, a.LengthMeters, a.AreaSquareMeters, a.CreatedAt, a.Geometry
            })
            .ToListAsync(ct);

        var collection = new FeatureCollection();
        foreach (var row in rows)
        {
            collection.Add(new Feature(row.Geometry, new AttributesTable
            {
                { "id", row.Id },
                { "name", row.Name },
                { "category", row.Category.ToString() },
                { "status", row.Status.ToString() },
                { "neighborhood", row.Neighborhood },
                { "description", row.Description },
                { "geometryType", row.GeometryType },
                { "lengthMeters", row.LengthMeters },
                { "areaSquareMeters", row.AreaSquareMeters },
                { "source", row.Source },
                { "externalId", row.ExternalId },
                { "createdAt", row.CreatedAt },
            }));
        }

        var bytes = JsonSerializer.SerializeToUtf8Bytes(collection, jsonOptions.Value.JsonSerializerOptions);
        return File(bytes, "application/geo+json", FileName("geojson"));
    }

    /// <summary>Filtrelenmiş varlıkları CSV olarak indirir (Excel'de Türkçe karakterlerle açılır; ayraç ';').</summary>
    [HttpGet("assets.csv")]
    public async Task<IActionResult> Csv([FromQuery] AssetFilter filter, CancellationToken ct)
    {
        var rows = await db.Assets.AsNoTracking()
            .ApplyFilters(filter)
            .OrderBy(a => a.Id)
            .Take(MaxRows)
            .Select(a => new
            {
                a.Id, a.Name, a.Category, a.Status, a.Neighborhood, a.GeometryType, a.Latitude, a.Longitude,
                a.LengthMeters, a.AreaSquareMeters, a.Source, a.CreatedAt, a.Description, a.Geometry
            })
            .ToListAsync(ct);

        var csv = new StringBuilder();
        csv.AppendLine("id;ad;kategori;durum;mahalle;geometri_turu;enlem;boylam;uzunluk_m;alan_m2;kaynak;olusturulma;aciklama;wkt");

        foreach (var r in rows)
        {
            csv.AppendLine(string.Join(';',
                r.Id,
                Quote(r.Name),
                r.Category,
                r.Status,
                Quote(r.Neighborhood),
                r.GeometryType,
                Num(r.Latitude, "0.000000"),
                Num(r.Longitude, "0.000000"),
                Num(r.LengthMeters, "0.0"),
                Num(r.AreaSquareMeters, "0.0"),
                r.Source,
                r.CreatedAt.ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture),
                Quote(r.Description),
                Quote(r.Geometry.AsText())));
        }

        // UTF-8 BOM: Excel dosyayı doğru kodlamada (Türkçe karakterler bozulmadan) açar.
        var bytes = new UTF8Encoding(encoderShouldEmitUTF8Identifier: true).GetPreamble()
            .Concat(Encoding.UTF8.GetBytes(csv.ToString())).ToArray();
        return File(bytes, "text/csv; charset=utf-8", FileName("csv"));
    }

    private static string FileName(string extension) =>
        $"smartcity-varliklar-{DateTime.UtcNow:yyyyMMdd-HHmm}.{extension}";

    private static string Num(double? value, string format) =>
        value is null ? "" : value.Value.ToString(format, CultureInfo.InvariantCulture);

    // Ayraç, tırnak veya satır sonu içeren alanları çift tırnakla sarar; formül enjeksiyonunu (=, +, -, @) engeller.
    private static string Quote(string? value)
    {
        if (string.IsNullOrEmpty(value)) return "";

        var safe = value[0] is '=' or '+' or '-' or '@' ? "'" + value : value;
        return safe.Contains(';') || safe.Contains('"') || safe.Contains('\n') || safe.Contains('\r')
            ? $"\"{safe.Replace("\"", "\"\"")}\""
            : safe;
    }
}
