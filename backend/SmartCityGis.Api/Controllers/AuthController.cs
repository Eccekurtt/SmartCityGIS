using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using SmartCityGis.Api.Data;
using SmartCityGis.Api.Models;
using SmartCityGis.Api.Security;

namespace SmartCityGis.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(
    AppDbContext db,
    IPasswordHasher<AppUser> hasher,
    TokenService tokens) : ControllerBase
{
    public class LoginRequest
    {
        [Required(ErrorMessage = "Kullanıcı adı zorunludur."), StringLength(50)]
        public string UserName { get; set; } = "";

        [Required(ErrorMessage = "Parola zorunludur."), StringLength(200)]
        public string Password { get; set; } = "";
    }

    public record UserInfo(int Id, string UserName, string DisplayName, UserRole Role);

    public record LoginResponse(string Token, DateTime ExpiresAt, UserInfo User);

    // Kullanıcı yokken de parola doğrulaması yapılır; böylece yanıt süresinden "bu kullanıcı var mı?" anlaşılamaz.
    private static readonly AppUser DummyUser = new() { UserName = "dummy", DisplayName = "dummy" };
    private string? _dummyHash;

    [HttpPost("login")]
    [AllowAnonymous]
    [EnableRateLimiting("login")]
    public async Task<ActionResult<LoginResponse>> Login(LoginRequest request, CancellationToken ct)
    {
        var userName = request.UserName.Trim().ToLowerInvariant();
        var user = await db.Users.FirstOrDefaultAsync(u => u.UserName == userName, ct);

        _dummyHash ??= hasher.HashPassword(DummyUser, "dummy-password");
        var result = hasher.VerifyHashedPassword(user ?? DummyUser, user?.PasswordHash ?? _dummyHash, request.Password);

        if (user is null || !user.IsActive || result == PasswordVerificationResult.Failed)
        {
            db.AuditLogs.Add(new AuditLog
            {
                Action = "LoginFailed",
                EntityType = "Auth",
                UserName = userName.Length > 50 ? userName[..50] : userName,
                Summary = "Başarısız giriş denemesi",
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString()
            });
            await db.SaveChangesAsync(ct);

            return Unauthorized(new ProblemDetails
            {
                Title = "Giriş başarısız",
                Detail = "Kullanıcı adı veya parola hatalı.",
                Status = StatusCodes.Status401Unauthorized
            });
        }

        // Parola hash algoritması güncellenmişse eski hash'i yenisiyle değiştir.
        if (result == PasswordVerificationResult.SuccessRehashNeeded)
            user.PasswordHash = hasher.HashPassword(user, request.Password);

        user.LastLoginAt = DateTime.UtcNow;
        db.AuditLogs.Add(new AuditLog
        {
            Action = "Login",
            EntityType = "Auth",
            UserId = user.Id,
            UserName = user.UserName,
            Summary = "Oturum açıldı",
            IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString()
        });
        await db.SaveChangesAsync(ct);

        var issued = tokens.Create(user);
        return new LoginResponse(issued.Token, issued.ExpiresAt, ToInfo(user));
    }

    /// <summary>Geçerli oturumun kullanıcısı (token geçerli mi diye de kontrol etmeye yarar).</summary>
    [HttpGet("me")]
    public async Task<ActionResult<UserInfo>> Me(CancellationToken ct)
    {
        var id = User.Id();
        var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == id && u.IsActive, ct);
        return user is null ? Unauthorized() : ToInfo(user);
    }

    private static UserInfo ToInfo(AppUser user) => new(user.Id, user.UserName, user.DisplayName, user.Role);
}
