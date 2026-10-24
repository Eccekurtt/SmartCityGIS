import type { LoginResponse, SessionUser } from '../types'
import { jsonBody, request } from './client'

export function login(userName: string, password: string) {
  return request<LoginResponse>('/api/auth/login', jsonBody('POST', { userName, password }))
}

export function getMe() {
  return request<SessionUser>('/api/auth/me')
}
