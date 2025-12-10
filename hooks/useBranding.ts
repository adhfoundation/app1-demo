"use client";

import { useState } from "react";
import {
  fetchBrandingData,
  saveBrandingData,
  type BrandingData,
} from "@/lib/branding";

export function useBranding() {
  const [branding, setBranding] = useState<BrandingData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBranding = async (authorizationId: string) => {
    if (!authorizationId || authorizationId.trim() === "") {
      setError("authorization_id não pode estar vazio");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchBrandingData(authorizationId.trim());
      if (result.success && result.data) {
        saveBrandingData(result.data);
        setBranding(result.data);
        setError(null);
      } else {
        setError(result.error || "Erro ao carregar branding");
        setBranding(null);
      }
    } catch (err) {
      console.error("[BRANDING] Erro ao buscar dados:", err);
      setError(err instanceof Error ? err.message : "Erro desconhecido");
      setBranding(null);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    branding,
    isLoading,
    error,
    loadBranding,
  };
}

