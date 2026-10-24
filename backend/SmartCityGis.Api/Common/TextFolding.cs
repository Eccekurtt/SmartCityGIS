namespace SmartCityGis.Api.Common;

public static class TextFolding
{
    // PostgreSQL'deki SearchText sütununun üretim ifadesiyle (AppDbContext) aynı dönüşüm:
    // Türkçe harfler ASCII karşılığına çevrilir, geri kalan küçük harfe indirilir.
    private const string From = "ÇĞİIıÖŞÜçğöşü";
    private const string To = "cgiiiosucgosu";

    public static string Fold(string? text)
    {
        if (string.IsNullOrWhiteSpace(text)) return "";

        var chars = text.Trim().ToCharArray();
        for (var i = 0; i < chars.Length; i++)
        {
            var index = From.IndexOf(chars[i]);
            chars[i] = index >= 0 ? To[index] : char.ToLowerInvariant(chars[i]);
        }

        return new string(chars);
    }

    // LIKE kalıbındaki özel karakterleri etkisizleştirir.
    public static string EscapeLike(string text) =>
        text.Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_");
}
