export interface LoginResponse {
  success: boolean;
  message: string;
  data: UsuarioAuthData | null;
}

export interface TokenParData {
  token: string;
  token_type: string;
  token_expires_at?: string;
  token_expires_in?: number;
  refresh_token: string;
  refresh_token_type: string;
  refresh_token_expires_at?: string;
  refresh_token_expires_in?: number;
}

export interface UsuarioAuthData extends TokenParData {
  id: number;
  username: string;
  nombre: string;
  email: string;
  roles: string[];
}

export interface RefreshTokenResponse {
  success: boolean;
  message: string;
  data: TokenParData | null;
}

export interface LoginResult {
  success: boolean;
  message?: string;
}
