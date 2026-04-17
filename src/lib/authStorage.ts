const ACCESS = 'vibenow_access_token'
const REFRESH = 'vibenow_refresh_token'

export const authStorage = {
  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS)
  },
  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH)
  },
  setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(ACCESS, accessToken)
    localStorage.setItem(REFRESH, refreshToken)
  },
  clear(): void {
    localStorage.removeItem(ACCESS)
    localStorage.removeItem(REFRESH)
  },
}
