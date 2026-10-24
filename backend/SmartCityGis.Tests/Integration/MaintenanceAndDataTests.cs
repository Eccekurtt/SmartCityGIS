using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;

namespace SmartCityGis.Tests.Integration;

[Collection(ApiCollection.Name)]
public class MaintenanceAndDataTests(ApiFactory factory)
{
    private async Task<int> CreateAssetAsync(HttpClient client)
    {
        var response = await client.PostAsJsonAsync("/api/assets", TestData.Point(TestData.Unique("Bakim")));
        return (await response.JsonAsync()).GetProperty("id").GetInt32();
    }

    private static object Maintenance(string title = "Ampul değişimi", string date = "2030-01-15") =>
        new { title, type = "Replacement", priority = "High", scheduledDate = date };

    private static async Task<string> AssetStatus(HttpClient client, int assetId) =>
        (await (await client.GetAsync($"/api/assets/{assetId}")).JsonAsync()).GetProperty("status").GetString()!;

    // ------------------------------------------------------------------ Bakım iş akışı

    [Fact]
    public async Task Maintenance_lifecycle_keeps_the_asset_status_in_sync()
    {
        var op = await factory.ClientFor("operator");
        var assetId = await CreateAssetAsync(op);

        var planned = await (await op.PostAsJsonAsync($"/api/assets/{assetId}/maintenance", Maintenance())).JsonAsync();
        var id = planned.GetProperty("id").GetInt32();
        Assert.Equal("Planned", planned.GetProperty("status").GetString());
        Assert.Equal("Active", await AssetStatus(op, assetId));

        // Başlatınca varlık "Bakımda" olur.
        var started = await op.PostAsJsonAsync($"/api/maintenance/{id}/status", new { status = "InProgress" });
        Assert.Equal(HttpStatusCode.OK, started.StatusCode);
        Assert.Equal("UnderMaintenance", await AssetStatus(op, assetId));

        // Tamamlayınca (başka devam eden bakım yok) tekrar "Aktif" olur ve maliyet kaydedilir.
        var done = await (await op.PostAsJsonAsync($"/api/maintenance/{id}/status", new { status = "Completed", cost = 1250.5 })).JsonAsync();
        Assert.Equal("Completed", done.GetProperty("status").GetString());
        Assert.Equal(1250.5m, done.GetProperty("cost").GetDecimal());
        Assert.NotEqual(JsonValueKind.Null, done.GetProperty("completedAt").ValueKind);
        Assert.Equal("Active", await AssetStatus(op, assetId));
    }

    [Fact]
    public async Task Asset_stays_under_maintenance_while_another_job_is_still_running()
    {
        var op = await factory.ClientFor("operator");
        var assetId = await CreateAssetAsync(op);
        var first = (await (await op.PostAsJsonAsync($"/api/assets/{assetId}/maintenance", Maintenance("Bir"))).JsonAsync()).GetProperty("id").GetInt32();
        var second = (await (await op.PostAsJsonAsync($"/api/assets/{assetId}/maintenance", Maintenance("İki"))).JsonAsync()).GetProperty("id").GetInt32();

        await op.PostAsJsonAsync($"/api/maintenance/{first}/status", new { status = "InProgress" });
        await op.PostAsJsonAsync($"/api/maintenance/{second}/status", new { status = "InProgress" });
        await op.PostAsJsonAsync($"/api/maintenance/{first}/status", new { status = "Completed" });

        Assert.Equal("UnderMaintenance", await AssetStatus(op, assetId));

        await op.PostAsJsonAsync($"/api/maintenance/{second}/status", new { status = "Cancelled" });
        Assert.Equal("Active", await AssetStatus(op, assetId));
    }

    [Fact]
    public async Task Invalid_transitions_and_edits_of_closed_records_return_conflict()
    {
        var op = await factory.ClientFor("operator");
        var assetId = await CreateAssetAsync(op);
        var id = (await (await op.PostAsJsonAsync($"/api/assets/{assetId}/maintenance", Maintenance())).JsonAsync()).GetProperty("id").GetInt32();

        // Başlamadan tamamlanamaz.
        var skip = await op.PostAsJsonAsync($"/api/maintenance/{id}/status", new { status = "Completed" });
        Assert.Equal(HttpStatusCode.Conflict, skip.StatusCode);
        Assert.Contains("Planlandı", (await skip.JsonAsync()).GetProperty("detail").GetString());

        await op.PostAsJsonAsync($"/api/maintenance/{id}/status", new { status = "Cancelled" });

        // İptal edilen kayıt düzenlenemez ve yeniden açılamaz.
        Assert.Equal(HttpStatusCode.Conflict, (await op.PutAsJsonAsync($"/api/maintenance/{id}", Maintenance("Yeni"))).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict,
            (await op.PostAsJsonAsync($"/api/maintenance/{id}/status", new { status = "InProgress" })).StatusCode);
    }

