"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);


  // Função para verificar autenticação
  const checkAuth = useCallback(async () => {
    setIsCheckingAuth(true);
    const accessToken = localStorage.getItem("access_token");
    
    if (!accessToken) {
      setIsAuthenticated(false);
      setIsCheckingAuth(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: accessToken }),
      });

      if (response.ok) {
        const data = await response.json();
        const isValid = data.valid === true;
        setIsAuthenticated(isValid);
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error("[AUTH] Erro ao verificar autenticação:", error);
      setIsAuthenticated(false);
    } finally {
      setIsCheckingAuth(false);
    }
  }, []);

  // Verifica autenticação ao carregar
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("id_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("pkce_verifier");
    localStorage.removeItem("current_scopes");
    setIsAuthenticated(false);
    router.push("/");
  }, [router]);

  // Escuta evento de sucesso do widget
  useEffect(() => {
    const handleSuccess = () => {
      checkAuth();
    };

    window.addEventListener("afya-sso-success", handleSuccess);
    return () => {
      window.removeEventListener("afya-sso-success", handleSuccess);
    };
  }, [checkAuth]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="container mx-auto px-4 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Afya SSO Demo
            </span>
          </div>
          {!isCheckingAuth && isAuthenticated ? (
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500 text-white rounded-lg shadow hover:bg-red-600 transition font-medium"
            >
              Sair
            </button>
          ) : null}
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Autenticação AFYA
          </h1>
          <p className="text-base text-gray-600 mb-8 max-w-2xl mx-auto">
            Demonstração de integração com Single Sign-On (SSO) da Afya.
            Autenticação segura usando PKCE e validação JWT com JWKS.
          </p>

          {/* Conteúdo Bloqueado - Mostra quando NÃO está autenticado */}
          {!isCheckingAuth && !isAuthenticated && (
            <div className="mb-8 max-w-2xl mx-auto transition-all duration-500">
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8 border-2 border-dashed border-gray-300 relative overflow-hidden">
                {/* Overlay com blur */}
                <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10"></div>
                
                {/* Conteúdo bloqueado */}
                <div className="relative z-20 text-center">
                  <div className="w-14 h-14 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center shadow-lg">
                    <svg className="w-7 h-7 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-bold text-gray-700 mb-2">Conteúdo Bloqueado</h2>
                  <p className="text-sm text-gray-600 mb-4">
                    Faça login para acessar este conteúdo exclusivo.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Conteúdo Real - Mostra quando está autenticado */}
          {!isCheckingAuth && isAuthenticated && (
            <div className="mb-8 max-w-2xl mx-auto animate-fadeIn transition-all duration-500">
              <div className="bg-gradient-to-br from-pink-50 via-rose-50 to-fuchsia-50 rounded-2xl p-8 border-2 border-pink-200 shadow-lg">
                <div className="text-center">
                  <div className="w-14 h-14 mx-auto mb-4 bg-gradient-to-br from-pink-200 to-rose-200 rounded-full flex items-center justify-center shadow-md animate-fadeIn">
                    <span className="text-2xl">☕</span>
                  </div>
                  
                  <div className="mt-4 p-6 bg-white rounded-xl shadow-lg border border-pink-100">
                    <h3 className="text-lg font-bold text-pink-700 mb-4">Curiosidade do dia</h3>
                    
                    <p className="text-sm text-gray-700 mb-5 leading-relaxed">
                      Você sabia que café em excesso faz mal? <strong>Exceto se você for dev!</strong> 😄
                    </p>
                    
                    <p className="text-xs text-gray-600 mb-5 leading-relaxed">
                      Agora você tem acesso completo aos recursos da plataforma Afya! 
                      Nossos devs trabalharam até altas horas (com muito café e energético) 
                      para garantir que tudo funcione perfeitamente. Explore ferramentas de gestão, 
                      acompanhamento de pacientes e muito mais!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {/* Seção de Login via Iframe - Versão Simplificada */}
            <div>
              <h2 className="text-lg font-bold mb-3 text-center">Login via Iframe</h2>
              <p className="text-xs text-gray-600 mb-4 text-center">
                Login via iframe - Necessário uso de HTTPS p/ funcionar.
              </p>

              {/* Widget SSO Simplificado */}
              <div className="mt-6 max-w-xl mx-auto">
                <div 
                  id="afya-sso-iframe"
                  data-client-id="i9kz2u01dpu2t1n0eh388"
                  data-scopes="openid profile email offline_access"
                  data-mode="login"
                  data-width="100%"
                  data-height="500px"
                  className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden"
                  style={{ height: '500px', padding: '0' }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="mt-20 grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
          <div className="bg-white/80 backdrop-blur-sm p-5 rounded-2xl shadow-lg border border-gray-100">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-base font-bold mb-1">Segurança</h3>
            <p className="text-sm text-gray-600">
              Validação JWT no servidor usando JWKS. Tokens assinados e verificados localmente.
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm p-5 rounded-2xl shadow-lg border border-gray-100">
            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center mb-3">
              <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-base font-bold mb-1">Performance</h3>
            <p className="text-sm text-gray-600">
              Cache inteligente de validação. Sem chamadas desnecessárias ao SSO.
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm p-5 rounded-2xl shadow-lg border border-gray-100">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mb-3">
              <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-base font-bold mb-1">Confiável</h3>
            <p className="text-sm text-gray-600">
              Integração com SSO da Afya. Padrões OAuth 2.0 e OpenID Connect.
            </p>
          </div>
        </div>

        {/* Tech Stack */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-xl font-bold text-center mb-8">Tecnologias</h2>
          <div className="bg-white/80 backdrop-blur-sm p-5 rounded-2xl shadow-lg border border-gray-100">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-blue-600 mb-1">OAuth 2.0</div>
                <div className="text-xs text-gray-600">Autorização</div>
              </div>
              <div>
                <div className="text-lg font-bold text-indigo-600 mb-1">PKCE</div>
                <div className="text-xs text-gray-600">Segurança</div>
              </div>
              <div>
                <div className="text-lg font-bold text-purple-600 mb-1">JWT</div>
                <div className="text-xs text-gray-600">Tokens</div>
              </div>
              <div>
                <div className="text-lg font-bold text-pink-600 mb-1">JWKS</div>
                <div className="text-xs text-gray-600">Validação</div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-5 mt-12 border-t border-gray-200">
        <div className="text-center text-gray-600">
          {/* Footer vazio - texto movido para acima */}
        </div>
      </footer>
    </div>
  );
}
