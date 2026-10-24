using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using SmartCityGis.Api.Models;

namespace SmartCityGis.Api.Data;

public static class UserSeeder
{
    // Yalnızca GELİŞTİRME/DEMO için: bu parolalar herkesçe bilinir, üretimde asla kullanılmaz.
    private static readonly (string UserName, string DisplayName, UserRole Role, string Password)[] DemoUsers =
    [
        ("admin", "Sistem Yöneticisi", UserRole.Admin, "Admin123!"),
        ("operator", "Saha Operatörü", UserRole.Operator, "Operator123!"),
        ("izleyici", "Salt Okunur Kullanıcı", UserRole.Viewer, "Izleyici123!"),
    ];

    public static async Task SeedAsync(
        AppDbContext db, IPasswordHasher<AppUser> hasher, IConfiguration configuration, bool isDevelopment)
    {
        if (await db.Users.AnyAsync()) return;

        // Demo kullanıcıları: geliştirmede otomatik, başka yerde Seed__DemoUsers=true ile açıkça istenir.
        if (configuration.GetValue("Seed:DemoUsers", isDevelopment))
        {
            foreach (var (userName, displayName, role, password) in DemoUsers)
                db.Users.Add(Create(hasher, userName, displayName, role, password));
        }
        else
        {
            // Üretim: ilk yönetici ortam değişkenlerinden oluşturulur (Seed__AdminUserName / Seed__AdminPassword).
            var adminName = configuration["Seed:AdminUserName"];
            var adminPassword = configuration["Seed:AdminPassword"];
            if (!string.IsNullOrWhiteSpace(adminName) && !string.IsNullOrWhiteSpace(adminPassword))
                db.Users.Add(Create(hasher, adminName, "Sistem Yöneticisi", UserRole.Admin, adminPassword));
        }

        await db.SaveChangesAsync();
    }

    private static AppUser Create(
        IPasswordHasher<AppUser> hasher, string userName, string displayName, UserRole role, string password)
    {
        var user = new AppUser { UserName = userName.Trim().ToLowerInvariant(), DisplayName = displayName, Role = role };
        user.PasswordHash = hasher.HashPassword(user, password);
        return user;
    }
}
