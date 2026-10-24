using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using SmartCityGis.Api.Data;
using Testcontainers.PostgreSql;

namespace SmartCityGis.Tests.Integration;

// Gerçek bir PostgreSQL + PostGIS (Docker konteyneri) üzerinde, uygulamanın tamamını bellekte çalıştırır.
// Sahte (mock) veritabanı kullanılmaz: PostGIS fonksiyonları, üretilen sütunlar ve indeksler gerçekten sınanır.
public sealed class ApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly PostgreSqlContainer _database = new PostgreSqlBuilder("postgis/postgis:18-3.6")
        .WithDatabase("smartcity_test")
        .WithUsername("postgres")
        .WithPassword("test-password-1")
        .Build();

    public static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    public async Task InitializeAsync()
    {
        await _database.StartAsync();

        // Program.cs yapılandırmayı oluşturulurken (eagerly) okuduğu için ortam değişkenleri kullanılır.
        Environment.SetEnvironmentVariable("ConnectionStrings__DefaultConnection", _database.GetConnectionString());
        Environment.SetEnvironmentVariable("Jwt__Key", "test-ortami-icin-yeterince-uzun-gizli-anahtar-0123456789");
        Environment.SetEnvironmentVariable("Database__MigrateOnStartup", "true");
        Environment.SetEnvironmentVariable("Database__SeedSampleData", "false");
        Environment.SetEnvironmentVariable("Seed__DemoUsers", "true");
        Environment.SetEnvironmentVariable("RateLimit__LoginPerMinute", "10000");
    }

    public new async Task DisposeAsync()
    {
        await base.DisposeAsync();
        await _database.DisposeAsync();
    }

    // Giriş yapmış bir istemci döndürür: "admin", "operator" veya "izleyici".
    public async Task<HttpClient> ClientFor(string? userName)
    {
        var client = CreateClient();
        if (userName is null) return client;

        var password = userName switch
        {
            "admin" => "Admin123!",
            "operator" => "Operator123!",
            _ => "Izleyici123!"
        };

        var response = await client.PostAsJsonAsync("/api/auth/login", new { userName, password });
        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", body.GetProperty("token").GetString());
        return client;
    }

    public async Task<T> WithDbAsync<T>(Func<AppDbContext, Task<T>> action)
    {
        using var scope = Services.CreateScope();
        return await action(scope.ServiceProvider.GetRequiredService<AppDbContext>());
    }
}

[CollectionDefinition(Name)]
public class ApiCollection : ICollectionFixture<ApiFactory>
{
    public const string Name = "api";
}

public static class HttpExtensions
{
    public static async Task<JsonElement> JsonAsync(this HttpResponseMessage response) =>
        await response.Content.ReadFromJsonAsync<JsonElement>();
}

public static class TestData
{
    // Her test kendi (benzersiz adlı) verisini kurar; testler aynı veritabanını paylaşsa da birbirini bozmaz.
    public static string Unique(string prefix) => $"{prefix} {Guid.NewGuid():N}"[..(prefix.Length + 9)];

    public static object Point(string name, double lon = 32.85, double lat = 39.92, string category = "StreetLight") => new
    {
        name,
        category,
        geometry = new { type = "Point", coordinates = new[] { lon, lat } }
    };

    public static object Polygon(string name, double lon, double lat, double size = 0.01) => new
    {
        name,
        category = "Park",
        geometry = new
        {
            type = "Polygon",
            coordinates = new[]
            {
                new[]
                {
                    new[] { lon, lat }, new[] { lon + size, lat }, new[] { lon + size, lat + size },
                    new[] { lon, lat + size }, new[] { lon, lat }
                }
            }
        }
    };
}
