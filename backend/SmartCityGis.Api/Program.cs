using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using SmartCityGis.Api.Data;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException(
        "ConnectionStrings:DefaultConnection bulunamadı. 'dotnet user-secrets set' ile tanımlayın.");

builder.Services.AddDbContext<AppDbContext>(options => options.UseNpgsql(connectionString, npgsql => npgsql.UseNetTopologySuite()));

var app = builder.Build();

// Geliştirmede: bekleyen migration'ları uygula ve tablo boşsa örnek veri yükle.
if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
    await DbSeeder.SeedAsync(db);
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.Run();