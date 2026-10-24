using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartCityGis.Api.Data;
using SmartCityGis.Api.Models;
using SmartCityGis.Api.Security;

namespace SmartCityGis.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = Policies.AdminOnly)]
public class UsersController(AppDbContext db, IPasswordHasher<AppUser> hasher) : ControllerBase
{
    public record UserDto(
        int Id, string UserName, string DisplayName, UserRole Role, bool IsActive,
        DateTime CreatedAt, DateTime? LastLoginAt);

    public class CreateUserRequest
    {
        [Required(ErrorMessage = "Kullanıcı adı zorunludur."),
         RegularExpression("^[a-z0-9._-]{3,50}$",
             ErrorMessage = "Kullanıcı adı 3-50 karakter olmalı; yalnızca küçük harf, rakam, nokta, tire ve alt çizgi içerebilir.")]
        public string UserName { get; set; } = "";

        [Required(ErrorMessage = "Görünen ad zorunludur."), StringLength(100)]
        public string DisplayName { get; set; } = "";

        [EnumDataType(typeof(UserRole), ErrorMessage = "Geçersiz rol.")]
        public UserRole Role { get; set; } = UserRole.Viewer;

        [Required(ErrorMessage = "Parola zorunludur.")]
        public string Password { get; set; } = "";
    }

    public class UpdateUserRequest
    {
        [Required(ErrorMessage = "Görünen ad zorunludur."), StringLength(100)]
        public string DisplayName { get; set; } = "";

        [EnumDataType(typeof(UserRole), ErrorMessage = "Geçersiz rol.")]
        public UserRole Role { get; set; }

        public bool IsActive { get; set; } = true;
    }

    public class ResetPasswordRequest
    {
        [Required(ErrorMessage = "Parola zorunludur.")]
        public string Password { get; set; } = "";
    }

    [HttpGet]
    public async Task<IEnumerable<UserDto>> List(CancellationToken ct) =>
        await db.Users.AsNoTracking()
            .OrderBy(u => u.UserName)
            .Select(u => new UserDto(u.Id, u.UserName, u.DisplayName, u.Role, u.IsActive, u.CreatedAt, u.LastLoginAt))
            .ToListAsync(ct);

    [HttpPost]
    public async Task<ActionResult<UserDto>> Create(CreateUserRequest request, CancellationToken ct)
    {
        var error = PasswordError(request.Password);
        if (error is not null) return Invalid(nameof(request.Password), error);

        var userName = request.UserName.Trim().ToLowerInvariant();
        if (await db.Users.AnyAsync(u => u.UserName == userName, ct))
            return Invalid(nameof(request.UserName), "Bu kullanıcı adı zaten kullanılıyor.");

        var user = new AppUser { UserName = userName, DisplayName = request.DisplayName.Trim(), Role = request.Role };
        user.PasswordHash = hasher.HashPassword(user, request.Password);

        db.Users.Add(user);
        await db.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(List), ToDto(user));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<UserDto>> Update(int id, UpdateUserRequest request, CancellationToken ct)
    {
        var user = await db.Users.FindAsync([id], ct);
        if (user is null) return NotFound();

        var self = id == User.Id();
        if (self && (request.Role != user.Role || !request.IsActive))
            return Invalid(nameof(request.Role), "Kendi rolünüzü veya hesap durumunuzu değiştiremezsiniz.");

        // Sistemde en az bir etkin yönetici kalmalı.
        var losesAdmin = user.Role == UserRole.Admin && user.IsActive &&
                         (request.Role != UserRole.Admin || !request.IsActive);
        if (losesAdmin && !await db.Users.AnyAsync(u => u.Id != id && u.Role == UserRole.Admin && u.IsActive, ct))
            return Invalid(nameof(request.Role), "Son etkin yöneticinin yetkisi kaldırılamaz.");

        user.DisplayName = request.DisplayName.Trim();
        user.Role = request.Role;
        user.IsActive = request.IsActive;
        await db.SaveChangesAsync(ct);

        return ToDto(user);
    }

    [HttpPost("{id:int}/password")]
    public async Task<IActionResult> ResetPassword(int id, ResetPasswordRequest request, CancellationToken ct)
    {
        var user = await db.Users.FindAsync([id], ct);
        if (user is null) return NotFound();

        var error = PasswordError(request.Password);
        if (error is not null) return Invalid(nameof(request.Password), error);

        user.PasswordHash = hasher.HashPassword(user, request.Password);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    // Parola kuralı: en az 8 karakter, en az bir harf ve bir rakam.
    public static string? PasswordError(string password)
    {
        if (password.Length < 8) return "Parola en az 8 karakter olmalıdır.";
        if (password.Length > 128) return "Parola en fazla 128 karakter olabilir.";
        if (!password.Any(char.IsLetter) || !password.Any(char.IsDigit))
            return "Parola en az bir harf ve bir rakam içermelidir.";
        return null;
    }

    private static UserDto ToDto(AppUser u) =>
        new(u.Id, u.UserName, u.DisplayName, u.Role, u.IsActive, u.CreatedAt, u.LastLoginAt);

    private ActionResult Invalid(string field, string message)
    {
        ModelState.AddModelError(field, message);
        return ValidationProblem(ModelState);
    }
}
