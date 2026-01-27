"use client";

import { useEffect } from "react";

export default function CallbackPage() {
  useEffect(() => {
    async function run() {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");

      // Verifica se está dentro de um iframe
      const isInIframe = window.self !== window.top;
      
      if (isInIframe && code) {
        // Envia o código para o parent via postMessage
        if (window.parent) {
          window.parent.postMessage(
            {
              type: "oauth-callback",
              code,
              state,
            },
            window.location.origin // Envia para o mesmo origin (localhost:3000)
          );
        }
        return; // Não processa o código aqui, o parent vai fazer isso
      }

      // CRÍTICO: Tenta obter o verifier da config do widget primeiro (fonte mais confiável)
      // Ordem de prioridade: config > sessionStorage > localStorage
      let verifier = (window as any).ssoWidgetConfig?.codeVerifier;
      
      if (!verifier) {
        verifier = sessionStorage.getItem("code_verifier");
      }
      
      if (!verifier) {
        verifier = localStorage.getItem("pkce_verifier");
      }
      
      // Tenta obter do widget se disponível
      if (!verifier && (window as any).ssoWidget) {
        verifier = (window as any).ssoWidget?.codeVerifier || 
                   (window as any).ssoWidget?.getCodeVerifier?.();
      }
      
      if (!verifier) {
        console.error("[CALLBACK] Nenhum PKCE verifier encontrado. Verificando storages:");
        console.error("[CALLBACK] - sessionStorage:", sessionStorage.getItem("code_verifier") ? "tem valor" : "vazio");
        console.error("[CALLBACK] - localStorage:", localStorage.getItem("pkce_verifier") ? "tem valor" : "vazio");
        console.error("[CALLBACK] - ssoWidgetConfig:", (window as any).ssoWidgetConfig?.codeVerifier ? "tem valor" : "não existe");
        alert("Erro: Code verifier não encontrado. Tente fazer login novamente.");
        window.location.href = "/";
        return;
      }

      try {
        // Detecta a origem atual dinamicamente (funciona com localhost, ngrok, ou produção)
        const currentOrigin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
        const redirectUri = `${currentOrigin}/callback`;
        
        const response = await fetch(
          "https://identity-api.develop.afya.systems/auth/token",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              grant_type: "authorization_code",
              client_id: "i9kz2u01dpu2t1n0eh388",
              redirect_uri: redirectUri, // Usa a origem atual dinamicamente
              code,
              code_verifier: verifier,
            }),
          }
        );

        if (!response.ok) {
          const text = await response.text();
          console.error("[CALLBACK] Erro ao obter tokens:", text);
          alert("Erro ao obter tokens. Verifique se o SSO está configurado corretamente com chave privada RSA para RS256.");
          window.location.href = "/";
          return;
        }

        const tokens = await response.json();

        //guarda no storage
        localStorage.setItem("access_token", tokens.access_token);
        if (tokens.id_token) {
          localStorage.setItem("id_token", tokens.id_token);
        }
        localStorage.setItem("refresh_token", tokens.refresh_token);

        //redireciona p aplicação
        window.location.href = "/";
      } catch (err) {
        console.error("[CALLBACK] Fetch ERROR:", err);
      }
    }

    run();
  }, []);

  return <div>Finalizando autenticação...</div>;
}
