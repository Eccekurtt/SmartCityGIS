using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using SmartCityGis.Api.Common;

namespace SmartCityGis.Tests.Integration;

[Collection(ApiCollection.Name)]
public class AssetApiTests(ApiFactory factory)
{
    // ------------------------------------------------------------------ Kimlik ve yetki

    [Fact]
    public async Task Anonymous_requests_are_rejected_but_health_is_open()
    {
        var anonymous = await factory.ClientFor(null);

        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync("/api/assets")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync("/api/assets/geojson")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await anonymous.GetAsync("/health")).StatusCode);
    }

    [Fact]
    public async Task Login_fails_with_wrong_password_and_never_reveals_which_part_was_wrong()
    {
        var client = await factory.ClientFor(null);

        var wrongPassword = await client.PostAsJsonAsync("/api/auth/login", new { userName = "admin", password = "yanlis-1" });
        var unknownUser = await client.PostAsJsonAsync("/api/auth/login", new { userName = "kimse", password = "yanlis-1" });

        Assert.Equal(HttpStatusCode.Unauthorized, wrongPassword.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, unknownUser.StatusCode);
        // İki durumda da aynı mesaj: kullanıcı adının var olup olmadığı sızmaz.
        Assert.Equal(
            (await wrongPassword.JsonAsync()).GetProperty("detail").GetString(),
            (await unknownUser.JsonAsync()).GetProperty("detail").GetString());
    }

    [Fact]
    public async Task Roles_control_what_a_user_may_do()
    {
        var viewer = await factory.ClientFor("izleyici");
        var op = await factory.ClientFor("operator");
        var admin = await factory.ClientFor("admin");
        var payload = TestData.Point(TestData.Unique("Yetki"));

        // Yazma: izleyici yapamaz, operatör ve yönetici yapar.
        Assert.Equal(HttpStatusCode.Forbidden, (await viewer.PostAsJsonAsync("/api/assets", payload)).StatusCode);
        var created = await op.PostAsJsonAsync("/api/assets", payload);
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var id = (await created.JsonAsync()).GetProperty("id").GetInt32();

        // Okuma: herkes.
        Assert.Equal(HttpStatusCode.OK, (await viewer.GetAsync($"/api/assets/{id}")).StatusCode);

        // Silme: yalnızca yönetici.
        Assert.Equal(HttpStatusCode.Forbidden, (await viewer.DeleteAsync($"/api/assets/{id}")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await op.DeleteAsync($"/api/assets/{id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await admin.DeleteAsync($"/api/assets/{id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await admin.GetAsync($"/api/assets/{id}")).StatusCode);
    }

    [Fact]
    public async Task Only_admins_can_import_manage_users_or_read_the_audit_log()
    {
        var op = await factory.ClientFor("operator");

        Assert.Equal(HttpStatusCode.Forbidden, (await op.GetAsync("/api/users")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await op.GetAsync("/api/audit")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden,
            (await op.PostAsJsonAsync("/api/import/osm/neighborhoods", new { district = "Çankaya" })).StatusCode);
    }

    // ------------------------------------------------------------------ Geometri ve PostGIS

    [Fact]
    public async Task Polygon_asset_gets_geodesic_area_and_label_point_computed_by_postgis()
    {
        var admin = await factory.ClientFor("admin");

        var response = await admin.PostAsJsonAsync("/api/assets", TestData.Polygon(TestData.Unique("Alan"), 32.80, 39.90));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var asset = await response.JsonAsync();

        Assert.Equal("Polygon", asset.GetProperty("geometryType").GetString());
        // 0,01° x 0,01° (enlem 39,9°) ≈ 0,95 km².
        var area = asset.GetProperty("areaSquareMeters").GetDouble();
        Assert.InRange(area, 930_000, 970_000);
        Assert.Equal(JsonValueKind.Null, asset.GetProperty("lengthMeters").ValueKind);

        // Etiket noktası alanın içinde.
        Assert.InRange(asset.GetProperty("latitude").GetDouble(), 39.90, 39.91);
        Assert.InRange(asset.GetProperty("longitude").GetDouble(), 32.80, 32.81);
        // Geometri GeoJSON olarak geri döner.
        Assert.Equal("Polygon", asset.GetProperty("geometry").GetProperty("type").GetString());
    }

    [Fact]
    public async Task Line_asset_gets_geodesic_length()
    {
        var admin = await factory.ClientFor("admin");
        var payload = new
        {
            name = TestData.Unique("Yol"),
            category = "Road",
            geometry = new { type = "LineString", coordinates = new[] { new[] { 32.85, 39.92 }, new[] { 32.86, 39.93 } } }
        };

        var asset = await (await admin.PostAsJsonAsync("/api/assets", payload)).JsonAsync();

        // 0,01° boylam + 0,01° enlem ≈ 1,4 km.
        Assert.InRange(asset.GetProperty("lengthMeters").GetDouble(), 1_350, 1_450);
        Assert.Equal(JsonValueKind.Null, asset.GetProperty("areaSquareMeters").ValueKind);
    }

    [Fact]
    public async Task Invalid_geometry_is_rejected_with_turkish_validation_messages()
    {
        var op = await factory.ClientFor("operator");

        var bowTie = new
        {
            name = TestData.Unique("Bozuk"),
            category = "Park",
            geometry = new
            {
                type = "Polygon",
                coordinates = new[] { new[] { new[] { 0.0, 0 }, new[] { 10.0, 10 }, new[] { 10.0, 0 }, new[] { 0.0, 10 }, new[] { 0.0, 0 } } }
            }
        };
        var response = await op.PostAsJsonAsync("/api/assets", bowTie);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.JsonAsync();
        Assert.Equal("Doğrulama hatası", body.GetProperty("title").GetString());
        Assert.Contains("kendini kesiyor", body.GetProperty("errors").GetProperty("Geometry")[0].GetString());

        var outOfRange = await op.PostAsJsonAsync("/api/assets", TestData.Point("", lon: 500, lat: 95));
        Assert.Equal(HttpStatusCode.BadRequest, outOfRange.StatusCode);
        Assert.Contains("Ad zorunludur", (await outOfRange.JsonAsync()).GetProperty("errors").GetProperty("Name")[0].GetString());
    }

    [Fact]
    public async Task Nearby_returns_assets_inside_the_radius_ordered_by_metre_distance()
    {
        var admin = await factory.ClientFor("admin");
        // Referans nokta ve ~110 m (0,001° enlem), ~1,1 km (0,01° enlem) uzaktaki iki nokta; uzun boylam hattı çakışmasın.
        var token = TestData.Unique("Yakin");
        var near = await (await admin.PostAsJsonAsync("/api/assets", TestData.Point(token + " yakin", 33.50, 39.801))).JsonAsync();
        var far = await (await admin.PostAsJsonAsync("/api/assets", TestData.Point(token + " uzak", 33.50, 39.810))).JsonAsync();

        var within300 = await (await admin.GetAsync("/api/assets/nearby?lat=39.800&lon=33.50&radius=300")).JsonAsync();
        var within2000 = await (await admin.GetAsync("/api/assets/nearby?lat=39.800&lon=33.50&radius=2000")).JsonAsync();

        var ids300 = within300.EnumerateArray().Select(e => e.GetProperty("id").GetInt32()).ToList();
        Assert.Contains(near.GetProperty("id").GetInt32(), ids300);
        Assert.DoesNotContain(far.GetProperty("id").GetInt32(), ids300);

        var list = within2000.EnumerateArray().ToList();
        var distances = list.Select(e => e.GetProperty("distanceMeters").GetDouble()).ToList();
        Assert.Equal(distances.OrderBy(d => d), distances);                 // yakından uzağa
        var nearDistance = list.First(e => e.GetProperty("id").GetInt32() == near.GetProperty("id").GetInt32())
            .GetProperty("distanceMeters").GetDouble();
        Assert.InRange(nearDistance, 100, 125);                              // metre cinsinden (derece değil)
    }

    [Theory]
    [InlineData("lat=200&lon=33&radius=100")]
    [InlineData("lat=39&lon=33&radius=0")]
    [InlineData("lat=39&lon=33&radius=999999")]
    public async Task Nearby_validates_its_parameters(string query)
    {
        var client = await factory.ClientFor("izleyici");

        Assert.Equal(HttpStatusCode.BadRequest, (await client.GetAsync($"/api/assets/nearby?{query}")).StatusCode);
    }

    // ------------------------------------------------------------------ Arama, filtre, sayfalama

    [Fact]
    public async Task Search_ignores_turkish_letter_case_and_accents()
    {
        var admin = await factory.ClientFor("admin");
        var token = Guid.NewGuid().ToString("N")[..6];
        await admin.PostAsJsonAsync("/api/assets", TestData.Point($"Çınar Parkı {token}", category: "Park"));

        foreach (var term in new[] { $"CINAR PARKI {token}", $"çınar parkı {token}", $"parki {token}", $"ÇINAR PARKI {token.ToUpperInvariant()}" })
        {
            var result = await (await admin.GetAsync($"/api/assets?search={Uri.EscapeDataString(term)}")).JsonAsync();
            Assert.Equal(1, result.GetProperty("total").GetInt32());
        }
    }

    [Fact]
    public async Task Search_column_matches_the_c_sharp_folding_rule()
    {
        // SearchText PostgreSQL'de üretilir, TextFolding C#'ta; ikisi aynı sonucu vermeli.
        var admin = await factory.ClientFor("admin");
        var name = $"Şişli Öğretmen İşhanı {Guid.NewGuid():N}"[..40];
        var created = await (await admin.PostAsJsonAsync("/api/assets", TestData.Point(name))).JsonAsync();
        var id = created.GetProperty("id").GetInt32();

        var stored = await factory.WithDbAsync(db =>
            Task.FromResult(db.Assets.Where(a => a.Id == id).Select(a => a.SearchText).Single()));

        Assert.StartsWith(TextFolding.Fold(name), stored);
    }

    [Fact]
    public async Task List_supports_paging_sorting_and_multi_value_filters()
    {
        var admin = await factory.ClientFor("admin");
        var token = Guid.NewGuid().ToString("N")[..6];
        foreach (var suffix in new[] { "C", "A", "B" })
            await admin.PostAsJsonAsync("/api/assets", TestData.Point($"Sayfa {token} {suffix}", category: "Park"));
        await admin.PostAsJsonAsync("/api/assets", TestData.Point($"Sayfa {token} D", category: "Road"));

        var page1 = await (await admin.GetAsync($"/api/assets?search=sayfa+{token}&pageSize=2&sort=name")).JsonAsync();
        var page2 = await (await admin.GetAsync($"/api/assets?search=sayfa+{token}&pageSize=2&sort=name&page=2")).JsonAsync();

        Assert.Equal(4, page1.GetProperty("total").GetInt32());
        Assert.Equal(2, page1.GetProperty("totalPages").GetInt32());
        Assert.Equal(["A", "B"], page1.GetProperty("items").EnumerateArray().Select(e => e.GetProperty("name").GetString()![^1..]));
        Assert.Equal(["C", "D"], page2.GetProperty("items").EnumerateArray().Select(e => e.GetProperty("name").GetString()![^1..]));

        var onlyRoad = await (await admin.GetAsync($"/api/assets?search=sayfa+{token}&category=Road")).JsonAsync();
        Assert.Equal(1, onlyRoad.GetProperty("total").GetInt32());

        var both = await (await admin.GetAsync($"/api/assets?search=sayfa+{token}&category=Road&category=Park")).JsonAsync();
        Assert.Equal(4, both.GetProperty("total").GetInt32());

        Assert.Equal(HttpStatusCode.BadRequest, (await admin.GetAsync("/api/assets?pageSize=5000")).StatusCode);
    }

    [Fact]
    public async Task Geojson_endpoint_returns_a_feature_collection_with_properties()
    {
        var admin = await factory.ClientFor("admin");
        var name = TestData.Unique("Geo");
        await admin.PostAsJsonAsync("/api/assets", TestData.Polygon(name, 34.0, 40.0));

        var collection = await (await admin.GetAsync($"/api/assets/geojson?search={Uri.EscapeDataString(name)}")).JsonAsync();

        Assert.Equal("FeatureCollection", collection.GetProperty("type").GetString());
        var feature = collection.GetProperty("features")[0];
        Assert.Equal("Polygon", feature.GetProperty("geometry").GetProperty("type").GetString());
        Assert.Equal("Park", feature.GetProperty("properties").GetProperty("category").GetString());
        Assert.True(feature.GetProperty("properties").GetProperty("areaSquareMeters").GetDouble() > 0);
    }

    // ------------------------------------------------------------------ Mahalle ve denetim

    [Fact]
    public async Task Neighborhood_is_detected_from_location_when_not_provided()
    {
        var admin = await factory.ClientFor("admin");
        var name = "Test Mahallesi " + Guid.NewGuid().ToString("N")[..6];

        await factory.WithDbAsync(async db =>
        {
            db.Neighborhoods.Add(new SmartCityGis.Api.Models.Neighborhood
            {
                Name = name,
                District = "Test İlçesi",
                Boundary = SmartCityGis.Api.Data.Geo.Polygon((35.0, 41.0), (35.1, 41.0), (35.1, 41.1), (35.0, 41.1))
            });
            await db.SaveChangesAsync();
            return 0;
        });

        var inside = await (await admin.PostAsJsonAsync("/api/assets", TestData.Point(TestData.Unique("Ic"), 35.05, 41.05))).JsonAsync();
        var outside = await (await admin.PostAsJsonAsync("/api/assets", TestData.Point(TestData.Unique("Dis"), 10.0, 10.0))).JsonAsync();
        var explicitName = await (await admin.PostAsJsonAsync("/api/assets", new
        {
            name = TestData.Unique("Acik"),
            category = "Park",
            neighborhood = "Elle Yazılan",
            geometry = new { type = "Point", coordinates = new[] { 35.05, 41.05 } }
        })).JsonAsync();

        Assert.Equal(name, inside.GetProperty("neighborhood").GetString());
        Assert.Equal("Belirsiz", outside.GetProperty("neighborhood").GetString());
        Assert.Equal("Elle Yazılan", explicitName.GetProperty("neighborhood").GetString());

        var at = await (await admin.GetAsync("/api/neighborhoods/at?lat=41.05&lon=35.05")).JsonAsync();
        Assert.Equal(name, at.GetProperty("name").GetString());
    }

    [Fact]
    public async Task Changes_are_written_to_the_audit_log_with_the_acting_user()
    {
        var op = await factory.ClientFor("operator");
        var admin = await factory.ClientFor("admin");
        var name = TestData.Unique("Denetim");

        var created = await (await op.PostAsJsonAsync("/api/assets", TestData.Point(name))).JsonAsync();
        var id = created.GetProperty("id").GetInt32();
        await op.PutAsJsonAsync($"/api/assets/{id}", new
        {
            name,
            category = "StreetLight",
            status = "Inactive",
            geometry = new { type = "Point", coordinates = new[] { 32.85, 39.92 } }
        });

        var audit = await (await admin.GetAsync($"/api/audit?entityType=Asset&userName=operator&pageSize=50")).JsonAsync();
        var mine = audit.GetProperty("items").EnumerateArray()
            .Where(e => e.GetProperty("entityId").GetString() == id.ToString()).ToList();

        Assert.Contains(mine, e => e.GetProperty("action").GetString() == "Create");
        var update = Assert.Single(mine, e => e.GetProperty("action").GetString() == "Update");
        Assert.Equal("operator", update.GetProperty("userName").GetString());
        // Eski ve yeni değer kaydedilir.
        var changes = JsonDocument.Parse(update.GetProperty("changes").GetString()!).RootElement;
        Assert.Equal("Active", changes.GetProperty("Status").GetProperty("old").GetString());
        Assert.Equal("Inactive", changes.GetProperty("Status").GetProperty("new").GetString());
    }
}
