"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { validateToken } from "@/lib/auth";

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
      
      if (!accessToken) {
        if (isMounted) {
          setIsLoading(false);
          redirectToLogin();
        }
        return;
      }

      try {
        const result = await validateToken();

        if (!isMounted) return;

        setIsAuthenticated(result.valid);
        setIsLoading(false);

        if (result.valid && result.payload) {
          setUserClaims(result.payload as UserClaims);
        }

        if (!result.valid && requireAuth) {
          localStorage.removeItem("access_token");
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
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("pkce_verifier");
    router.push("/");
  };

  return {
    isAuthenticated,
    isLoading,
    userClaims,
    logout,
  };
}
