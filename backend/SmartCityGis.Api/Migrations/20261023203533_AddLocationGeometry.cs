using Microsoft.EntityFrameworkCore.Migrations;
using NetTopologySuite.Geometries;

#nullable disable

namespace SmartCityGis.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddLocationGeometry : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:PostgresExtension:postgis", ",,");

            // 1) Önce boş (nullable) olarak ekle, çünkü tabloda zaten kayıt var.
            migrationBuilder.AddColumn<Point>(
                name: "Location",
                table: "Assets",
                type: "geometry(Point, 4326)",
                nullable: true);

            // 2) Eski enlem/boylamı geometriye taşı. ST_MakePoint(X = boylam, Y = enlem).
            migrationBuilder.Sql(
                @"UPDATE ""Assets"" SET ""Location"" = ST_SetSRID(ST_MakePoint(""Longitude"", ""Latitude""), 4326);");

            // 3) Artık hepsi dolu, zorunlu yap.
            migrationBuilder.AlterColumn<Point>(
                name: "Location",
                table: "Assets",
                type: "geometry(Point, 4326)",
                nullable: false,
                oldClrType: typeof(Point),
                oldType: "geometry(Point, 4326)",
                oldNullable: true);

            // 4) Veri taşındıktan sonra eski sütunları sil.
            migrationBuilder.DropColumn(
                name: "Latitude",
                table: "Assets");

            migrationBuilder.DropColumn(
                name: "Longitude",
                table: "Assets");

            migrationBuilder.CreateIndex(
                name: "IX_Assets_Location",
                table: "Assets",
                column: "Location")
                .Annotation("Npgsql:IndexMethod", "gist");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Assets_Location",
                table: "Assets");

            migrationBuilder.AddColumn<double>(
                name: "Latitude",
                table: "Assets",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "Longitude",
                table: "Assets",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.Sql(
                @"UPDATE ""Assets"" SET ""Latitude"" = ST_Y(""Location""), ""Longitude"" = ST_X(""Location"");");

            migrationBuilder.DropColumn(
                name: "Location",
                table: "Assets");

            migrationBuilder.AlterDatabase()
                .OldAnnotation("Npgsql:PostgresExtension:postgis", ",,");
        }
    }
}
