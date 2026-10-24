namespace SmartCityGis.Api.Security;

public class JwtOptions
{
    public const string Section = "Jwt";

    // HMAC-SHA256 imza anahtarı; en az 32 karakter. Üretimde ortam değişkeni (Jwt__Key) veya gizli depo ile verilir.
    public string Key { get; set; } = "";

    public string Issuer { get; set; } = "SmartCityGis";

    public string Audience { get; set; } = "SmartCityGis.Client";

    public int ExpiresMinutes { get; set; } = 480;
}
