using NetTopologySuite;
using NetTopologySuite.Geometries;

namespace SmartCityGis.Api.Data;

public static class Geo
{
    // SRID 4326 = WGS84, GPS ve web haritalarında kullanılan enlem/boylam sistemi.
    public const int Wgs84 = 4326;

    public static readonly GeometryFactory Factory =
        NtsGeometryServices.Instance.CreateGeometryFactory(Wgs84);

    // Enlem/boylam sırasıyla nokta üretir (NTS içinde X = boylam, Y = enlem).
    public static Point Point(double latitude, double longitude) =>
        Factory.CreatePoint(new Coordinate(longitude, latitude));

    // [boylam, enlem] çiftlerinden çizgi üretir (GeoJSON sırası).
    public static LineString Line(params (double Lon, double Lat)[] points) =>
        Factory.CreateLineString(points.Select(p => new Coordinate(p.Lon, p.Lat)).ToArray());

    // Halkayı otomatik kapatır.
    public static Polygon Polygon(params (double Lon, double Lat)[] ring)
    {
        var coords = ring.Select(p => new Coordinate(p.Lon, p.Lat)).ToList();
        if (!coords[0].Equals2D(coords[^1])) coords.Add(coords[0].Copy());
        return Factory.CreatePolygon(coords.ToArray());
    }
}
