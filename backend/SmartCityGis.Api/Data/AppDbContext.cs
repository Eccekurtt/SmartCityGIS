using Microsoft.EntityFrameworkCore;
using SmartCityGis.Api.Models;

namespace SmartCityGis.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Asset> Assets => Set<Asset>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasPostgresExtension("postgis");

        modelBuilder.Entity<Asset>(entity =>
        {
            entity.Property(a => a.Name).HasMaxLength(100);
            entity.Property(a => a.Neighborhood).HasMaxLength(100);
            entity.Property(a => a.Description).HasMaxLength(500);

            // Enum'lar veritabanında sayı yerine okunabilir metin olarak saklanır.
            entity.Property(a => a.Category).HasConversion<string>().HasMaxLength(30);
            entity.Property(a => a.Status).HasConversion<string>().HasMaxLength(30);

            entity.Property(a => a.Location).HasColumnType("geometry(Point, 4326)");

            // Mekânsal sorguları hızlandıran GiST indeksi.
            entity.HasIndex(a => a.Location).HasMethod("gist");
        });
    }
}
