import { useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError } from '../api/client'
import { PlusIcon } from '../components/icons'
import { Modal } from '../components/Modal'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useCreateUser, useResetPassword, useUpdateUser, useUsers } from '../hooks/admin'
import { roleLabels } from '../labels'
import { formatDateTime } from '../lib/format'
import type { ManagedUser, UserRole } from '../types'

const roleDescriptions: Record<UserRole, string> = {
  Viewer: 'Her şeyi görüntüler ve dışa aktarır',
  Operator: 'Varlık ve bakım ekler/düzenler',
  Admin: 'Silme, içe aktarma, kullanıcı ve denetim',
}

const roles = Object.keys(roleLabels) as UserRole[]

type Dialog = null | 'new' | { edit: ManagedUser } | { password: ManagedUser }

function errorText(err: unknown) {
  return err instanceof ApiError ? err.message : 'İşlem tamamlanamadı.'
}

function NewUserModal({ onClose }: { onClose: () => void }) {
  const toast = useToast()
  const create = useCreateUser()
  const [userName, setUserName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [role, setRole] = useState<UserRole>('Viewer')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      await create.mutateAsync({ userName, displayName, role, password })
      toast.success(`"${userName}" kullanıcısı oluşturuldu.`)
      onClose()
    } catch (err) {
      setError(errorText(err))
    }
  }

  return (
    <Modal title="Yeni kullanıcı" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <label>
          Kullanıcı adı
          <input
            value={userName}
            onChange={(e) => setUserName(e.target.value.toLowerCase())}
            pattern="[a-z0-9._-]{3,50}"
            title="3-50 karakter: küçük harf, rakam, nokta, tire, alt çizgi"
            autoComplete="off"
            required
            autoFocus
          />
        </label>
        <label>
          Görünen ad
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={100} required />
        </label>
        <label>
          Rol
          <select value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
            {roles.map((value) => (
              <option key={value} value={value}>
                {roleLabels[value]} — {roleDescriptions[value]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Parola
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            autoComplete="new-password"
            required
          />
          <span className="field-hint">En az 8 karakter; en az bir harf ve bir rakam.</span>
        </label>
        {error && <p className="form-error">{error}</p>}
        <div className="form-actions">
          <button type="button" className="btn" onClick={onClose} disabled={create.isPending}>
            Vazgeç
          </button>
          <button type="submit" className="btn primary" disabled={create.isPending}>
            {create.isPending ? 'Oluşturuluyor…' : 'Oluştur'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function EditUserModal({ user, isSelf, onClose }: { user: ManagedUser; isSelf: boolean; onClose: () => void }) {
  const toast = useToast()
  const update = useUpdateUser()
  const [displayName, setDisplayName] = useState(user.displayName)
  const [role, setRole] = useState<UserRole>(user.role)
  const [isActive, setIsActive] = useState(user.isActive)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      await update.mutateAsync({ id: user.id, displayName, role, isActive })
      toast.success('Kullanıcı güncellendi.')
      onClose()
    } catch (err) {
      setError(errorText(err))
    }
  }

  return (
    <Modal title={`Kullanıcıyı düzenle: ${user.userName}`} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <label>
          Görünen ad
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={100} required autoFocus />
        </label>
        <label>
          Rol
          <select value={role} onChange={(e) => setRole(e.target.value as UserRole)} disabled={isSelf}>
            {roles.map((value) => (
              <option key={value} value={value}>
                {roleLabels[value]} — {roleDescriptions[value]}
              </option>
            ))}
          </select>
        </label>
        <label className="check-row">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} disabled={isSelf} />
          Hesap etkin (devre dışı kullanıcı giriş yapamaz)
        </label>
        {isSelf && <p className="field-hint">Kendi rolünüzü ve hesap durumunuzu değiştiremezsiniz.</p>}
        {error && <p className="form-error">{error}</p>}
        <div className="form-actions">
          <button type="button" className="btn" onClick={onClose} disabled={update.isPending}>
            Vazgeç
          </button>
          <button type="submit" className="btn primary" disabled={update.isPending}>
            Kaydet
          </button>
        </div>
      </form>
    </Modal>
  )
}

function PasswordModal({ user, onClose }: { user: ManagedUser; onClose: () => void }) {
  const toast = useToast()
  const reset = useResetPassword()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      await reset.mutateAsync({ id: user.id, password })
      toast.success('Parola değiştirildi.')
      onClose()
    } catch (err) {
      setError(errorText(err))
    }
  }

  return (
    <Modal title={`Parola sıfırla: ${user.userName}`} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <label>
          Yeni parola
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            autoComplete="new-password"
            required
            autoFocus
          />
          <span className="field-hint">En az 8 karakter; en az bir harf ve bir rakam.</span>
        </label>
        {error && <p className="form-error">{error}</p>}
        <div className="form-actions">
          <button type="button" className="btn" onClick={onClose} disabled={reset.isPending}>
            Vazgeç
          </button>
          <button type="submit" className="btn primary" disabled={reset.isPending}>
            Parolayı değiştir
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function UsersPage() {
  const { user: me } = useAuth()
  const { data, isLoading, error } = useUsers()
  const [dialog, setDialog] = useState<Dialog>(null)
  const close = () => setDialog(null)

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Kullanıcılar</h1>
          <p>Kimlerin hangi yetkiyle oturum açabileceğini yönetin.</p>
        </div>
        <button className="btn primary" onClick={() => setDialog('new')}>
          <PlusIcon size={16} /> Yeni kullanıcı
        </button>
      </div>

      <section className="card table-card">
        {isLoading && (
          <div className="table-state">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="skeleton skeleton-row" />
            ))}
          </div>
        )}
        {error && <p className="form-error">{error.message}</p>}
        {data && (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Kullanıcı</th>
                  <th>Rol</th>
                  <th>Durum</th>
                  <th>Son giriş</th>
                  <th>Oluşturulma</th>
                  <th aria-label="İşlemler"></th>
                </tr>
              </thead>
              <tbody>
                {data.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="cell-name">{user.displayName}</div>
                      <div className="cell-mono">{user.userName}</div>
                    </td>
                    <td>
                      <span className={`role-badge role-${user.role}`}>{roleLabels[user.role]}</span>
                    </td>
                    <td>
                      <span className={`badge ${user.isActive ? 'badge-Active' : 'badge-Inactive'}`}>
                        {user.isActive ? 'Etkin' : 'Devre dışı'}
                      </span>
                    </td>
                    <td>{formatDateTime(user.lastLoginAt)}</td>
                    <td>{formatDateTime(user.createdAt)}</td>
                    <td className="cell-actions-wide">
                      <div className="maint-actions">
                        <button className="btn small" onClick={() => setDialog({ edit: user })}>
                          Düzenle
                        </button>
                        <button className="btn small" onClick={() => setDialog({ password: user })}>
                          Parola sıfırla
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card role-help">
        <h2>Roller</h2>
        <ul>
          {roles.map((role) => (
            <li key={role}>
              <span className={`role-badge role-${role}`}>{roleLabels[role]}</span> {roleDescriptions[role]}
            </li>
          ))}
        </ul>
        <p className="field-hint">
          Yetkiler sunucuda her istekte denetlenir; arayüzde gizlenen düğmeler yalnızca kolaylıktır.
        </p>
      </section>

      {dialog === 'new' && <NewUserModal onClose={close} />}
      {dialog && typeof dialog === 'object' && 'edit' in dialog && (
        <EditUserModal user={dialog.edit} isSelf={dialog.edit.id === me?.id} onClose={close} />
      )}
      {dialog && typeof dialog === 'object' && 'password' in dialog && (
        <PasswordModal user={dialog.password} onClose={close} />
      )}
    </>
  )
}
