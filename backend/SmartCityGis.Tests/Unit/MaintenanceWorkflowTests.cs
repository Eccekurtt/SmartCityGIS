using SmartCityGis.Api.Controllers;
using SmartCityGis.Api.Models;
using SmartCityGis.Api.Services;

namespace SmartCityGis.Tests.Unit;

public class MaintenanceWorkflowTests
{
    [Theory]
    [InlineData(MaintenanceStatus.Planned, MaintenanceStatus.InProgress)]
    [InlineData(MaintenanceStatus.Planned, MaintenanceStatus.Cancelled)]
    [InlineData(MaintenanceStatus.InProgress, MaintenanceStatus.Completed)]
    [InlineData(MaintenanceStatus.InProgress, MaintenanceStatus.Cancelled)]
    public void AllowedTransitions_ReturnTrue(MaintenanceStatus from, MaintenanceStatus to) =>
        Assert.True(MaintenanceWorkflow.CanTransition(from, to));

    [Theory]
    [InlineData(MaintenanceStatus.Planned, MaintenanceStatus.Completed)]      // başlamadan bitmez
    [InlineData(MaintenanceStatus.InProgress, MaintenanceStatus.Planned)]     // geri dönüş yok
    [InlineData(MaintenanceStatus.Completed, MaintenanceStatus.InProgress)]   // son durum
    [InlineData(MaintenanceStatus.Completed, MaintenanceStatus.Cancelled)]
    [InlineData(MaintenanceStatus.Cancelled, MaintenanceStatus.Planned)]
    [InlineData(MaintenanceStatus.Planned, MaintenanceStatus.Planned)]        // aynı duruma geçiş de geçersiz
    public void ForbiddenTransitions_ReturnFalse(MaintenanceStatus from, MaintenanceStatus to) =>
        Assert.False(MaintenanceWorkflow.CanTransition(from, to));

    [Theory]
    [InlineData(MaintenanceStatus.Planned, true)]
    [InlineData(MaintenanceStatus.InProgress, true)]
    [InlineData(MaintenanceStatus.Completed, false)]
    [InlineData(MaintenanceStatus.Cancelled, false)]
    public void OnlyOpenRecordsAreEditable(MaintenanceStatus status, bool expected) =>
        Assert.Equal(expected, MaintenanceWorkflow.IsEditable(status));
}

public class PasswordPolicyTests
{
    [Theory]
    [InlineData("abc123", "en az 8")]                  // çok kısa
    [InlineData("sadeceharfler", "bir harf ve bir rakam")]
    [InlineData("12345678", "bir harf ve bir rakam")]
    public void WeakPasswords_AreRejected(string password, string messagePart)
    {
        var error = UsersController.PasswordError(password);

        Assert.NotNull(error);
        Assert.Contains(messagePart, error);
    }

    [Theory]
    [InlineData("Gecerli123")]
    [InlineData("parola-2026")]
    [InlineData("Çok-Güçlü-Parola-9")]
    public void ReasonablePasswords_AreAccepted(string password) =>
        Assert.Null(UsersController.PasswordError(password));

    [Fact]
    public void TooLongPassword_IsRejected() =>
        Assert.NotNull(UsersController.PasswordError(new string('a', 129) + "1"));
}
