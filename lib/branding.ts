/**
 * Interface para os dados de branding retornados pela API
 */
export interface BrandingData {
  clientName: string;
  branding: {
    logo: string;
    backgroundUrl: string;
    faviconUrl: string;
    primaryColor: string;
    secondaryColor: string;
  };
  carousel: Array<{
    imageUrl: string;
    title: string;
    description: string;
  }>;
  scope: string;
}

/**
 * Busca os dados de branding do cliente
 * Endpoint: GET /auth/authorization-info?authorization_id=XXX
 */
export async function fetchBrandingData(authorizationId: string): Promise<{
  success: boolean;
  data?: BrandingData;
  error?: string;
}> {
  const accessToken = localStorage.getItem("access_token");

  if (!accessToken) {
    return { success: false, error: "Token de acesso não encontrado" };
  }

  if (!authorizationId) {
    return { success: false, error: "authorization_id é obrigatório" };
  }

  try {
    const url = new URL("https://business-logic-hub.develop.afya.systems/auth/authorization-info");
    url.searchParams.set("authorization_id", authorizationId);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `Erro ao buscar branding: ${errorText}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      data: data as BrandingData,
    };
  } catch (error) {
    console.error("[BRANDING] Erro ao buscar dados:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}

/**
 * Salva os dados de branding no localStorage
 */
export function saveBrandingData(data: BrandingData): void {
  localStorage.setItem("branding_data", JSON.stringify(data));
}

/**
 * Obtém os dados de branding do localStorage
 */
export function getBrandingData(): BrandingData | null {
  const stored = localStorage.getItem("branding_data");
  if (!stored) return null;
  try {
    return JSON.parse(stored) as BrandingData;
  } catch {
    return null;
  }
}

