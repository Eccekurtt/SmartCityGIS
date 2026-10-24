namespace SmartCityGis.Api.Security;

public static class Policies
{
    // Operatör veya Yönetici: varlık ve bakım ekleme/düzenleme
    public const string CanWrite = "CanWrite";

    // Yalnızca Yönetici: silme, içe aktarma, kullanıcı yönetimi, denetim kaydı
    public const string AdminOnly = "AdminOnly";
}
