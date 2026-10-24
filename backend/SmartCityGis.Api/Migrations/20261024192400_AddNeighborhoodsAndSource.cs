using Microsoft.EntityFrameworkCore.Migrations;
using NetTopologySuite.Geometries;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace SmartCityGis.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddNeighborhoodsAndSource : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ExternalId",
                table: "Assets",
                type: "character varying(60)",
                maxLength: 60,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Source",
                table: "Assets",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "manual");

            migrationBuilder.CreateTable(
                name: "Neighborhoods",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    District = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Boundary = table.Column<Geometry>(type: "geometry(Geometry, 4326)", nullable: false),
                    Source = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "manual"),
                    ExternalId = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: true),
                    AreaSquareMeters = table.Column<double>(type: "double precision", nullable: false, computedColumnSql: "ST_Area(\"Boundary\"::geography)", stored: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Neighborhoods", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Assets_ExternalId",
                table: "Assets",
                column: "ExternalId",
                unique: true,
                filter: "\"ExternalId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Neighborhoods_Boundary",
                table: "Neighborhoods",
                column: "Boundary")
                .Annotation("Npgsql:IndexMethod", "gist");

            migrationBuilder.CreateIndex(
                name: "IX_Neighborhoods_District_Name",
                table: "Neighborhoods",
                columns: new[] { "District", "Name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Neighborhoods_ExternalId",
                table: "Neighborhoods",
                column: "ExternalId",
                unique: true,
                filter: "\"ExternalId\" IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Neighborhoods");

            migrationBuilder.DropIndex(
                name: "IX_Assets_ExternalId",
                table: "Assets");

            migrationBuilder.DropColumn(
                name: "ExternalId",
                table: "Assets");

            migrationBuilder.DropColumn(
                name: "Source",
                table: "Assets");
        }
    }
}
