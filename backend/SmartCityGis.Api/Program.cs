using System.Text;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.IdentityModel.Tokens;
using NetTopologySuite.IO.Converters;
using SmartCityGis.Api.Data;
using SmartCityGis.Api.Models;
using SmartCityGis.Api.Security;
using SmartCityGis.Api.Services;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

// ---------------------------------------------------------------- Controller ve JSON

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

builder.Services.AddOpenApi(options =>
{
    options.AddDocumentTransformer((document, _, _) =>
    {
        document.Info.Title = "SmartCity GIS API";
        document.Info.Version = "v1";
        document.Info.Description =
            "Belediye varlık yönetim sistemi: PostGIS tabanlı mekânsal sorgular, GeoJSON, bakım, raporlama. " +
            "Kimlik doğrulama: POST /api/auth/login ile alınan JWT, 'Authorization: Bearer <token>' başlığıyla gönderilir.";
        return Task.CompletedTask;
    });
});
builder.Services.AddProblemDetails();

// Büyük GeoJSON yanıtlarını (mahalle sınırları vb.) gzip/brotli ile sıkıştır.
builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
    options.MimeTypes = Microsoft.AspNetCore.ResponseCompression.ResponseCompressionDefaults.MimeTypes
        .Concat(["application/geo+json", "application/problem+json"]);
});

// ---------------------------------------------------------------- Kimlik doğrulama (JWT) ve yetkilendirme

var jwt = builder.Configuration.GetSection(JwtOptions.Section).Get<JwtOptions>() ?? new JwtOptions();
if (jwt.Key.Length < 32)
{
    throw new InvalidOperationException(
        "Jwt:Key en az 32 karakter olmalıdır. Geliştirmede appsettings.Development.json içinde tanımlıdır; " +
        "üretimde Jwt__Key ortam değişkeniyle verin.");
}

builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection(JwtOptions.Section));
builder.Services.AddMemoryCache();
builder.Services.AddSingleton<TokenService>();
builder.Services.AddScoped<IPasswordHasher<AppUser>, PasswordHasher<AppUser>>();

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false; // "role", "name", "sub" gibi kısa talep adları olduğu gibi kalsın
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwt.Issuer,
            ValidateAudience = true,
            ValidAudience = jwt.Audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Key)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(1),
            NameClaimType = "name",
            RoleClaimType = "role"
        };

        // İmza ve süre doğru olsa bile kullanıcı bu arada devre dışı bırakıldıysa veya rolü değiştiyse
        // token geçersiz sayılır; aksi halde yetki, token süresi (8 saat) dolana kadar eski haliyle sürerdi.
        options.Events = new JwtBearerEvents
        {
            OnTokenValidated = async context =>
            {
                var userId = context.Principal.Id();
                var tokenRole = context.Principal?.FindFirst("role")?.Value;

                var cache = context.HttpContext.RequestServices.GetRequiredService<IMemoryCache>();
                var state = await cache.GetOrCreateAsync(UserSessionCache.Key(userId), async entry =>
                {
                    // Kısa süreli önbellek: her istekte veritabanına gitmemek için. Kullanıcı güncellenince temizlenir.
                    entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(30);
                    var db = context.HttpContext.RequestServices.GetRequiredService<AppDbContext>();
                    return await db.Users.AsNoTracking()
                        .Where(u => u.Id == userId)
                        .Select(u => new UserSessionState(u.IsActive, u.Role.ToString()))
                        .FirstOrDefaultAsync(context.HttpContext.RequestAborted);
                });

                if (state is null || !state.IsActive || state.Role != tokenRole)
                    context.Fail("Oturum artık geçerli değil.");
            }
        };
    });

builder.Services.AddAuthorizationBuilder()
    // Varsayılan: giriş yapmamış hiç kimse hiçbir uç noktaya erişemez ([AllowAnonymous] ile açılanlar hariç).
    .SetFallbackPolicy(new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build())
    .AddPolicy(Policies.CanWrite, policy => policy.RequireRole(nameof(UserRole.Operator), nameof(UserRole.Admin)))
    .AddPolicy(Policies.AdminOnly, policy => policy.RequireRole(nameof(UserRole.Admin)));

