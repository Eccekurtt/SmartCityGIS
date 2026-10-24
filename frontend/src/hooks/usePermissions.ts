import { useAuth } from '../context/AuthContext'

// Rol bazlı yetkiler. Sunucu her istekte yetkiyi yeniden denetler; buradaki değerler yalnızca arayüzü sadeleştirir
// (yetkisiz düğmeleri gizler). Güvenlik sınırı arayüz değil, API'dir.
export interface Permissions {
  canWrite: boolean // varlık ve bakım ekleme/düzenleme (Operatör, Yönetici)
  canDelete: boolean // silme (Yönetici)
  isAdmin: boolean // içe aktarma, kullanıcı yönetimi, denetim kaydı (Yönetici)
}

export function usePermissions(): Permissions {
  const { user } = useAuth()
  const role = user?.role

  return {
    canWrite: role === 'Operator' || role === 'Admin',
    canDelete: role === 'Admin',
    isAdmin: role === 'Admin',
  }
}
