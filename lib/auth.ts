/**
 * Valida token chamando API route que valida JWT no servidor usando JWKS
 * Retorna também o payload do JWT se válido
 */
export async function validateToken(): Promise<{
  valid: boolean;
  payload?: Record<string, unknown>;
}> {
  const accessToken = localStorage.getItem("access_token");

  if (!accessToken) {
    return { valid: false };
  }

  try {
    const response = await fetch("/api/auth/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: accessToken }),
    });

    if (!response.ok) {
      return { valid: false };
    }

    const data = await response.json();
    return {
      valid: data.valid === true,
      payload: data.payload,
    };
  } catch (error) {
    console.error("[AUTH] Erro ao validar token:", error);
    return { valid: false };
  }
}

/**
 * Atualiza o access token usando o refresh token
 * Seguindo a especificação: grant_type: "refresh_token"
 */
export async function refreshAccessToken(): Promise<{
  success: boolean;
  access_token?: string;
  id_token?: string;
  refresh_token?: string;
  error?: string;
}> {
  const refreshToken = localStorage.getItem("refresh_token");

  if (!refreshToken) {
    return { success: false, error: "Refresh token não encontrado" };
  }

  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_AFYA_IDENTITY_API_URL}/auth/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
          client_id: "i9kz2u01dpu2t1n0eh388",
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: errorText };
    }

    const tokens = await response.json();

    // Atualiza os tokens no localStorage
    // Importante: usar o novo refresh_token retornado (rotação de tokens)
    if (tokens.access_token) {
      localStorage.setItem("access_token", tokens.access_token);
    }
    if (tokens.id_token) {
      localStorage.setItem("id_token", tokens.id_token);
    }
    if (tokens.refresh_token) {
      localStorage.setItem("refresh_token", tokens.refresh_token);
    }

    return {
      success: true,
      access_token: tokens.access_token,
      id_token: tokens.id_token,
      refresh_token: tokens.refresh_token,
    };
  } catch (error) {
    console.error("[AUTH] Erro ao renovar token:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}

/**
 * Atualiza o access token usando o refresh token com novos scopes
 * Permite solicitar novos scopes durante a renovação do token
 */
export async function refreshAccessTokenWithScopes(scopes: string): Promise<{
  success: boolean;
  access_token?: string;
  id_token?: string;
  refresh_token?: string;
  error?: string;
}> {
  const refreshToken = localStorage.getItem("refresh_token");

  if (!refreshToken) {
    return { success: false, error: "Refresh token não encontrado" };
  }

  if (!scopes || scopes.trim() === "") {
    return { success: false, error: "Scopes não podem estar vazios" };
  }

  try {
    const response = await fetch(
      "https://identity-api.develop.afya.systems/auth/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
          client_id: "i9kz2u01dpu2t1n0eh388",
          scope: scopes,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: errorText };
    }

    const tokens = await response.json();

    // Atualiza os tokens no localStorage
    // Importante: usar o novo refresh_token retornado (rotação de tokens)
    if (tokens.access_token) {
      localStorage.setItem("access_token", tokens.access_token);
    }
    if (tokens.id_token) {
      localStorage.setItem("id_token", tokens.id_token);
    }
    if (tokens.refresh_token) {
      localStorage.setItem("refresh_token", tokens.refresh_token);
    }

    // Salva os novos scopes usados
    localStorage.setItem("current_scopes", scopes);

    return {
      success: true,
      access_token: tokens.access_token,
      id_token: tokens.id_token,
      refresh_token: tokens.refresh_token,
    };
  } catch (error) {
    console.error("[AUTH] Erro ao renovar token com scopes:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}

/**
 * Decodifica um JWT sem validação (apenas para exibição)
 * Retorna o payload decodificado
 */
export function decodeJWT(token: string): {
  success: boolean;
  payload?: unknown;
  error?: string;
} {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return { success: false, error: "Token inválido: formato incorreto" };
    }

    // Decodifica o payload (segunda parte)
    const payload = parts[1];
    // Adiciona padding se necessário
    const paddedPayload = payload + "=".repeat((4 - (payload.length % 4)) % 4);
    const decoded = atob(paddedPayload.replaceAll("-", "+").replaceAll("_", "/"));
    const parsed = JSON.parse(decoded);

    return {
      success: true,
      payload: parsed,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao decodificar token",
    };
  }
}

/**
 * Valida o ID token chamando API route que valida JWT no servidor usando JWKS
 */
export async function validateIdToken(): Promise<{
  valid: boolean;
  payload?: unknown;
}> {
  const idToken = localStorage.getItem("id_token");

  if (!idToken) {
    return { valid: false };
  }

  try {
    const response = await fetch("/api/auth/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: idToken }),
    });

    if (!response.ok) {
      return { valid: false };
    }

    const data = await response.json();
    return {
      valid: data.valid === true,
      payload: data.payload,
    };
  } catch (error) {
    console.error("[AUTH] Erro ao validar ID token:", error);
    return { valid: false };
  }
}

/**
 * Obtém todas as claims do access token atual
 */
export async function getAccessTokenClaims(): Promise<{
  success: boolean;
  claims?: Record<string, unknown>;
  error?: string;
}> {
  const result = await validateToken();

  if (!result.valid) {
    return { success: false, error: "Access token inválido ou expirado" };
  }

  return {
    success: true,
    claims: result.payload,
  };
}

/**
 * Obtém todas as claims do ID token atual
 */
export async function getIdTokenClaims(): Promise<{
  success: boolean;
  claims?: unknown;
  error?: string;
}> {
  const result = await validateIdToken();

  if (!result.valid) {
    return { success: false, error: "ID token inválido ou expirado" };
  }

  return {
    success: true,
    claims: result.payload,
  };
}

/**
 * Obtém todas as claims do token atual (mantido para compatibilidade)
 * @deprecated Use getAccessTokenClaims ou getIdTokenClaims
 */
export async function getTokenClaims(): Promise<{
  success: boolean;
  claims?: unknown;
  error?: string;
}> {
  return getAccessTokenClaims();
}

/**
 * Obtém todos os tokens armazenados
 */
export function getStoredTokens(): {
  access_token: string | null;
  id_token: string | null;
  refresh_token: string | null;
} {
  return {
    access_token: localStorage.getItem("access_token"),
    id_token: localStorage.getItem("id_token"),
    refresh_token: localStorage.getItem("refresh_token"),
  };
}
