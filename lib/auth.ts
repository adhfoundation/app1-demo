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
 */
export async function refreshAccessToken(): Promise<{
  success: boolean;
  access_token?: string;
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
          client_id: "i9kz2u01dpu2t1n0eh388",
          refresh_token: refreshToken,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: errorText };
    }

    const tokens = await response.json();
    
    // Atualiza os tokens no localStorage
    if (tokens.access_token) {
      localStorage.setItem("access_token", tokens.access_token);
    }
    if (tokens.refresh_token) {
      localStorage.setItem("refresh_token", tokens.refresh_token);
    }

    return {
      success: true,
      access_token: tokens.access_token,
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
