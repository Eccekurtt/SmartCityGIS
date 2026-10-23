using NetTopologySuite.Geometries;

namespace SmartCityGis.Api.Data;

public static class Geo
{
    // SRID 4326 = WGS84, GPS ve web haritalarında kullanılan enlem/boylam sistemi.
    public const int Wgs84 = 4326;

    public static Point Point(double latitude, double longitude)
        => new(longitude, latitude) { SRID = Wgs84 };
}
