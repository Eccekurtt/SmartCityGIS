namespace SmartCityGis.Api.Security;

// Token doğrulamasında kullanıcının güncel durumu (etkin mi, rolü ne) kısa süre önbelleğe alınır.
public record UserSessionState(bool IsActive, string Role);

public static class UserSessionCache
{
    public static string Key(int? userId) => $"user-session:{userId}";
}
