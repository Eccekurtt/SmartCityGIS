# ---- Derleme aşaması: SDK imajı ----
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Önce yalnızca proje dosyası: paket geri yüklemesi katmanı, kaynak değişince yeniden çalışmaz (Docker önbelleği).
COPY SmartCityGis.Api.csproj ./
RUN dotnet restore

COPY . .
RUN dotnet publish -c Release -o /app --no-restore

# ---- Çalışma aşaması: yalnızca ASP.NET çalışma zamanı (SDK yok, imaj küçük ve saldırı yüzeyi dar) ----
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app .

ENV ASPNETCORE_URLS=http://+:8080 \
    ASPNETCORE_ENVIRONMENT=Production

EXPOSE 8080

# Root olmayan kullanıcı ile çalış (imajdaki hazır "app" kullanıcısı).
USER $APP_UID

ENTRYPOINT ["dotnet", "SmartCityGis.Api.dll"]
