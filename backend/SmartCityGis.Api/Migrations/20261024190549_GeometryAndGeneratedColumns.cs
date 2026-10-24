using System;
using Microsoft.EntityFrameworkCore.Migrations;
using NetTopologySuite.Geometries;

#nullable disable

namespace SmartCityGis.Api.Migrations
{
    /// <inheritdoc />
    public partial class GeometryAndGeneratedColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Eklentiler önce: indeksler pg_trgm operatör sınıfına ihtiyaç duyar.
            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:PostgresExtension:pg_trgm", ",,")
                .Annotation("Npgsql:PostgresExtension:postgis", ",,")
                .OldAnnotation("Npgsql:PostgresExtension:postgis", ",,");

            // Veri kaybı olmadan: Location (Point) -> Geometry (her geometri türü).
            migrationBuilder.DropIndex(
                name: "IX_Assets_Location",
                table: "Assets");

            migrationBuilder.RenameColumn(
                name: "Location",
                table: "Assets",
                newName: "Geometry");

            migrationBuilder.Sql(
                "ALTER TABLE \"Assets\" ALTER COLUMN \"Geometry\" TYPE geometry(Geometry, 4326);");

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "Assets",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "AreaSquareMeters",
                table: "Assets",
                type: "double precision",
                nullable: true,
                computedColumnSql: "CASE WHEN ST_GeometryType(\"Geometry\") IN ('ST_Polygon', 'ST_MultiPolygon') THEN ST_Area(\"Geometry\"::geography) END",
                stored: true);

            migrationBuilder.AddColumn<string>(
                name: "GeometryType",
                table: "Assets",
                type: "character varying(30)",
                maxLength: 30,
                nullable: false,
                computedColumnSql: "replace(ST_GeometryType(\"Geometry\"), 'ST_', '')",
                stored: true);

            migrationBuilder.AddColumn<double>(
                name: "Latitude",
                table: "Assets",
                type: "double precision",
                nullable: false,
                computedColumnSql: "ST_Y(ST_PointOnSurface(\"Geometry\"))",
                stored: true);

            migrationBuilder.AddColumn<double>(
                name: "LengthMeters",
                table: "Assets",
                type: "double precision",
                nullable: true,
                computedColumnSql: "CASE WHEN ST_GeometryType(\"Geometry\") IN ('ST_LineString', 'ST_MultiLineString') THEN ST_Length(\"Geometry\"::geography) END",
                stored: true);

            migrationBuilder.AddColumn<double>(
                name: "Longitude",
                table: "Assets",
                type: "double precision",
                nullable: false,
                computedColumnSql: "ST_X(ST_PointOnSurface(\"Geometry\"))",
                stored: true);

            migrationBuilder.AddColumn<string>(
                name: "SearchText",
                table: "Assets",
                type: "text",
                nullable: false,
                computedColumnSql: "lower(translate(coalesce(\"Name\", '') || ' ' || coalesce(\"Neighborhood\", ''), 'ÇĞİIıÖŞÜçğöşü', 'cgiiiosucgosu'))",
                stored: true);

            migrationBuilder.CreateIndex(
                name: "IX_Assets_Category",
                table: "Assets",
                column: "Category");

            migrationBuilder.CreateIndex(
                name: "IX_Assets_Geometry",
                table: "Assets",
                column: "Geometry")
                .Annotation("Npgsql:IndexMethod", "gist");

            migrationBuilder.CreateIndex(
                name: "IX_Assets_Neighborhood",
                table: "Assets",
                column: "Neighborhood");

            migrationBuilder.CreateIndex(
                name: "IX_Assets_SearchText",
                table: "Assets",
                column: "SearchText")
                .Annotation("Npgsql:IndexMethod", "gin")
                .Annotation("Npgsql:IndexOperators", new[] { "gin_trgm_ops" });

            migrationBuilder.CreateIndex(
                name: "IX_Assets_Status",
                table: "Assets",
                column: "Status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Assets_Category",
                table: "Assets");

            migrationBuilder.DropIndex(
                name: "IX_Assets_Geometry",
                table: "Assets");

            migrationBuilder.DropIndex(
                name: "IX_Assets_Neighborhood",
                table: "Assets");

            migrationBuilder.DropIndex(
                name: "IX_Assets_SearchText",
                table: "Assets");

            migrationBuilder.DropIndex(
                name: "IX_Assets_Status",
                table: "Assets");

            migrationBuilder.DropColumn(
                name: "AreaSquareMeters",
                table: "Assets");

            migrationBuilder.DropColumn(
                name: "GeometryType",
                table: "Assets");

            migrationBuilder.DropColumn(
                name: "Latitude",
                table: "Assets");

            migrationBuilder.DropColumn(
                name: "LengthMeters",
                table: "Assets");

            migrationBuilder.DropColumn(
                name: "Longitude",
                table: "Assets");

            migrationBuilder.DropColumn(
                name: "SearchText",
                table: "Assets");

            // Çizgi/alan kayıtları Point'e sığmaz: merkez noktalarına indirgenir.
            migrationBuilder.Sql(
                "ALTER TABLE \"Assets\" ALTER COLUMN \"Geometry\" TYPE geometry(Point, 4326) " +
                "USING ST_PointOnSurface(\"Geometry\");");

            migrationBuilder.RenameColumn(
                name: "Geometry",
                table: "Assets",
                newName: "Location");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "Assets");

            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:PostgresExtension:postgis", ",,")
                .OldAnnotation("Npgsql:PostgresExtension:pg_trgm", ",,")
                .OldAnnotation("Npgsql:PostgresExtension:postgis", ",,");

            migrationBuilder.CreateIndex(
                name: "IX_Assets_Location",
                table: "Assets",
                column: "Location")
                .Annotation("Npgsql:IndexMethod", "gist");
        }
    }
}
