"use client";

import { useEffect } from "react";

export default function CallbackPage() {
  useEffect(() => {
    async function run() {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");

      console.log("[CALLBACK] Recebido code:", code);

      const verifier = localStorage.getItem("pkce_verifier");
      if (!verifier) {
        console.error("Nenhum PKCE verifier encontrado no localStorage");
        return;
      }

      try {
        const response = await fetch(
          "https://business-logic-hub.sso-dev.afya.systems/auth/token",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              grant_type: "authorization_code",
              client_id: "i9kz2u01dpu2t1n0eh388",
              redirect_uri: "http://localhost:3000/callback",
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
        console.log("[CALLBACK] Tokens:", tokens);

        //guarda no storage
        localStorage.setItem("access_token", tokens.access_token);
        if (tokens.id_token) {
          localStorage.setItem("id_token", tokens.id_token);
        }
        localStorage.setItem("refresh_token", tokens.refresh_token);

        //redireciona p aplicação
        window.location.href = "/dashboard";
      } catch (err) {
        console.error("[CALLBACK] Fetch ERROR:", err);
      }
    }

    run();
  }, []);

  return <div>Finalizando autenticação...</div>;
}
