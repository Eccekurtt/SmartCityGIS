using NetTopologySuite.Geometries;
using SmartCityGis.Api.Common;
using SmartCityGis.Api.Data;

namespace SmartCityGis.Tests.Unit;

public class GeometryValidatorTests
{
    [Fact]
    public void ValidPoint_IsAccepted() =>
        Assert.Null(GeometryValidator.Validate(Geo.Point(39.92, 32.85)));

    [Fact]
    public void ValidLine_IsAccepted() =>
        Assert.Null(GeometryValidator.Validate(Geo.Line((32.85, 39.92), (32.86, 39.93))));

    [Fact]
    public void ValidPolygon_IsAccepted() =>
        Assert.Null(GeometryValidator.Validate(
            Geo.Polygon((32.80, 39.90), (32.81, 39.90), (32.81, 39.91), (32.80, 39.91))));

    [Fact]
    public void Null_IsRejected() =>
        Assert.Equal("Geometri zorunludur.", GeometryValidator.Validate(null));

    [Fact]
    public void EmptyGeometry_IsRejected() =>
        Assert.NotNull(GeometryValidator.Validate(Geo.Factory.CreatePoint()));

    [Theory]
    [InlineData(200, 39)]   // boylam sınırın dışında
    [InlineData(-181, 39)]
    [InlineData(32, 91)]    // enlem sınırın dışında
    [InlineData(32, -95)]
    public void CoordinatesOutsideWgs84_AreRejected(double lon, double lat)
    {
        var error = GeometryValidator.Validate(Geo.Factory.CreatePoint(new Coordinate(lon, lat)));

        Assert.NotNull(error);
        Assert.Contains("WGS84", error);
    }

    [Fact]
    public void SelfIntersectingPolygon_IsRejectedWithTurkishMessage()
    {
        // "Kelebek" (bow-tie) çokgeni kendini keser.
        var bowTie = Geo.Factory.CreatePolygon(
        [
            new Coordinate(0, 0), new Coordinate(10, 10), new Coordinate(10, 0), new Coordinate(0, 10), new Coordinate(0, 0)
        ]);

        var error = GeometryValidator.Validate(bowTie);

        Assert.NotNull(error);
        Assert.Contains("kendini kesiyor", error);
    }

    [Fact]
    public void GeometryCollection_IsNotSupported()
    {
        var collection = Geo.Factory.CreateGeometryCollection([Geo.Point(39.9, 32.8)]);

        Assert.Contains("Desteklenmeyen", GeometryValidator.Validate(collection));
    }

    [Fact]
    public void MultiPolygon_IsAccepted()
    {
        var a = Geo.Polygon((32.80, 39.90), (32.81, 39.90), (32.81, 39.91), (32.80, 39.91));
        var b = Geo.Polygon((32.90, 39.90), (32.91, 39.90), (32.91, 39.91), (32.90, 39.91));

        Assert.Null(GeometryValidator.Validate(Geo.Factory.CreateMultiPolygon([a, b])));
    }
}
