"use client";

import { useCallback } from "react";

function generateCodeVerifier() {
  const array = new Uint8Array(64);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

async function generateCodeChallenge(verifier: string) {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

export default function LandingPage() {
  const startAuth = useCallback(async () => {
    try {
      const verifier = generateCodeVerifier();
      localStorage.setItem("pkce_verifier", verifier);

      const challenge = await generateCodeChallenge(verifier);

      const params = new URLSearchParams({
        client_id: "i9kz2u01dpu2t1n0eh388",
        redirect_uri: "http://localhost:3000/callback",
        response_type: "code",
        scope: "openid profile email offline_access",
        state: "abc123",
        code_challenge: challenge,
        code_challenge_method: "S256",
        prompt: "login",
      });

      const url =
        `${process.env.NEXT_PUBLIC_AFYA_IDENTITY_API_URL}/auth/authorize?` +
        params.toString();

      window.location.href = url;
    } catch (err) {
      console.error("[PKCE] ERROR:", err);
      alert("Erro ao iniciar o fluxo de autenticação.");
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">A</span>
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Afya SSO Demo
            </span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Autenticação Segura
            <br />
            com SSO OAuth 2.0
          </h1>
          <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
            Demonstração profissional de integração com Single Sign-On da Afya.
            Autenticação segura usando PKCE e validação JWT com JWKS.
          </p>

          <button
            onClick={startAuth}
            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
          >
            Entrar com SSO
          </button>
        </div>

        {/* Features */}
        <div className="mt-32 grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-gray-100">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2">Segurança</h3>
            <p className="text-gray-600">
              Validação JWT no servidor usando JWKS. Tokens assinados e verificados localmente.
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-gray-100">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2">Performance</h3>
            <p className="text-gray-600">
              Cache inteligente de validação. Sem chamadas desnecessárias ao SSO.
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-gray-100">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2">Confiável</h3>
            <p className="text-gray-600">
              Integração com SSO da Afya. Padrões OAuth 2.0 e OpenID Connect.
            </p>
          </div>
        </div>

        {/* Tech Stack */}
        <div className="mt-32 max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Tecnologias</h2>
          <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-gray-100">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600 mb-2">OAuth 2.0</div>
                <div className="text-sm text-gray-600">Autorização</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-indigo-600 mb-2">PKCE</div>
                <div className="text-sm text-gray-600">Segurança</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600 mb-2">JWT</div>
                <div className="text-sm text-gray-600">Tokens</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-pink-600 mb-2">JWKS</div>
                <div className="text-sm text-gray-600">Validação</div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-6 py-8 mt-20 border-t border-gray-200">
        <div className="text-center text-gray-600">
          <p>Demonstração de integração SSO - Afya Systems</p>
        </div>
      </footer>
    </div>
  );
}
