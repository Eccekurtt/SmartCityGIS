namespace SmartCityGis.Api.Common;

// Türkiye saatine (UTC+3, yaz saati uygulaması yok) göre "bugün".
// Planlanan bakım tarihi bir gündür; sunucu UTC'de çalışsa bile kullanıcının gününe göre değerlendirilir.
public static class Clock
{
    public static DateOnly Today => DateOnly.FromDateTime(DateTime.UtcNow.AddHours(3));
}
