import { jwtVerify, createRemoteJWKSet } from "jose";

const JWKS_URL = "https://business-logic-hub.develop.afya.systems/.well-known/jwks.json";

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJWKS() {
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(JWKS_URL));
  }
  return jwks;
}

export async function validateJWT(token: string): Promise<{
  valid: boolean;
  payload?: unknown;
  error?: string;
}> {
  try {
    const JWKS = getJWKS();
    const { payload } = await jwtVerify(token, JWKS);
    return { valid: true, payload };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Token inválido",
    };
  }
}
