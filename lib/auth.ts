/**
 * Valida token chamando API route que valida JWT no servidor usando JWKS
 * Retorna também o payload do JWT se válido
 */
export async function validateToken(): Promise<{
  valid: boolean;
  payload?: unknown;
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
      "https://identity-api.develop.afya.systems/auth/token",
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
 * Obtém todas as claims do token atual
 */
export async function getTokenClaims(): Promise<{
  success: boolean;
  claims?: unknown;
  error?: string;
}> {
  const result = await validateToken();

  if (!result.valid) {
    return { success: false, error: "Token inválido ou expirado" };
  }

  return {
    success: true,
    claims: result.payload,
  };
}
