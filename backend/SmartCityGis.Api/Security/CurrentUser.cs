using System.Security.Claims;

namespace SmartCityGis.Api.Security;

public static class CurrentUser
{
    public static int? Id(this ClaimsPrincipal? user) =>
        int.TryParse(user?.FindFirstValue("sub"), out var id) ? id : null;

    public static string? Name(this ClaimsPrincipal? user) => user?.FindFirstValue("name");
}
