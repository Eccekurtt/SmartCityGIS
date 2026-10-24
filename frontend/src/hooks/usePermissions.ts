// Yetkiler. Giriş/rol sistemi (Faz E) eklenene kadar herkes her işlemi yapabilir.
export interface Permissions {
  canWrite: boolean // varlık ve bakım ekleme/düzenleme
  canDelete: boolean // silme
  isAdmin: boolean // içe aktarma, kullanıcı ve denetim kaydı
}

export function usePermissions(): Permissions {
  return { canWrite: true, canDelete: true, isAdmin: true }
}
