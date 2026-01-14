"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { validateIdToken, validateToken } from "@/lib/auth";

interface UserClaims {
  sub?: string;
  email?: string;
  name?: string;
  preferred_username?: string;
  [key: string]: unknown;
}

export function useAuth(requireAuth = true) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userClaims, setUserClaims] = useState<UserClaims | null>(null);

  const redirectToLogin = useCallback(() => {
    if (requireAuth) {
      router.push("/");
    }
  }, [requireAuth, router]);

  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      // Pequeno delay para evitar múltiplas chamadas simultâneas
      await new Promise((resolve) => setTimeout(resolve, 100));

      if (!isMounted) return;

      const accessToken = localStorage.getItem("access_token");
      const idToken = localStorage.getItem("id_token");
      
      if (!accessToken) {
        if (isMounted) {
          setIsLoading(false);
          redirectToLogin();
        }
        return;
      }

      try {
        // Valida o access token para verificar autenticação
        const accessTokenResult = await validateToken();
        
        if (!isMounted) return;

        setIsAuthenticated(accessTokenResult.valid);
        
        // Se temos ID token, usa ele para obter as claims do usuário
        // Caso contrário, tenta usar o access token (fallback)
        if (idToken && accessTokenResult.valid) {
          const idTokenResult = await validateIdToken();
          if (idTokenResult.valid && idTokenResult.payload) {
            setUserClaims(idTokenResult.payload as UserClaims);
          } else if (accessTokenResult.payload) {
            // Fallback para access token se ID token não estiver disponível
            setUserClaims(accessTokenResult.payload as UserClaims);
          }
        } else if (accessTokenResult.valid && accessTokenResult.payload) {
          setUserClaims(accessTokenResult.payload as UserClaims);
        }

        setIsLoading(false);

        if (!accessTokenResult.valid && requireAuth) {
          localStorage.removeItem("access_token");
          localStorage.removeItem("id_token");
          localStorage.removeItem("refresh_token");
          redirectToLogin();
        }
      } catch (error) {
        console.error("[AUTH] Erro ao verificar autenticação:", error);
        if (isMounted) {
          setIsLoading(false);
          redirectToLogin();
        }
      }
    }

    // Usa timeout para evitar chamadas muito rápidas
    const timeoutId = setTimeout(() => {
      checkAuth();
    }, 0);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [requireAuth, redirectToLogin]);

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("id_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("pkce_verifier");
    localStorage.removeItem("current_scopes");
    router.push("/");
  };

  return {
    isAuthenticated,
    isLoading,
    userClaims,
    logout,
  };
}
