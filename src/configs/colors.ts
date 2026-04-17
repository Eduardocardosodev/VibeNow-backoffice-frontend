/**
 * Tokens de cor alinhados ao mobile (`constants/Theme.ts`).
 * Use em JS/TS (ex. charts, estilos inline). No CSS, prefira as variáveis em `styles/tokens.css`.
 */
export const VibeNowColors = {
  primary: '#00C853',
  primaryDark: '#009624',
  background: '#0A0A0A',
  surface: '#141414',
  border: '#2A2A2A',
  text: '#FFFFFF',
  textSecondary: '#9E9E9E',
  error: '#FF5252',
  black: '#000000',
  white: '#FFFFFF',
} as const

export type VibeNowColorToken = keyof typeof VibeNowColors
