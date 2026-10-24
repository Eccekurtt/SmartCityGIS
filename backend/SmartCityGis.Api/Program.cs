using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite.IO.Converters;
using SmartCityGis.Api.Data;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers(options =>
    {
        // Model bağlama hata mesajlarını Türkçeleştir.
        var messages = options.ModelBindingMessageProvider;
        messages.SetValueIsInvalidAccessor(value => $"'{value}' değeri geçersiz.");
        messages.SetAttemptedValueIsInvalidAccessor((value, field) => $"'{value}', {field} alanı için geçerli bir değer değil.");
        messages.SetUnknownValueIsInvalidAccessor(field => $"{field} alanı için girilen değer geçersiz.");
        messages.SetNonPropertyAttemptedValueIsInvalidAccessor(value => $"'{value}' değeri geçerli değil.");
        messages.SetNonPropertyUnknownValueIsInvalidAccessor(() => "Girilen değer geçersiz.");
        messages.SetValueMustBeANumberAccessor(field => $"{field} alanı sayı olmalıdır.");
        messages.SetNonPropertyValueMustBeANumberAccessor(() => "Değer sayı olmalıdır.");
        messages.SetMissingBindRequiredValueAccessor(field => $"{field} alanı zorunludur.");
        messages.SetMissingKeyOrValueAccessor(() => "Bir değer zorunludur.");
        messages.SetMissingRequestBodyRequiredValueAccessor(() => "İstek gövdesi zorunludur.");
        messages.SetValueMustNotBeNullAccessor(field => $"{field} alanı boş olamaz.");
    })
    .ConfigureApiBehaviorOptions(options =>
    {
        // Doğrulama hatalarını tek tip, Türkçe başlıklı ProblemDetails olarak döndür.
        options.InvalidModelStateResponseFactory = context =>
        {
            var problem = new ValidationProblemDetails(context.ModelState)
            {
                Status = StatusCodes.Status400BadRequest,
                Title = "Doğrulama hatası",
                Detail = "İsteğin bir veya daha fazla alanı geçersiz.",
                Instance = context.HttpContext.Request.Path
            };
            return new BadRequestObjectResult(problem) { ContentTypes = { "application/problem+json" } };
        };
    })
    .AddJsonOptions(options =>
    {
        // Enum'lar JSON'da metin olarak ("Park"), geometriler GeoJSON olarak okunur/yazılır.
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
        options.JsonSerializerOptions.Converters.Add(new GeoJsonConverterFactory());
    });

// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

builder.Services.AddProblemDetails();

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException(
        "ConnectionStrings:DefaultConnection bulunamadı. 'dotnet user-secrets set' ile tanımlayın.");

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString, npgsql => npgsql.UseNetTopologySuite()));

var app = builder.Build();

// Geliştirmede: bekleyen migration'ları uygula ve tablo boşsa örnek veri yükle.
if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
    await DbSeeder.SeedAsync(db);
}

// Beklenmeyen hataları (500) ProblemDetails olarak döndür, ayrıntıyı sızdırma.
app.UseExceptionHandler();
app.UseStatusCodePages();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.Run();