// Kaba kuvvet parola denemelerine karşı: IP başına dakikada en fazla N giriş denemesi.
var loginLimit = builder.Configuration.GetValue("RateLimit:LoginPerMinute", 10);
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("login", httpContext => RateLimitPartition.GetFixedWindowLimiter(
        httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = loginLimit, Window = TimeSpan.FromMinutes(1) }));
});

// ---------------------------------------------------------------- Veritabanı

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException(
        "ConnectionStrings:DefaultConnection bulunamadı. 'dotnet user-secrets set' ile tanımlayın.");

builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<AuditSaveChangesInterceptor>();
builder.Services.AddDbContext<AppDbContext>((services, options) =>
    options.UseNpgsql(connectionString, npgsql => npgsql.UseNetTopologySuite())
        .AddInterceptors(services.GetRequiredService<AuditSaveChangesInterceptor>()));

builder.Services.AddScoped<NeighborhoodLocator>();
builder.Services.AddScoped<GeoJsonImporter>();

// OpenStreetMap Overpass API istemcisi. Kullanım politikası gereği tanımlayıcı bir User-Agent gerekir.
builder.Services.AddHttpClient<OsmImporter>(client =>
{
    client.BaseAddress = new Uri("https://overpass-api.de/");
    client.Timeout = TimeSpan.FromMinutes(4);
    client.DefaultRequestHeaders.UserAgent.ParseAdd("SmartCityGIS/1.0 (portfolio project; contact via GitHub)");
});

builder.Services.AddHealthChecks().AddDbContextCheck<AppDbContext>("veritabani");

var app = builder.Build();

// Üretim benzeri ortamda herkesçe bilinen demo değerleri kullanılıyorsa açıkça uyar.
if (!app.Environment.IsDevelopment())
{
    if (jwt.Key.StartsWith("yalnizca-yerel-demo") || jwt.Key.StartsWith("gelistirme-ortami"))
        app.Logger.LogWarning("Jwt:Key demo/geliştirme değerinde! Token'lar sahtelenebilir. Gerçek bir sunucuda Jwt__Key değiştirin.");
    if (app.Configuration.GetValue("Seed:DemoUsers", false))
        app.Logger.LogWarning("Demo kullanıcıları (admin/operator/izleyici) etkin ve parolaları herkesçe bilinir. Gerçek bir sunucuda Seed__DemoUsers=false yapın.");
}

// ---------------------------------------------------------------- Başlangıç: migration ve tohum veri

// Geliştirmede varsayılan olarak açıktır; üretimde Database__MigrateOnStartup=true ile istenir.
var migrate = app.Configuration.GetValue("Database:MigrateOnStartup", app.Environment.IsDevelopment());
var seedSamples = app.Configuration.GetValue("Database:SeedSampleData", app.Environment.IsDevelopment());

if (migrate)
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();

    var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher<AppUser>>();
    await UserSeeder.SeedAsync(db, hasher, app.Configuration, app.Environment.IsDevelopment());

    if (seedSamples)
    {
        var locator = scope.ServiceProvider.GetRequiredService<NeighborhoodLocator>();
        await DbSeeder.SeedAsync(db, locator, app.Environment.ContentRootPath);
    }
}

// ---------------------------------------------------------------- İstek hattı (middleware sırası önemlidir)

app.UseResponseCompression();

// Beklenmeyen hataları (500) ProblemDetails olarak döndür, ayrıntıyı sızdırma.
app.UseExceptionHandler();
app.UseStatusCodePages();

// API belgeleri: /openapi/v1.json (şema) ve /scalar (etkileşimli arayüz). Yalnızca geliştirmede veya Api__Docs=true ile.
if (app.Environment.IsDevelopment() || app.Configuration.GetValue("Api:Docs", false))
{
    app.MapOpenApi().AllowAnonymous();
    app.MapScalarApiReference(options => options.WithTitle("SmartCity GIS API")).AllowAnonymous();
}

// TLS genellikle önündeki proxy'de (nginx, bulut yük dengeleyici) sonlandırılır; uygulama kendisi
// yönlendirme yapmaz. Doğrudan internete açılıyorsa Https__RedirectEnabled=true ile açılır.
if (app.Configuration.GetValue("Https:RedirectEnabled", false))
{
    app.UseHttpsRedirection();
}

app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHealthChecks("/health").AllowAnonymous();

app.Run();

// WebApplicationFactory ile entegrasyon testleri için Program sınıfını görünür yapar.
public partial class Program;
