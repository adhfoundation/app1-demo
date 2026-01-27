"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";

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

// Tamanhos sugeridos para o iframe
type IframeSize = "small" | "medium" | "large";

interface IframeDimensions {
  width: number;
  height: number;
  maxWidth: string;
}

const IFRAME_SIZES: Record<IframeSize, IframeDimensions> = {
  small: {
    width: 400,
    height: 500,
    maxWidth: "max-w-md",
  },
  medium: {
    width: 600,
    height: 550,
    maxWidth: "max-w-2xl",
  },
  large: {
    width: 800,
    height: 650,
    maxWidth: "max-w-4xl",
  },
};

export default function LandingPage() {
  const router = useRouter();
  const [widgetSize, setWidgetSize] = useState<"small" | "medium" | "large">("medium");
  const [iframeSize, setIframeSize] = useState<"small" | "medium" | "large">("medium");
  const [showIframe, setShowIframe] = useState(false);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [iframeVerifier, setIframeVerifier] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isLocalhost, setIsLocalhost] = useState(false);
  const iframeStartedRef = useRef(false);

  // Atualiza o tamanho do container quando widgetSize mudar
  useEffect(() => {
    const container = document.getElementById("sso-widget-container");
    const wrapper = container?.parentElement;
    
    if (!container) return;
    
    const sizeClasses = {
      small: "min-h-[150px] max-w-md mx-auto p-4",
      medium: "min-h-[200px] w-full px-6 py-4",
      large: "min-h-[300px] w-full p-4",
    };
    container.className = `flex justify-center items-start transition-all duration-300 ${sizeClasses[widgetSize]}`;
    
    // Aplica estilos inline para garantir que o conteúdo interno respeite o tamanho
    if (widgetSize === "small") {
      container.style.maxWidth = "28rem"; // max-w-md
      container.style.width = "auto";
      container.style.marginLeft = "auto";
      container.style.marginRight = "auto";
    } else if (widgetSize === "medium") {
      container.style.maxWidth = "100%";
      container.style.width = "100%";
      container.style.marginLeft = "0";
      container.style.marginRight = "0";
    } else { // large
      container.style.maxWidth = "100vw";
      container.style.width = "100vw";
      container.style.marginLeft = "0";
      container.style.marginRight = "0";
    }
    
    // Ajusta o wrapper para ocupar toda a tela quando for grande
    if (wrapper) {
      if (widgetSize === "large") {
        wrapper.className = "w-screen relative left-1/2 -translate-x-1/2";
      } else {
        wrapper.className = "";
      }
    }
    
    // Observa mudanças no conteúdo do container (quando o widget renderizar)
    const observer = new MutationObserver(() => {
      // Reaplica estilos quando o conteúdo mudar
      const children = container.querySelectorAll("*");
      children.forEach((child: Element) => {
        const htmlChild = child as HTMLElement;
        if (htmlChild && htmlChild.style) {
          htmlChild.style.maxWidth = "100%";
          if (widgetSize !== "small") {
            htmlChild.style.width = "100%";
          }
        }
      });
    });
    
    observer.observe(container, {
      childList: true,
      subtree: true,
    });
    
    return () => observer.disconnect();
  }, [widgetSize]);

  // Verifica se estamos no localhost (apenas no cliente)
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsLocalhost(window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
    }
  }, []);

  // Verifica autenticação ao carregar e quando tokens são salvos
  useEffect(() => {
    async function checkAuth() {
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
    }

    checkAuth();
    
    // Escuta evento quando tokens são salvos pelo widget
    const handleTokensSaved = () => {
      checkAuth();
    };
    
    window.addEventListener("auth-tokens-saved", handleTokensSaved);
    
    return () => {
      window.removeEventListener("auth-tokens-saved", handleTokensSaved);
    };
  }, []);

  // Configura o widget SSO ANTES de carregar o script
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Detecta a origem atual (funciona com localhost, ngrok, ou produção)
    const currentOrigin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    
    // Função auxiliar para salvar tokens e atualizar estado
    const saveTokensAndUpdateAuth = (tokens: any) => {
      if (!tokens) {
        console.error("[WIDGET] Tokens são null/undefined!");
        return;
      }
      
      if (tokens.access_token) {
        localStorage.setItem("access_token", tokens.access_token);
      } else {
        console.warn("[WIDGET] ⚠ Access token não encontrado nos tokens recebidos");
      }
      
      if (tokens.id_token) {
        localStorage.setItem("id_token", tokens.id_token);
      }
      
      if (tokens.refresh_token) {
        localStorage.setItem("refresh_token", tokens.refresh_token);
      }
      
      // Esconde o widget
      const container = document.getElementById("sso-widget-container");
      const wrapper = container?.parentElement;
      if (container) {
        container.style.display = "none";
      }
      if (wrapper) {
        wrapper.style.display = "none";
      }
      
      // Atualiza estado e dispara evento
      setIsAuthenticated(true);
      
      window.dispatchEvent(new CustomEvent("auth-tokens-saved"));
    };
    
    // Configuração do widget (deve ser feita ANTES de carregar o script)
    (window as any).ssoWidgetConfig = {
      clientId: "i9kz2u01dpu2t1n0eh388",
      redirectUri: `${currentOrigin}/callback`, // Usa a origem atual automaticamente
      apiBaseUrl: "https://identity-api.develop.afya.systems", // URL base da API SSO (sobrescreve o padrão login-sso)
      transparentMode: true, // Troca código por tokens automaticamente
      containerId: "sso-widget-container", // ID do container onde o widget será renderizado
      onTokensReceived: (tokens: any) => {
        saveTokensAndUpdateAuth(tokens);
      },
      onError: (error: any) => {
        console.error("[WIDGET] Erro:", error);
        alert("Erro ao fazer login: " + (error.message || "Erro desconhecido"));
      },
    };

    // Escuta eventos do widget
    const handleTokensReceived = (e: CustomEvent) => {
      const tokens = e.detail;
      saveTokensAndUpdateAuth(tokens);
    };

    const handleSessionFound = (e: CustomEvent) => {
      // Os tokens podem estar diretamente em e.detail ou em e.detail.tokens
      const tokens = e.detail?.tokens || e.detail;
      
      if (tokens && (tokens.access_token || tokens.id_token || tokens.refresh_token)) {
        saveTokensAndUpdateAuth(tokens);
      } else {
        console.warn("[WIDGET] Sessão encontrada mas sem tokens válidos:", e.detail);
      }
    };

    window.addEventListener("sso:tokens:received", handleTokensReceived as EventListener);
    window.addEventListener("sso:session:found", handleSessionFound as EventListener);

    return () => {
      window.removeEventListener("sso:tokens:received", handleTokensReceived as EventListener);
      window.removeEventListener("sso:session:found", handleSessionFound as EventListener);
    };
  }, []);

  const startAuth = useCallback(async () => {
    try {
      const verifier = generateCodeVerifier();
      localStorage.setItem("pkce_verifier", verifier);

      const challenge = await generateCodeChallenge(verifier);

      // Obtém scopes do localStorage ou usa os padrão
      const savedScopes = localStorage.getItem("current_scopes");
      const scopes = savedScopes || "openid profile email offline_access";
      
      // Salva os scopes que serão usados
      localStorage.setItem("current_scopes", scopes);

      const params = new URLSearchParams({
        client_id: "i9kz2u01dpu2t1n0eh388",
        redirect_uri: "http://localhost:3000/callback",
        response_type: "code",
        scope: scopes,
        state: "abc123",
        code_challenge: challenge,
        code_challenge_method: "S256",
        prompt: "login", // Força login mesmo se já estiver autenticado
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

  const startIframeAuth = useCallback(async () => {
    try {
      const verifier = generateCodeVerifier();
      setIframeVerifier(verifier);
      localStorage.setItem("pkce_verifier", verifier);

      const challenge = await generateCodeChallenge(verifier);

      // Obtém scopes do localStorage ou usa os padrão
      const savedScopes = localStorage.getItem("current_scopes");
      const scopes = savedScopes || "openid profile email offline_access";
      
      // Salva os scopes que serão usados
      localStorage.setItem("current_scopes", scopes);

      // Detecta o redirect_uri baseado no ambiente atual
      const currentOrigin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
      const redirectUri = `${currentOrigin}/callback/iframe`;

      const params = new URLSearchParams({
        client_id: "i9kz2u01dpu2t1n0eh388",
        redirect_uri: redirectUri, // Usa a origem atual (funciona em dev e prod)
        response_type: "code",
        scope: scopes,
        state: "iframe-auth",
        code_challenge: challenge,
        code_challenge_method: "S256",
        prompt: "login",
      });

      const url =
        "https://identity-api.develop.afya.systems/auth/authorize?" +
        params.toString();

      setIframeUrl(url);
      setShowIframe(true);
    } catch (err) {
      console.error("[IFRAME] ERROR:", err);
      alert("Erro ao iniciar o fluxo de autenticação via iframe.");
    }
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("id_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("pkce_verifier");
    localStorage.removeItem("current_scopes");
    setIsAuthenticated(false);
    router.push("/");
  }, [router]);

  // Inicia o fluxo de iframe automaticamente ao carregar a página
  useEffect(() => {
    // Só inicia se não estiver autenticado, não estiver verificando autenticação e ainda não foi iniciado
    if (isCheckingAuth || isAuthenticated || iframeStartedRef.current) return;
    
    // Marca como iniciado e inicia o iframe automaticamente
    iframeStartedRef.current = true;
    startIframeAuth();
  }, [isCheckingAuth, isAuthenticated, startIframeAuth]);

  // Escuta mensagens do iframe
  useEffect(() => {
    if (!showIframe || !iframeUrl) return;

    const handleMessage = async (event: MessageEvent) => {
      // Valida a origem da mensagem (pode vir do callback que está no mesmo origin)
      const currentOrigin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
      const allowedOrigins = [
        currentOrigin,
        "http://localhost:3000",
        "https://localhost:3000",
        "https://identity-api.develop.afya.systems"
      ];
      
      // Verifica se a origem é permitida (inclui ngrok e outros domínios da mesma origem)
      const isAllowed = allowedOrigins.some(origin => event.origin.startsWith(origin)) || 
                       event.origin.includes("ngrok") ||
                       event.origin === currentOrigin;
      
      if (!isAllowed) {
        console.warn("[IFRAME] Mensagem de origem desconhecida:", event.origin, "Esperado:", currentOrigin);
        return;
      }

      // Verifica se é uma mensagem de callback com código
      if (event.data?.type === "oauth-callback" && event.data?.code) {
        await exchangeCodeForTokens(event.data.code);
      }

      // Verifica se é uma mensagem de erro
      if (event.data?.type === "oauth-error") {
        console.error("[IFRAME] Erro do OAuth:", event.data.error);
        alert("Erro na autenticação: " + (event.data.error || "Erro desconhecido"));
        setShowIframe(false);
        setIframeUrl(null);
      }
    };

    const exchangeCodeForTokens = async (code: string) => {
      const verifier = iframeVerifier || localStorage.getItem("pkce_verifier");

      if (!verifier) {
        console.error("[IFRAME] Code verifier não encontrado");
        alert("Erro: Code verifier não encontrado.");
        return;
      }

      try {
        const response = await fetch(
          "https://identity-api.develop.afya.systems/auth/token",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              grant_type: "authorization_code",
              client_id: "i9kz2u01dpu2t1n0eh388",
              redirect_uri: typeof window !== "undefined" ? `${window.location.origin}/callback/iframe` : "http://localhost:3000/callback/iframe", // Deve corresponder ao redirect_uri usado na autorização
              code,
              code_verifier: verifier,
            }),
          }
        );

        if (!response.ok) {
          const text = await response.text();
          console.error("[IFRAME] Erro ao obter tokens:", text);
          alert("Erro ao obter tokens: " + text);
          return;
        }

        const tokens = await response.json();

        // Salva os tokens
        if (tokens.access_token) {
          localStorage.setItem("access_token", tokens.access_token);
        }
        if (tokens.id_token) {
          localStorage.setItem("id_token", tokens.id_token);
        }
        if (tokens.refresh_token) {
          localStorage.setItem("refresh_token", tokens.refresh_token);
        }

        // Atualiza estado de autenticação
        setIsAuthenticated(true);

        // Esconde o iframe imediatamente com transição suave
        setShowIframe(false);
        setIframeUrl(null);
        
        // Força esconder todos os containers do iframe
        requestAnimationFrame(() => {
          const iframeContainer = document.getElementById('iframe-auth-container');
          if (iframeContainer) {
            iframeContainer.style.transition = 'opacity 0.3s ease-out';
            iframeContainer.style.opacity = '0';
            setTimeout(() => {
              iframeContainer.style.display = 'none';
              iframeContainer.remove();
            }, 300);
          }
          
          // Remove qualquer iframe restante
          const allIframes = document.querySelectorAll('iframe[title="SSO Login Iframe"]');
          allIframes.forEach(iframeEl => {
            const parent = iframeEl.closest('div');
            if (parent) {
              parent.style.transition = 'opacity 0.3s ease-out';
              parent.style.opacity = '0';
              setTimeout(() => {
                parent.style.display = 'none';
                parent.remove();
              }, 300);
            }
          });
        });
      } catch (error) {
        console.error("[IFRAME] Erro ao trocar código por tokens:", error);
        alert("Erro ao obter tokens: " + (error instanceof Error ? error.message : "Erro desconhecido"));
      }
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [showIframe, iframeUrl, iframeVerifier]);

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
          ) : (
            <button
              onClick={startAuth}
              className="px-4 py-1.5 text-sm bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              Login com SSO
            </button>
          )}
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
            {/* Texto da seção */}
            <p className="text-xs text-gray-600 font-semibold">Login via Widget JS</p>
            
            {/* Divisor */}
            <div className="border-t border-gray-300 my-5"></div>


            {/* Controles do Widget */}
            <div className="flex flex-col items-center justify-center gap-2 mb-3">
              {/* Controle de Tamanho */}
              <div className="flex items-center justify-center gap-2">
                <span className="text-xs text-gray-600 mr-2">Tamanho do widget:</span>
                <button
                  onClick={() => setWidgetSize("small")}
                  className={`px-2 py-1 text-xs rounded-lg transition-all ${
                    widgetSize === "small"
                      ? "bg-blue-600 text-white shadow-md"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  Pequeno
                </button>
                <button
                  onClick={() => setWidgetSize("medium")}
                  className={`px-2 py-1 text-xs rounded-lg transition-all ${
                    widgetSize === "medium"
                      ? "bg-blue-600 text-white shadow-md"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  Médio
                </button>
                <button
                  onClick={() => setWidgetSize("large")}
                  className={`px-2 py-1 text-xs rounded-lg transition-all ${
                    widgetSize === "large"
                      ? "bg-blue-600 text-white shadow-md"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  Grande
                </button>
              </div>
            </div>
            
            {/* Widget SSO */}
            <div className={widgetSize === "large" ? "w-screen relative left-1/2 -translate-x-1/2" : ""}>
              <div 
                id="sso-widget-container" 
                className={`flex justify-center items-start transition-all duration-300 ${
                  widgetSize === "small"
                    ? "min-h-[150px] max-w-md mx-auto p-4"
                    : widgetSize === "medium"
                    ? "min-h-[200px] w-full px-6 py-4"
                    : "min-h-[300px] w-full p-4"
                }`}
              >
                <div className="text-center text-gray-500" id="widget-loading">
                  <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-1"></div>
                  <p className="text-xs">Carregando widget SSO...</p>
                  <p className="text-xs mt-1 text-gray-400">
                    Se o widget não aparecer, verifique o console do navegador
                  </p>
                </div>
              </div>
            </div>

            {/* Divisor */}
            <div className="border-t border-gray-300 my-5"></div>

            {/* Seção de Login via Iframe */}
            <div>
              <h2 className="text-lg font-bold mb-3 text-center">Login via Iframe</h2>
              <p className="text-xs text-gray-600 mb-4 text-center">
                Login via iframe - Necessário uso de HTTPS p/ funcionar.
              </p>

              {/* Controles de Tamanho do Iframe */}
              <div className="flex flex-col items-center justify-center gap-2 mb-4">
                <span className="text-xs text-gray-600 font-semibold">Tamanho do iframe:</span>
                <div className="flex items-center justify-center gap-2">
                  {(["small", "medium", "large"] as const).map((size) => {
                    const dims = IFRAME_SIZES[size];
                    const label = size === "small" ? "Pequeno" : size === "medium" ? "Médio" : "Grande";
                    return (
                      <button
                        key={size}
                        onClick={() => setIframeSize(size)}
                        className={`px-3 py-1 text-xs rounded-lg transition-all ${
                          iframeSize === size
                            ? "bg-indigo-600 text-white shadow-md"
                            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                        }`}
                      >
                        {label} ({dims.width}x{dims.height})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Iframe de Autenticação */}
              {showIframe && iframeUrl && (() => {
                const dimensions = IFRAME_SIZES[iframeSize];
                return (
                  <div 
                    className={`mt-6 transition-all duration-300 ${dimensions.maxWidth} mx-auto`}
                    id="iframe-auth-container"
                    style={{ opacity: showIframe ? 1 : 0 }}
                  >
                    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-3">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-xs font-semibold text-gray-700">Autenticação</h3>
                        <button
                          onClick={() => {
                            setShowIframe(false);
                            setIframeUrl(null);
                          }}
                          className="text-gray-500 hover:text-gray-700 text-xs"
                        >
                          ✕ Fechar
                        </button>
                      </div>
                      <div 
                        className="relative w-full mx-auto"
                        style={{
                          minHeight: `${dimensions.height}px`,
                          height: `${dimensions.height}px`,
                          maxWidth: `${dimensions.width}px`,
                          overflow: iframeSize === "small" ? "hidden" : "auto"
                        }}
                      >
                        <iframe
                          src={iframeUrl}
                          className="w-full border-0 rounded"
                          style={{
                            minHeight: `${dimensions.height}px`,
                            height: `${dimensions.height}px`,
                            overflow: iframeSize === "small" ? "hidden" : "auto"
                          }}
                          title="SSO Login Iframe"
                          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation-by-user-activation"
                          scrolling={iframeSize === "small" ? "no" : "yes"}
                        />
                      </div>
                    </div>
                  </div>
                );
              })()}
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

      {/* Script do Widget SSO - Deve ser carregado DEPOIS da configuração */}
      <Script
        src="https://identity-api.develop.afya.systems/auth/widget.js"
        strategy="afterInteractive"
        onLoad={() => {
          // Verifica se o widget foi inicializado
          setTimeout(() => {
            const widget = (window as any).ssoWidget;
            if (!widget) {
              console.warn("[WIDGET] Widget não foi inicializado. Verifique se o script está correto.");
            }
            
            // Verifica se o container existe
            const container = document.getElementById("sso-widget-container");
            if (container) {
              const loading = container.querySelector("#widget-loading");
              if (loading) {
                loading.remove();
              }
              
              // Verifica se o widget renderizou algo
              if (container.children.length === 0) {
                console.warn("[WIDGET] Container está vazio. O widget pode não ter renderizado.");
              }
            } else {
              console.error("[WIDGET] Container 'sso-widget-container' não encontrado!");
            }
          }, 1000); // Aguarda 1 segundo para o widget inicializar
        }}
        onError={(e) => {
          console.error("[WIDGET] Erro ao carregar script do widget:", e);
          console.error("[WIDGET] Verifique se:");
          console.error("  1. O servidor identity-api.develop.afya.systems está acessível");
          console.error("  2. Você está conectado à VPN (se necessário)");
          console.error("  3. A URL está correta");
          console.error("  4. Não há bloqueio de CORS");
          
          // Mostra mensagem de erro no container
          const container = document.getElementById("sso-widget-container");
          if (container) {
            const loading = container.querySelector("#widget-loading");
            if (loading) {
              loading.innerHTML = `
                <div class="text-center text-red-600">
                  <div class="text-sm font-semibold mb-1">Erro ao carregar widget</div>
                  <div class="text-xs text-gray-600">
                    Verifique o console para mais detalhes
                  </div>
                </div>
              `;
            }
          }
        }}
      />
    </div>
  );
}
