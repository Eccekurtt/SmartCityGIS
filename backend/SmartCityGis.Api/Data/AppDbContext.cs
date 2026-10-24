using Microsoft.EntityFrameworkCore;
using SmartCityGis.Api.Models;

namespace SmartCityGis.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Asset> Assets => Set<Asset>();

    public DbSet<Neighborhood> Neighborhoods => Set<Neighborhood>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasPostgresExtension("postgis");
        modelBuilder.HasPostgresExtension("pg_trgm");

        modelBuilder.Entity<Asset>(entity =>
        {
            entity.Property(a => a.Name).HasMaxLength(100);
            entity.Property(a => a.Neighborhood).HasMaxLength(100);
            entity.Property(a => a.Description).HasMaxLength(500);

            // Enum'lar veritabanında sayı yerine okunabilir metin olarak saklanır.
            entity.Property(a => a.Category).HasConversion<string>().HasMaxLength(30);
            entity.Property(a => a.Status).HasConversion<string>().HasMaxLength(30);

            entity.Property(a => a.Geometry).HasColumnType("geometry(Geometry, 4326)");

            // --- Üretilen (generated, stored) sütunlar: değerleri PostgreSQL/PostGIS hesaplar ---
            entity.Property(a => a.Latitude)
                .HasComputedColumnSql("ST_Y(ST_PointOnSurface(\"Geometry\"))", stored: true);
            entity.Property(a => a.Longitude)
                .HasComputedColumnSql("ST_X(ST_PointOnSurface(\"Geometry\"))", stored: true);
            entity.Property(a => a.GeometryType)
                .HasMaxLength(30)
                .HasComputedColumnSql("replace(ST_GeometryType(\"Geometry\"), 'ST_', '')", stored: true);
            entity.Property(a => a.LengthMeters)
                .HasComputedColumnSql(
                    "CASE WHEN ST_GeometryType(\"Geometry\") IN ('ST_LineString', 'ST_MultiLineString') " +
                    "THEN ST_Length(\"Geometry\"::geography) END", stored: true);
            entity.Property(a => a.AreaSquareMeters)
                .HasComputedColumnSql(
                    "CASE WHEN ST_GeometryType(\"Geometry\") IN ('ST_Polygon', 'ST_MultiPolygon') " +
                    "THEN ST_Area(\"Geometry\"::geography) END", stored: true);
            // Türkçe karakterleri ASCII'ye çevirip küçültür (TextFolding.Fold ile aynı kural).
            entity.Property(a => a.SearchText)
                .HasComputedColumnSql(
                    "lower(translate(coalesce(\"Name\", '') || ' ' || coalesce(\"Neighborhood\", ''), " +
                    "'ÇĞİIıÖŞÜçğöşü', 'cgiiiosucgosu'))", stored: true);

            // --- İndeksler ---
            // Mekânsal sorgular (kesişim, mesafe): GiST.
            entity.HasIndex(a => a.Geometry).HasMethod("gist");
            // "içeren" aramaları (LIKE '%...%'): trigram GIN.
            entity.HasIndex(a => a.SearchText).HasMethod("gin").HasOperators("gin_trgm_ops");
            entity.HasIndex(a => a.Category);
            entity.HasIndex(a => a.Status);
            entity.HasIndex(a => a.Neighborhood);

            entity.Property(a => a.Source).HasMaxLength(20).HasDefaultValue("manual");
            entity.Property(a => a.ExternalId).HasMaxLength(60);
            // Aynı dış kaynaktan gelen kayıt iki kez eklenemez (NULL olanlar muaf).
            entity.HasIndex(a => a.ExternalId).IsUnique().HasFilter("\"ExternalId\" IS NOT NULL");
        });

        modelBuilder.Entity<Neighborhood>(entity =>
        {
            entity.Property(n => n.Name).HasMaxLength(100);
            entity.Property(n => n.District).HasMaxLength(100);
            entity.Property(n => n.Source).HasMaxLength(20).HasDefaultValue("manual");
            entity.Property(n => n.ExternalId).HasMaxLength(60);

            entity.Property(n => n.Boundary).HasColumnType("geometry(Geometry, 4326)");
            entity.Property(n => n.AreaSquareMeters)
                .HasComputedColumnSql("ST_Area(\"Boundary\"::geography)", stored: true);

            entity.HasIndex(n => n.Boundary).HasMethod("gist");
            entity.HasIndex(n => new { n.District, n.Name }).IsUnique();
            entity.HasIndex(n => n.ExternalId).IsUnique().HasFilter("\"ExternalId\" IS NOT NULL");
        });
    }
}
