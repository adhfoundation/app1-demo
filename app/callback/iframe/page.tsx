"use client";

import { useEffect } from "react";

/**
 * Página de callback específica para iframe
 * Esta página NUNCA redireciona - apenas envia o código via postMessage
 * Isso evita o erro de bloqueio do navegador ao tentar redirecionar de HTTPS para localhost
 */
export default function IframeCallbackPage() {
  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");
    const errorDescription = url.searchParams.get("error_description");

    // Se houver erro, envia via postMessage
    if (error) {
      console.error("[IFRAME-CALLBACK] Erro recebido:", error, errorDescription);
      if (window.parent) {
        window.parent.postMessage(
          {
            type: "oauth-error",
            error,
            error_description: errorDescription,
          },
          window.location.origin
        );
      }
      
      // Mostra mensagem de erro no iframe
      document.body.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; height: 100vh; flex-direction: column; font-family: system-ui; padding: 20px; text-align: center;">
          <div style="color: #dc2626; font-size: 18px; margin-bottom: 10px; font-weight: 600;">✕ Erro na autenticação</div>
          <div style="color: #666; font-size: 14px; max-width: 400px;">${errorDescription || error}</div>
        </div>
      `;
      return;
    }

    // Se tiver código, envia via postMessage
    if (code && window.parent) {
      try {
        window.parent.postMessage(
          {
            type: "oauth-callback",
            code,
            state,
          },
          window.location.origin // Envia para o mesmo origin (localhost:3000)
        );
        
        // Não mostra nada - o iframe será fechado imediatamente pelo parent
        // Deixa o body vazio para transição suave
        document.body.style.margin = "0";
        document.body.style.padding = "0";
        document.body.style.backgroundColor = "transparent";
      } catch (error) {
        console.error("[IFRAME-CALLBACK] Erro ao enviar postMessage:", error);
        document.body.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: center; height: 100vh; flex-direction: column; font-family: system-ui; padding: 20px; text-align: center;">
            <div style="color: #dc2626; font-size: 18px; margin-bottom: 10px; font-weight: 600;">✕ Erro ao comunicar</div>
            <div style="color: #666; font-size: 14px;">Por favor, tente novamente.</div>
          </div>
        `;
      }
      return;
    }

    // Se não tiver código nem erro, mostra mensagem de espera
    document.body.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 100vh; flex-direction: column; font-family: system-ui;">
        <div style="color: #666; font-size: 16px;">Processando autenticação...</div>
      </div>
    `;
  }, []);

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "system-ui" }}>
      <div style={{ color: "#666", fontSize: "16px" }}>Processando autenticação...</div>
    </div>
  );
}