    [Fact]
    public async Task Maintenance_input_is_validated_and_unknown_assets_return_not_found()
    {
        var op = await factory.ClientFor("operator");
        var assetId = await CreateAssetAsync(op);

        var invalid = await op.PostAsJsonAsync($"/api/assets/{assetId}/maintenance",
            new { title = "", type = "Routine", scheduledDate = "2030-01-01", cost = -5 });
        Assert.Equal(HttpStatusCode.BadRequest, invalid.StatusCode);
        var errors = (await invalid.JsonAsync()).GetProperty("errors");
        Assert.True(errors.TryGetProperty("Title", out _));
        Assert.True(errors.TryGetProperty("Cost", out _));

        Assert.Equal(HttpStatusCode.NotFound,
            (await op.PostAsJsonAsync("/api/assets/9999999/maintenance", Maintenance())).StatusCode);
    }

    [Fact]
    public async Task Planned_jobs_with_a_past_date_are_reported_as_overdue_and_viewers_cannot_change_anything()
    {
        var op = await factory.ClientFor("operator");
        var viewer = await factory.ClientFor("izleyici");
        var assetId = await CreateAssetAsync(op);

        var record = await (await op.PostAsJsonAsync($"/api/assets/{assetId}/maintenance", Maintenance(date: "2020-01-01"))).JsonAsync();
        Assert.True(record.GetProperty("isOverdue").GetBoolean());

        var overdue = await (await viewer.GetAsync($"/api/maintenance?overdueOnly=true&assetId={assetId}")).JsonAsync();
        Assert.Equal(1, overdue.GetProperty("total").GetInt32());

        var id = record.GetProperty("id").GetInt32();
        Assert.Equal(HttpStatusCode.Forbidden, (await viewer.PostAsJsonAsync($"/api/maintenance/{id}/status", new { status = "InProgress" })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await op.DeleteAsync($"/api/maintenance/{id}")).StatusCode);
    }

    [Fact]
    public async Task Deleting_an_asset_removes_its_maintenance_history()
    {
        var admin = await factory.ClientFor("admin");
        var assetId = await CreateAssetAsync(admin);
        var id = (await (await admin.PostAsJsonAsync($"/api/assets/{assetId}/maintenance", Maintenance())).JsonAsync()).GetProperty("id").GetInt32();

        await admin.DeleteAsync($"/api/assets/{assetId}");

        Assert.Equal(HttpStatusCode.NotFound, (await admin.GetAsync($"/api/maintenance/{id}")).StatusCode);
    }

    [Fact]
    public async Task Dashboard_returns_aggregated_numbers()
    {
        var viewer = await factory.ClientFor("izleyici");
        await CreateAssetAsync(await factory.ClientFor("operator"));

        var dashboard = await (await viewer.GetAsync("/api/reports/dashboard")).JsonAsync();

        Assert.True(dashboard.GetProperty("summary").GetProperty("total").GetInt32() > 0);
        Assert.Equal(12, dashboard.GetProperty("maintenanceByMonth").GetArrayLength());   // eksik aylar 0 ile doldurulur
    }

    // ------------------------------------------------------------------ İçe / dışa aktarma

    private static MultipartFormDataContent GeoJsonFile(string json)
    {
        var content = new MultipartFormDataContent();
        var file = new ByteArrayContent(Encoding.UTF8.GetBytes(json));
        file.Headers.ContentType = new MediaTypeHeaderValue("application/geo+json");
        content.Add(file, "file", "test.geojson");
        return content;
    }

    [Fact]
    public async Task GeoJson_import_validates_every_feature_and_dry_run_saves_nothing()
    {
        var admin = await factory.ClientFor("admin");
        var good = TestData.Unique("Ice");
        var json = $$$"""
            {"type":"FeatureCollection","features":[
              {"type":"Feature","properties":{"name":"{{{good}}}","category":"Park"},"geometry":{"type":"Point","coordinates":[36.1,40.1]}},
              {"type":"Feature","properties":{"ad":"{{{good}}} tr","kategori":"Sokak Lambası","durum":"Bakımda"},"geometry":{"type":"Point","coordinates":[36.2,40.1]}},
              {"type":"Feature","properties":{"name":"Kategorisiz"},"geometry":{"type":"Point","coordinates":[36.1,40.1]}},
              {"type":"Feature","properties":{"category":"Park"},"geometry":{"type":"Point","coordinates":[36.1,40.1]}},
              {"type":"Feature","properties":{"name":"Aralik Disi","category":"Road"},"geometry":{"type":"Point","coordinates":[500,95]}}
            ]}
            """;

        var dry = await (await admin.PostAsync("/api/import/geojson?dryRun=true", GeoJsonFile(json))).JsonAsync();
        Assert.Equal(5, dry.GetProperty("total").GetInt32());
        Assert.Equal(2, dry.GetProperty("valid").GetInt32());
        Assert.Equal(3, dry.GetProperty("invalid").GetInt32());
        Assert.Equal(0, dry.GetProperty("created").GetInt32());
        var before = await (await admin.GetAsync($"/api/assets?search={Uri.EscapeDataString(good)}")).JsonAsync();
        Assert.Equal(0, before.GetProperty("total").GetInt32());

        var real = await (await admin.PostAsync("/api/import/geojson", GeoJsonFile(json))).JsonAsync();
        Assert.Equal(2, real.GetProperty("created").GetInt32());
        var after = await (await admin.GetAsync($"/api/assets?search={Uri.EscapeDataString(good)}")).JsonAsync();
        Assert.Equal(2, after.GetProperty("total").GetInt32());
        // Türkçe takma adlar (ad / kategori / durum) kabul edilir.
        var turkish = after.GetProperty("items").EnumerateArray().Single(e => e.GetProperty("name").GetString()!.EndsWith(" tr"));
        Assert.Equal("StreetLight", turkish.GetProperty("category").GetString());
        Assert.Equal("UnderMaintenance", turkish.GetProperty("status").GetString());
    }

