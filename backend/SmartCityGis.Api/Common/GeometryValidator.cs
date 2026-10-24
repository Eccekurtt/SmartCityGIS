using NetTopologySuite.Geometries;
using NetTopologySuite.Operation.Valid;

namespace SmartCityGis.Api.Common;

public static class GeometryValidator
{
    private const int MaxVertices = 20_000;

    private static readonly HashSet<string> AllowedTypes =
    [
        Geometry.TypeNamePoint,
        Geometry.TypeNameLineString,
        Geometry.TypeNamePolygon,
        Geometry.TypeNameMultiLineString,
        Geometry.TypeNameMultiPolygon,
    ];

    // Geçerliyse null, değilse Türkçe hata mesajı döner.
    public static string? Validate(Geometry? geometry)
    {
        if (geometry is null) return "Geometri zorunludur.";
        if (geometry.IsEmpty) return "Geometri boş olamaz.";

        if (!AllowedTypes.Contains(geometry.GeometryType))
            return $"Desteklenmeyen geometri türü: {geometry.GeometryType}. " +
                   "Nokta, çizgi veya alan (çokgen) kullanın.";

        if (geometry.NumPoints > MaxVertices)
            return $"Geometri çok fazla köşe noktası içeriyor (en fazla {MaxVertices}).";

        foreach (var c in geometry.Coordinates)
        {
            if (double.IsNaN(c.X) || double.IsNaN(c.Y) || c.X is < -180 or > 180 || c.Y is < -90 or > 90)
                return "Koordinatlar WGS84 sınırları dışında: boylam -180/180, enlem -90/90 olmalıdır " +
                       "(GeoJSON'da sıra [boylam, enlem]).";
        }

        var validity = new IsValidOp(geometry);
        if (!validity.IsValid)
            return $"Geometri geçersiz: {Describe(validity.ValidationError)}";

        return null;
    }

    // NTS'in İngilizce topoloji hatalarını kullanıcıya anlaşılır Türkçeye çevirir.
    private static string Describe(TopologyValidationError? error) => error?.ErrorType switch
    {
        TopologyValidationErrors.SelfIntersection or TopologyValidationErrors.RingSelfIntersection
            => "çizim kendini kesiyor (kenarlar birbiriyle çakışıyor)",
        TopologyValidationErrors.TooFewPoints => "yeterli sayıda nokta yok (çizgi en az 2, alan en az 3 köşe gerektirir)",
        TopologyValidationErrors.HoleOutsideShell => "bir delik dış sınırın dışında kalıyor",
        TopologyValidationErrors.NestedHoles => "delikler iç içe geçmiş",
        TopologyValidationErrors.NestedShells => "alanlar iç içe geçmiş",
        TopologyValidationErrors.DuplicateRings => "aynı halka birden fazla kez tanımlanmış",
        TopologyValidationErrors.RingNotClosed => "alan sınırı kapalı değil (ilk ve son nokta aynı olmalı)",
        TopologyValidationErrors.InvalidCoordinate => "geçersiz koordinat değeri",
        _ => error?.Message ?? "bilinmeyen topoloji hatası"
    };
}
