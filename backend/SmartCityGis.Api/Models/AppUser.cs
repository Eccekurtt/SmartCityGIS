namespace SmartCityGis.Api.Models;

// Roller artan yetki sırasındadır.
//   Viewer   : her şeyi görüntüler, dışa aktarır.
//   Operator : varlık ve bakım ekler/düzenler.
//   Admin    : silme, içe aktarma, kullanıcı yönetimi ve denetim kaydı.
public enum UserRole
{
    Viewer,
    Operator,
    Admin
}

public class AppUser
{
    public int Id { get; set; }

    public required string UserName { get; set; }

    public required string DisplayName { get; set; }

    // ASP.NET Core PasswordHasher çıktısı (PBKDF2-HMAC-SHA512, rastgele tuzlu). Düz parola asla saklanmaz.
    public string PasswordHash { get; set; } = "";

    public UserRole Role { get; set; } = UserRole.Viewer;

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? LastLoginAt { get; set; }
}