    [Fact]
    public async Task GeoJson_import_rejects_files_that_are_not_geojson()
    {
        var admin = await factory.ClientFor("admin");

        var response = await admin.PostAsync("/api/import/geojson", GeoJsonFile("{bozuk"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("Geçersiz GeoJSON dosyası", (await response.JsonAsync()).GetProperty("title").GetString());
    }

    [Fact]
    public async Task Csv_export_is_excel_friendly_and_neutralizes_formula_injection()
    {
        var admin = await factory.ClientFor("admin");
        var name = "=HYPERLINK(\"http://kotu\")" + Guid.NewGuid().ToString("N")[..6];
        await admin.PostAsJsonAsync("/api/assets", TestData.Point(name));

        var response = await admin.GetAsync($"/api/export/assets.csv?search={Uri.EscapeDataString(name[..10] + name[^6..])}");
        var bytes = await response.Content.ReadAsByteArrayAsync();
        var text = Encoding.UTF8.GetString(bytes);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal([0xEF, 0xBB, 0xBF], bytes[..3]);                              // UTF-8 BOM
        Assert.StartsWith("﻿id;ad;kategori", text);
        Assert.Contains("attachment", response.Content.Headers.ContentDisposition!.ToString());
        Assert.DoesNotContain(";=HYPERLINK", text);                                // başına kesme eklenir
    }

    [Fact]
    public async Task GeoJson_export_is_a_downloadable_feature_collection()
    {
        var admin = await factory.ClientFor("admin");
        await admin.PostAsJsonAsync("/api/assets", TestData.Polygon(TestData.Unique("Disa"), 37.0, 41.0));

        var response = await admin.GetAsync("/api/export/assets.geojson?category=Park");
        var body = await response.JsonAsync();

        Assert.Equal("application/geo+json", response.Content.Headers.ContentType!.MediaType);
        Assert.Equal("FeatureCollection", body.GetProperty("type").GetString());
        Assert.True(body.GetProperty("features").GetArrayLength() > 0);
    }

    // ------------------------------------------------------------------ Kullanıcı yönetimi

    [Fact]
    public async Task Admin_cannot_demote_self_and_weak_passwords_are_rejected()
    {
        var admin = await factory.ClientFor("admin");
        var users = await (await admin.GetAsync("/api/users")).JsonAsync();
        var me = users.EnumerateArray().Single(u => u.GetProperty("userName").GetString() == "admin");

        var demote = await admin.PutAsJsonAsync($"/api/users/{me.GetProperty("id").GetInt32()}",
            new { displayName = "Yönetici", role = "Viewer", isActive = true });
        Assert.Equal(HttpStatusCode.BadRequest, demote.StatusCode);

        var weak = await admin.PostAsJsonAsync("/api/users",
            new { userName = "zayif.parola", displayName = "Zayıf", role = "Viewer", password = "abcdefgh" });
        Assert.Equal(HttpStatusCode.BadRequest, weak.StatusCode);

        var duplicate = await admin.PostAsJsonAsync("/api/users",
            new { userName = "operator", displayName = "Kopya", role = "Viewer", password = "Gecerli123" });
        Assert.Equal(HttpStatusCode.BadRequest, duplicate.StatusCode);
    }

    [Fact]
    public async Task New_user_can_log_in_and_a_deactivated_user_cannot()
    {
        var admin = await factory.ClientFor("admin");
        var userName = "test." + Guid.NewGuid().ToString("N")[..8];

        var created = await admin.PostAsJsonAsync("/api/users",
            new { userName, displayName = "Test Kullanıcı", role = "Viewer", password = "Gecerli123" });
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var id = (await created.JsonAsync()).GetProperty("id").GetInt32();

        var anonymous = await factory.ClientFor(null);
        Assert.Equal(HttpStatusCode.OK,
            (await anonymous.PostAsJsonAsync("/api/auth/login", new { userName, password = "Gecerli123" })).StatusCode);

        await admin.PutAsJsonAsync($"/api/users/{id}", new { displayName = "Test Kullanıcı", role = "Viewer", isActive = false });
        Assert.Equal(HttpStatusCode.Unauthorized,
            (await anonymous.PostAsJsonAsync("/api/auth/login", new { userName, password = "Gecerli123" })).StatusCode);
    }
}
