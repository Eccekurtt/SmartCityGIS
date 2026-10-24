import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createUser, getAudit, getUsers, resetPassword, updateUser } from '../api/admin'
import type { NewUser } from '../api/admin'
import type { AuditFilters, UserRole } from '../types'

export function useUsers() {
  return useQuery({ queryKey: ['users'], queryFn: ({ signal }) => getUsers(signal) })
}

export function useCreateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: NewUser) => createUser(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...input }: { id: number; displayName: string; role: UserRole; isActive: boolean }) =>
      updateUser(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })
}

export function useResetPassword() {
  return useMutation({ mutationFn: ({ id, password }: { id: number; password: string }) => resetPassword(id, password) })
}

export function useAudit(filters: AuditFilters, page: number, pageSize: number) {
  return useQuery({
    queryKey: ['audit', filters, page, pageSize],
    queryFn: ({ signal }) => getAudit(filters, page, pageSize, signal),
    placeholderData: keepPreviousData,
  })
}
