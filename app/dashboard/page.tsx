"use client";

import { useAuth } from "@/hooks/useAuth";
import { useBranding } from "@/hooks/useBranding";
import { 
  refreshAccessToken, 
  refreshAccessTokenWithScopes, 
  validateToken, 
  getAccessTokenClaims,
  getIdTokenClaims,
  getStoredTokens,
  decodeJWT
} from "@/lib/auth";
import { useState, useEffect } from "react";
import Image from "next/image";

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString("pt-BR");
}

export default function DashboardPage() {
  const { isAuthenticated, isLoading, userClaims, logout } = useAuth(true);
  const { branding, isLoading: isLoadingBranding, error: brandingError, loadBranding } = useBranding();
  const [authorizationId, setAuthorizationId] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    message?: string;
  } | null>(null);
  const [refreshResult, setRefreshResult] = useState<{
    success: boolean;
    message?: string;
  } | null>(null);
  const [fullClaims, setFullClaims] = useState<unknown | null>(null);
  const [showFullClaims, setShowFullClaims] = useState(false);
  const [customScopes, setCustomScopes] = useState("");
  const [isRefreshingWithScopes, setIsRefreshingWithScopes] = useState(false);
  const [refreshWithScopesResult, setRefreshWithScopesResult] = useState<{
    success: boolean;
    message?: string;
  } | null>(null);
  const [tokens, setTokens] = useState<{
    access_token: string | null;
    id_token: string | null;
    refresh_token: string | null;
  }>({ access_token: null, id_token: null, refresh_token: null });
  const [accessTokenClaims, setAccessTokenClaims] = useState<unknown | null>(null);
  const [idTokenClaims, setIdTokenClaims] = useState<unknown | null>(null);
  const [showAccessToken, setShowAccessToken] = useState(false);
  const [showIdToken, setShowIdToken] = useState(false);
  const [showRefreshToken, setShowRefreshToken] = useState(false);

  // Carrega os scopes atuais do localStorage
  useEffect(() => {
    const savedScopes = localStorage.getItem("current_scopes");
    if (savedScopes) {
      setCustomScopes(savedScopes);
    } else {
      setCustomScopes("openid profile email offline_access");
    }
  }, []);

  // Carrega os tokens e suas claims
  useEffect(() => {
    const storedTokens = getStoredTokens();
    setTokens(storedTokens);

    // Decodifica os tokens para exibição (sem validação)
    if (storedTokens.access_token) {
      const accessDecoded = decodeJWT(storedTokens.access_token);
      if (accessDecoded.success) {
        setAccessTokenClaims(accessDecoded.payload);
      }
    }

    if (storedTokens.id_token) {
      const idDecoded = decodeJWT(storedTokens.id_token);
      if (idDecoded.success) {
        setIdTokenClaims(idDecoded.payload);
      }
    }
  }, [isAuthenticated]);

  const handleLoadBranding = () => {
    if (authorizationId.trim()) {
      loadBranding(authorizationId.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleLoadBranding();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Usa claims do ID token se disponível, senão usa do access token
  const claims = userClaims || {};
  const idTokenClaimsObj = idTokenClaims as Record<string, unknown> | null;
  const accessTokenClaimsObj = accessTokenClaims as Record<string, unknown> | null;
  
  // Preferência: ID token > Access token
  const displayClaims = idTokenClaimsObj || accessTokenClaimsObj || claims;
  const iat = typeof displayClaims.iat === "number" ? displayClaims.iat : null;
  const exp = typeof displayClaims.exp === "number" ? displayClaims.exp : null;
  const iss = displayClaims.iss ? String(displayClaims.iss) : null;
  const aud = displayClaims.aud ? String(displayClaims.aud) : null;

  const handleRefreshToken = async () => {
    setIsRefreshing(true);
    setRefreshResult(null);
    try {
      const result = await refreshAccessToken();
      if (result.success) {
        // Atualiza os tokens imediatamente
        const updatedTokens = getStoredTokens();
        setTokens(updatedTokens);
        
        // Decodifica os novos tokens
        if (updatedTokens.access_token) {
          const accessDecoded = decodeJWT(updatedTokens.access_token);
          if (accessDecoded.success) {
            setAccessTokenClaims(accessDecoded.payload);
          }
        }
        if (updatedTokens.id_token) {
          const idDecoded = decodeJWT(updatedTokens.id_token);
          if (idDecoded.success) {
            setIdTokenClaims(idDecoded.payload);
          }
        }
        
        setRefreshResult({
          success: true,
          message: "Token renovado com sucesso! A página será recarregada em 2 segundos...",
        });
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setRefreshResult({
          success: false,
          message: `Erro ao renovar token: ${result.error || "Erro desconhecido"}`,
        });
      }
    } catch (error) {
      setRefreshResult({
        success: false,
        message: `Erro ao renovar token: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleValidateToken = async () => {
    setIsValidating(true);
    setValidationResult(null);
    try {
      const result = await validateToken();
      setValidationResult({
        valid: result.valid,
        message: result.valid ? "Token válido!" : "Token inválido ou expirado",
      });
    } catch (error) {
      setValidationResult({
        valid: false,
        message: error instanceof Error ? error.message : "Erro ao validar token",
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleViewFullClaims = async () => {
    try {
      // Tenta obter claims do ID token primeiro (mais completo para usuário)
      const idTokenResult = await getIdTokenClaims();
      if (idTokenResult.success && idTokenResult.claims) {
        setFullClaims(idTokenResult.claims);
        setShowFullClaims(true);
      } else {
        // Fallback para access token se ID token não estiver disponível
        const accessTokenResult = await getAccessTokenClaims();
        if (accessTokenResult.success && accessTokenResult.claims) {
          setFullClaims(accessTokenResult.claims);
          setShowFullClaims(true);
        } else {
          alert(`Erro ao obter claims: ${idTokenResult.error || accessTokenResult.error || "Erro desconhecido"}`);
        }
      }
    } catch (error) {
      alert(`Erro ao obter claims: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
    }
  };

  const handleRefreshTokenWithScopes = async () => {
    if (!customScopes.trim()) {
      setRefreshWithScopesResult({
        success: false,
        message: "Por favor, informe pelo menos um scope",
      });
      return;
    }

    setIsRefreshingWithScopes(true);
    setRefreshWithScopesResult(null);
    try {
      const result = await refreshAccessTokenWithScopes(customScopes.trim());
      if (result.success) {
        // Atualiza os tokens imediatamente
        const updatedTokens = getStoredTokens();
        setTokens(updatedTokens);
        
        // Decodifica os novos tokens
        if (updatedTokens.access_token) {
          const accessDecoded = decodeJWT(updatedTokens.access_token);
          if (accessDecoded.success) {
            setAccessTokenClaims(accessDecoded.payload);
          }
        }
        if (updatedTokens.id_token) {
          const idDecoded = decodeJWT(updatedTokens.id_token);
          if (idDecoded.success) {
            setIdTokenClaims(idDecoded.payload);
          }
        }
        
        setRefreshWithScopesResult({
          success: true,
          message: "Token renovado com novos scopes! A página será recarregada em 2 segundos para mostrar as claims atualizadas...",
        });
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setRefreshWithScopesResult({
          success: false,
          message: `Erro ao renovar token: ${result.error || "Erro desconhecido"}`,
        });
      }
    } catch (error) {
      setRefreshWithScopesResult({
        success: false,
        message: `Erro ao renovar token: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
      });
    } finally {
      setIsRefreshingWithScopes(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">A</span>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Dashboard
              </span>
            </div>
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-500 text-white rounded-lg shadow hover:bg-red-600 transition font-medium"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        {/* Welcome Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-8 mb-8 border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
              <span className="text-white text-2xl font-bold">
                {(claims.name as string)?.charAt(0)?.toUpperCase() ||
                  (claims.email as string)?.charAt(0)?.toUpperCase() ||
                  "U"}
              </span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-1">
                Bem-vindo, {claims.name || claims.preferred_username || "Usuário"}!
              </h1>
              <p className="text-gray-600">{claims.email}</p>
            </div>
          </div>
        </div>

        {/* Seção de Tokens */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 mb-8 border border-gray-100">
          <h2 className="text-xl font-bold mb-4 text-gray-900 flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Tokens e Claims
          </h2>

          <div className="space-y-6">
            {/* Access Token */}
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  Access Token
                </h3>
                <button
                  onClick={() => setShowAccessToken(!showAccessToken)}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  {showAccessToken ? "Ocultar" : "Mostrar"} Token
                </button>
              </div>
              
              {showAccessToken && tokens.access_token && (
                <div className="mb-3">
                  <div className="text-xs text-gray-500 mb-1">Token Completo:</div>
                  <div className="bg-gray-900 text-gray-100 p-3 rounded font-mono text-xs break-all overflow-x-auto">
                    {tokens.access_token}
                  </div>
                </div>
              )}

              {accessTokenClaims && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-700 mb-2">Claims do Access Token:</div>
                  <div className="bg-white rounded p-3 border border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      {Object.entries(accessTokenClaims as Record<string, unknown>).map(([key, value]) => {
                        let displayValue = String(value);
                        if (key === "iat" || key === "exp") {
                          const timestamp = typeof value === "number" ? value : parseInt(String(value));
                          displayValue = `${formatDate(timestamp)} (${timestamp})`;
                        } else if (key === "scope") {
                          displayValue = String(value);
                        }
                        return (
                          <div key={key} className="flex flex-col">
                            <span className="text-gray-500 text-xs font-medium mb-1">{key}:</span>
                            <span className="text-gray-900 font-mono text-xs break-all">{displayValue}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {accessTokenClaims && typeof accessTokenClaims === "object" && "exp" in accessTokenClaims && typeof accessTokenClaims.exp === "number" && (
                    <div className="mt-2 text-xs text-gray-600">
                      <span className="font-medium">Expira em:</span> {formatDate(accessTokenClaims.exp)}
                      {accessTokenClaims.exp * 1000 > Date.now() ? (
                        <span className="ml-2 text-green-600">✓ Válido</span>
                      ) : (
                        <span className="ml-2 text-red-600">✗ Expirado</span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ID Token */}
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  ID Token
                </h3>
                <button
                  onClick={() => setShowIdToken(!showIdToken)}
                  className="text-sm text-purple-600 hover:text-purple-800 font-medium"
                >
                  {showIdToken ? "Ocultar" : "Mostrar"} Token
                </button>
              </div>
              
              {showIdToken && tokens.id_token && (
                <div className="mb-3">
                  <div className="text-xs text-gray-500 mb-1">Token Completo:</div>
                  <div className="bg-gray-900 text-gray-100 p-3 rounded font-mono text-xs break-all overflow-x-auto">
                    {tokens.id_token}
                  </div>
                </div>
              )}

              {idTokenClaims ? (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-700 mb-2">Claims do ID Token:</div>
                  <div className="bg-white rounded p-3 border border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      {Object.entries(idTokenClaims as Record<string, unknown>).map(([key, value]) => {
                        let displayValue = String(value);
                        if (key === "iat" || key === "exp") {
                          const timestamp = typeof value === "number" ? value : parseInt(String(value));
                          displayValue = `${formatDate(timestamp)} (${timestamp})`;
                        }
                        return (
                          <div key={key} className="flex flex-col">
                            <span className="text-gray-500 text-xs font-medium mb-1">{key}:</span>
                            <span className="text-gray-900 font-mono text-xs break-all">{displayValue}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {idTokenClaims && typeof idTokenClaims === "object" && "exp" in idTokenClaims && typeof idTokenClaims.exp === "number" && (
                    <div className="mt-2 text-xs text-gray-600">
                      <span className="font-medium">Expira em:</span> {formatDate(idTokenClaims.exp)}
                      {idTokenClaims.exp * 1000 > Date.now() ? (
                        <span className="ml-2 text-green-600">✓ Válido</span>
                      ) : (
                        <span className="ml-2 text-red-600">✗ Expirado</span>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-gray-500 italic">ID Token não disponível</div>
              )}
            </div>

            {/* Refresh Token */}
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh Token
                </h3>
                <button
                  onClick={() => setShowRefreshToken(!showRefreshToken)}
                  className="text-sm text-green-600 hover:text-green-800 font-medium"
                >
                  {showRefreshToken ? "Ocultar" : "Mostrar"} Token
                </button>
              </div>
              
              {showRefreshToken && tokens.refresh_token && (
                <div>
                  <div className="text-xs text-gray-500 mb-1">Token Completo:</div>
                  <div className="bg-gray-900 text-gray-100 p-3 rounded font-mono text-xs break-all overflow-x-auto">
                    {tokens.refresh_token}
                  </div>
                </div>
              )}
              {!tokens.refresh_token && (
                <div className="text-sm text-gray-500 italic">Refresh Token não disponível</div>
              )}
            </div>

            {/* Scopes Atuais */}
            <div className="border border-gray-200 rounded-lg p-4 bg-blue-50">
              <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Scopes Atuais
              </h3>
              <div className="text-sm text-gray-700 font-mono bg-white p-2 rounded border border-blue-200">
                {customScopes || "Nenhum scope definido"}
              </div>
            </div>
          </div>
        </div>

        {/* Input para Authorization ID */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 mb-8 border border-gray-100">
          <h2 className="text-xl font-bold mb-4 text-gray-900 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Buscar Dados de Customização
          </h2>
          <div className="flex gap-3">
            <input
              type="text"
              value={authorizationId}
              onChange={(e) => setAuthorizationId(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Digite o authorization_id (ex: 1Nk772KKmd8551E6NjCr3)"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={handleLoadBranding}
              disabled={isLoadingBranding || !authorizationId.trim()}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2"
            >
              {isLoadingBranding ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Buscando...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Buscar
                </>
              )}
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Digite o authorization_id e pressione Enter ou clique em Buscar
          </p>
        </div>

        {/* Card de Customização */}
        {(isLoadingBranding || brandingError || branding) && (
          <>
            {isLoadingBranding ? (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 mb-8 border border-gray-100">
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="ml-3 text-gray-600">Carregando dados de customização...</span>
                </div>
              </div>
            ) : brandingError ? (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 mb-8 border border-red-200">
                <div className="flex items-center gap-2 text-red-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">Erro ao carregar dados de customização: {brandingError}</span>
                </div>
              </div>
            ) : branding ? (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 mb-8 border border-gray-100">
            <h2 className="text-xl font-bold mb-4 text-gray-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
              Informações de Customização
            </h2>
            
            <div className="space-y-6">
              {/* Client Name */}
              <div>
                <div className="text-sm text-gray-500 mb-1">Nome do Cliente</div>
                <div className="text-lg font-semibold text-gray-900">{branding.clientName}</div>
              </div>

              {/* Cores */}
              <div>
                <div className="text-sm text-gray-500 mb-2">Cores</div>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-12 h-12 rounded-lg border-2 border-gray-300 shadow-sm"
                      style={{ backgroundColor: branding.branding.primaryColor }}
                      title={`Cor Primária: ${branding.branding.primaryColor}`}
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-700">Primária</div>
                      <div className="text-xs text-gray-500 font-mono">{branding.branding.primaryColor}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-12 h-12 rounded-lg border-2 border-gray-300 shadow-sm"
                      style={{ backgroundColor: branding.branding.secondaryColor }}
                      title={`Cor Secundária: ${branding.branding.secondaryColor}`}
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-700">Secundária</div>
                      <div className="text-xs text-gray-500 font-mono">{branding.branding.secondaryColor}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Logo */}
              <div>
                <div className="text-sm text-gray-500 mb-2">Logo</div>
                {branding.branding.logo && branding.branding.logo !== "..." ? (
                  <div className="flex items-center gap-4">
                    <div className="border-2 border-gray-200 rounded-lg p-2 bg-gray-50">
                      <Image
                        src={branding.branding.logo}
                        alt="Logo"
                        width={100}
                        height={100}
                        className="max-w-[100px] max-h-[100px] object-contain"
                        unoptimized
                        onError={(e) => {
                          const target = e.target as HTMLElement;
                          target.style.display = "none";
                        }}
                      />
                    </div>
                    <a 
                      href={branding.branding.logo} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm underline"
                    >
                      Ver imagem completa
                    </a>
                  </div>
                ) : (
                  <div className="text-sm text-gray-400 italic">Não disponível</div>
                )}
              </div>

              {/* Background */}
              <div>
                <div className="text-sm text-gray-500 mb-2">Background</div>
                {branding.branding.backgroundUrl && branding.branding.backgroundUrl !== "..." ? (
                  <div className="space-y-2">
                    <div className="border-2 border-gray-200 rounded-lg p-2 bg-gray-50 w-full max-w-md">
                      <Image
                        src={branding.branding.backgroundUrl}
                        alt="Background"
                        width={300}
                        height={150}
                        className="w-full h-auto object-cover rounded"
                        unoptimized
                        onError={(e) => {
                          const target = e.target as HTMLElement;
                          target.style.display = "none";
                        }}
                      />
                    </div>
                    <a 
                      href={branding.branding.backgroundUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm underline"
                    >
                      Ver imagem completa
                    </a>
                  </div>
                ) : (
                  <div className="text-sm text-gray-400 italic">Não disponível</div>
                )}
              </div>

              {/* Favicon */}
              <div>
                <div className="text-sm text-gray-500 mb-2">Favicon</div>
                {branding.branding.faviconUrl && branding.branding.faviconUrl !== "..." ? (
                  <a 
                    href={branding.branding.faviconUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm underline"
                  >
                    {branding.branding.faviconUrl}
                  </a>
                ) : (
                  <div className="text-sm text-gray-400 italic">Não disponível</div>
                )}
              </div>

              {/* Carrossel */}
              <div>
                <div className="text-sm text-gray-500 mb-2">Carrossel</div>
                {branding.carousel && branding.carousel.length > 0 ? (
                  <div className="space-y-3">
                    {branding.carousel.map((item, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <div className="text-sm font-medium text-gray-700 mb-2">Item {index + 1}</div>
                        {item.imageUrl && item.imageUrl !== "..." && (
                          <div className="mb-2">
                            <Image
                              src={item.imageUrl}
                              alt={item.title || `Carrossel ${index + 1}`}
                              width={200}
                              height={100}
                              className="max-w-[200px] max-h-[100px] object-cover rounded border border-gray-200"
                              unoptimized
                              onError={(e) => {
                                const target = e.target as HTMLElement;
                                target.style.display = "none";
                              }}
                            />
                          </div>
                        )}
                        <div className="text-sm text-gray-600">
                          <div className="font-medium mb-1">{item.title || "Sem título"}</div>
                          <div className="text-xs">{item.description || "Sem descrição"}</div>
                        </div>
                        {item.imageUrl && item.imageUrl !== "..." && (
                          <a 
                            href={item.imageUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-xs underline mt-2 inline-block"
                          >
                            Ver imagem completa
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-400 italic">Nenhum item no carrossel</div>
                )}
              </div>

              {/* Scope */}
              <div>
                <div className="text-sm text-gray-500 mb-1">Scope</div>
                <div className="text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded">{branding.scope}</div>
              </div>

              {/* JSON Completo */}
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                  Ver JSON completo
                </summary>
                <div className="mt-2 bg-gray-50 rounded-lg p-4 overflow-x-auto border border-gray-200">
                  <pre className="text-xs text-gray-800">
                    {JSON.stringify(branding, null, 2)}
                  </pre>
                </div>
              </details>
            </div>
          </div>
            ) : null}
          </>
        )}

        {/* Gerenciamento de Scopes */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 mb-8 border border-gray-100">
          <h2 className="text-xl font-bold mb-4 text-gray-900 flex items-center gap-2">
            <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            Gerenciamento de Scopes
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Escolha novos scopes e renove o token para ver as claims atualizadas. Os scopes são separados por espaços.
          </p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Scopes Atuais
              </label>
              <input
                type="text"
                value={customScopes}
                onChange={(e) => setCustomScopes(e.target.value)}
                placeholder="openid profile email offline_access"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-2">
                Exemplos: <code className="bg-gray-100 px-1 rounded">openid profile email</code>, <code className="bg-gray-100 px-1 rounded">openid profile email offline_access</code>
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleRefreshTokenWithScopes}
                disabled={isRefreshingWithScopes || !customScopes.trim()}
                className="px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg shadow hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2"
              >
                {isRefreshingWithScopes ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Renovando com novos scopes...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Renovar Token com Novos Scopes
                  </>
                )}
              </button>
            </div>

            {refreshWithScopesResult && (
              <div className={`p-4 rounded-lg ${
                refreshWithScopesResult.success 
                  ? "bg-green-50 border border-green-200" 
                  : "bg-red-50 border border-red-200"
              }`}>
                <div className="flex items-center gap-2">
                  {refreshWithScopesResult.success ? (
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  <span className={`font-medium ${
                    refreshWithScopesResult.success ? "text-green-800" : "text-red-800"
                  }`}>
                    {refreshWithScopesResult.message}
                  </span>
                </div>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Como funciona:</p>
                  <ul className="list-disc list-inside space-y-1 text-blue-700">
                    <li>Modifique os scopes acima conforme necessário</li>
                    <li>Clique em "Renovar Token com Novos Scopes"</li>
                    <li>O token será renovado com os novos scopes solicitados</li>
                    <li>A página será recarregada automaticamente para mostrar as claims atualizadas</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Botões de Validação */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 mb-8 border border-gray-100">
          <h2 className="text-xl font-bold mb-4 text-gray-900 flex items-center gap-2">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Validação de Token
          </h2>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={handleRefreshToken}
              disabled={isRefreshing}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2"
            >
              {isRefreshing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Renovando...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh Token
                </>
              )}
            </button>
            <button
              onClick={handleValidateToken}
              disabled={isValidating}
              className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg shadow hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2"
            >
              {isValidating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Validando...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Validar Token
                </>
              )}
            </button>
            <button
              onClick={handleViewFullClaims}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg shadow hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-medium flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Ver Claims Completas
            </button>
          </div>
          {refreshResult && (
            <div className={`mt-4 p-4 rounded-lg ${
              refreshResult.success 
                ? "bg-green-50 border border-green-200" 
                : "bg-red-50 border border-red-200"
            }`}>
              <div className="flex items-center gap-2">
                {refreshResult.success ? (
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                <span className={`font-medium ${
                  refreshResult.success ? "text-green-800" : "text-red-800"
                }`}>
                  {refreshResult.message}
                </span>
              </div>
            </div>
          )}
          {validationResult && (
            <div className={`mt-4 p-4 rounded-lg ${
              validationResult.valid 
                ? "bg-green-50 border border-green-200" 
                : "bg-red-50 border border-red-200"
            }`}>
              <div className="flex items-center gap-2">
                {validationResult.valid ? (
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                <span className={`font-medium ${
                  validationResult.valid ? "text-green-800" : "text-red-800"
                }`}>
                  {validationResult.message}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Claims Info */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* User Info Card */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-gray-100">
            <h2 className="text-xl font-bold mb-4 text-gray-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Informações do Usuário
            </h2>
            <div className="space-y-3">
              {claims.sub && (
                <div>
                  <div className="text-sm text-gray-500 mb-1">ID do Usuário</div>
                  <div className="text-gray-900 font-mono text-sm bg-gray-50 p-2 rounded">{claims.sub}</div>
                </div>
              )}
              {claims.email && (
                <div>
                  <div className="text-sm text-gray-500 mb-1">Email</div>
                  <div className="text-gray-900">{claims.email}</div>
                </div>
              )}
              {claims.name && (
                <div>
                  <div className="text-sm text-gray-500 mb-1">Nome</div>
                  <div className="text-gray-900">{claims.name}</div>
                </div>
              )}
              {claims.preferred_username && (
                <div>
                  <div className="text-sm text-gray-500 mb-1">Username</div>
                  <div className="text-gray-900">{claims.preferred_username}</div>
                </div>
              )}
            </div>
          </div>

          {/* Token Info Card */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-gray-100">
            <h2 className="text-xl font-bold mb-4 text-gray-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Informações do Token
            </h2>
            <div className="space-y-3">
              {iat && (
                <div>
                  <div className="text-sm text-gray-500 mb-1">Emitido em</div>
                  <div className="text-gray-900">{formatDate(iat)}</div>
                </div>
              )}
              {exp && (
                <div>
                  <div className="text-sm text-gray-500 mb-1">Expira em</div>
                  <div className="text-gray-900">{formatDate(exp)}</div>
                </div>
              )}
              {iss && (
                <div>
                  <div className="text-sm text-gray-500 mb-1">Emissor</div>
                  <div className="text-gray-900 font-mono text-sm bg-gray-50 p-2 rounded break-all">
                    {iss}
                  </div>
                </div>
              )}
              {aud && (
                <div>
                  <div className="text-sm text-gray-500 mb-1">Audience</div>
                  <div className="text-gray-900 font-mono text-sm bg-gray-50 p-2 rounded">
                    {aud}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* All Claims */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Todas as Claims do {idTokenClaims ? "ID Token" : "Access Token"}
            </h2>
            {showFullClaims && (
              <button
                onClick={() => setShowFullClaims(false)}
                className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Fechar
              </button>
            )}
          </div>
          {showFullClaims && fullClaims ? (
            <div className="bg-gray-50 rounded-lg p-4 overflow-x-auto border-2 border-purple-200">
              <pre className="text-sm text-gray-800">
                {JSON.stringify(fullClaims, null, 2)}
              </pre>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-4 overflow-x-auto">
              <div className="mb-2 text-xs text-gray-500">
                {idTokenClaims ? "Claims do ID Token:" : accessTokenClaims ? "Claims do Access Token:" : "Claims:"}
              </div>
              <pre className="text-sm text-gray-800">
                {JSON.stringify(displayClaims, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Security Info */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-2">Validação Segura</h3>
              <p className="text-gray-700 text-sm">
                Este token foi validado no servidor usando JWKS (JSON Web Key Set) do SSO.
                A assinatura foi verificada localmente, garantindo que o token não foi modificado.
                Nenhuma chamada ao SSO é necessária para validar tokens em cada requisição.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
