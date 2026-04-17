import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { authStorage } from '@/lib/authStorage'
import { subscribeSessionInvalidated } from '@/lib/authSession'
import { getApiBaseUrl } from '@/lib/apiBaseUrl'
import {
  AuthApiError,
  fetchMe,
  loginWithEmail,
  refreshTokens,
  registerEstablishmentAndOwner,
} from '@/services/authApi'
import type { AuthAccess, RegisterEstablishmentAndOwnerBody, User } from '@/types/auth'

function defaultEstablishmentId(access: AuthAccess | null): number | null {
  if (!access) return null
  if (access.ownedEstablishments.length > 0) return access.ownedEstablishments[0].id
  if (access.employments.length > 0) return access.employments[0].establishmentId
  return null
}

function pickActiveEstablishmentId(
  access: AuthAccess | null,
  fallback: number | null,
): number | null {
  return defaultEstablishmentId(access) ?? fallback
}

function canAccessEstablishment(access: AuthAccess | null, establishmentId: number): boolean {
  if (!access) return false
  if (access.ownedEstablishments.some((e) => e.id === establishmentId)) return true
  if (access.employments.some((e) => e.establishmentId === establishmentId)) return true
  return false
}

interface AuthState {
  user: User | null
  access: AuthAccess | null
  activeEstablishmentId: number | null
  isReady: boolean
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>
  registerEstablishmentAndOwner: (data: RegisterEstablishmentAndOwnerBody) => Promise<void>
  /** Só aceita IDs a que o utilizador tem acesso (dono ou emprego). */
  selectEstablishment: (establishmentId: number) => void
  logout: () => void
  error: string | null
  clearError: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function loadSession(
  accessToken: string,
  refresh: string,
): Promise<{ user: User; access: AuthAccess; accessToken: string; refreshToken: string } | null> {
  try {
    const me = await fetchMe(accessToken)
    return {
      user: me.user,
      access: me.access,
      accessToken,
      refreshToken: refresh,
    }
  } catch (e) {
    if (e instanceof AuthApiError && e.status === 401 && refresh) {
      try {
        const next = await refreshTokens(refresh)
        authStorage.setTokens(next.accessToken, next.refreshToken)
        const me = await fetchMe(next.accessToken)
        return {
          user: me.user,
          access: me.access,
          accessToken: next.accessToken,
          refreshToken: next.refreshToken,
        }
      } catch {
        authStorage.clear()
        return null
      }
    }
    if (e instanceof AuthApiError && e.status === 401) {
      authStorage.clear()
      return null
    }
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [access, setAccess] = useState<AuthAccess | null>(null)
  const [activeEstablishmentId, setActiveEstablishmentId] = useState<number | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    return subscribeSessionInvalidated(() => {
      setUser(null)
      setAccess(null)
      setActiveEstablishmentId(null)
      setError(null)
    })
  }, [])

  useEffect(() => {
    let cancelled = false

    async function hydrate() {
      if (!getApiBaseUrl()) {
        if (!cancelled) {
          setUser(null)
          setAccess(null)
          setActiveEstablishmentId(null)
          setIsReady(true)
        }
        return
      }

      const accessToken = authStorage.getAccessToken()
      const refresh = authStorage.getRefreshToken()

      if (!accessToken || !refresh) {
        if (!cancelled) setIsReady(true)
        return
      }

      const session = await loadSession(accessToken, refresh)
      if (cancelled) return
      if (session) {
        setUser(session.user)
        setAccess(session.access)
        setActiveEstablishmentId(pickActiveEstablishmentId(session.access, null))
      } else {
        setUser(null)
        setAccess(null)
        setActiveEstablishmentId(null)
      }
      setIsReady(true)
    }

    void hydrate()
    return () => {
      cancelled = true
    }
  }, [])

  const clearError = useCallback(() => setError(null), [])

  const login = useCallback(async (email: string, password: string) => {
    setError(null)
    try {
      const tokens = await loginWithEmail(email, password)
      authStorage.setTokens(tokens.accessToken, tokens.refreshToken)
      const session = await loadSession(tokens.accessToken, tokens.refreshToken)
      if (!session) {
        authStorage.clear()
        throw new Error('Não foi possível carregar o perfil. Verifique a ligação à API.')
      }
      setUser(session.user)
      setAccess(session.access)
      setActiveEstablishmentId(pickActiveEstablishmentId(session.access, null))
    } catch (e) {
      const msg =
        e instanceof AuthApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Erro ao iniciar sessão'
      setError(msg)
      throw e
    }
  }, [])

  const registerEstablishmentAndOwnerFn = useCallback(
    async (data: RegisterEstablishmentAndOwnerBody) => {
      setError(null)
      try {
        const res = await registerEstablishmentAndOwner(data)
        authStorage.setTokens(res.accessToken, res.refreshToken)
        const session = await loadSession(res.accessToken, res.refreshToken)
        if (!session) {
          setUser(res.user)
          setAccess(null)
          setActiveEstablishmentId(res.establishmentId)
          return
        }
        setUser(session.user)
        setAccess(session.access)
        setActiveEstablishmentId(pickActiveEstablishmentId(session.access, res.establishmentId))
      } catch (e) {
        const msg =
          e instanceof AuthApiError
            ? e.message
            : e instanceof Error
              ? e.message
              : 'Erro no cadastro'
        setError(msg)
        throw e
      }
    },
    [],
  )

  const selectEstablishment = useCallback(
    (establishmentId: number) => {
      if (canAccessEstablishment(access, establishmentId)) {
        setActiveEstablishmentId(establishmentId)
      }
    },
    [access],
  )

  const logout = useCallback(() => {
    authStorage.clear()
    setUser(null)
    setAccess(null)
    setActiveEstablishmentId(null)
    setError(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      access,
      activeEstablishmentId,
      isReady,
      login,
      registerEstablishmentAndOwner: registerEstablishmentAndOwnerFn,
      selectEstablishment,
      logout,
      error,
      clearError,
    }),
    [
      user,
      access,
      activeEstablishmentId,
      isReady,
      login,
      registerEstablishmentAndOwnerFn,
      selectEstablishment,
      logout,
      error,
      clearError,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider')
  }
  return ctx
}
