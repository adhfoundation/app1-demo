"use client";

import { useAuth } from "@/hooks/useAuth";
import { refreshAccessToken, validateToken, getTokenClaims } from "@/lib/auth";
import { useState } from "react";

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString("pt-BR");
}

export default function DashboardPage() {
  const { isAuthenticated, isLoading, userClaims, logout } = useAuth(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    message?: string;
  } | null>(null);
  const [fullClaims, setFullClaims] = useState<unknown | null>(null);
  const [showFullClaims, setShowFullClaims] = useState(false);

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

  const claims = userClaims || {};
  const iat = typeof claims.iat === "number" ? claims.iat : null;
  const exp = typeof claims.exp === "number" ? claims.exp : null;
  const iss = claims.iss ? String(claims.iss) : null;
  const aud = claims.aud ? String(claims.aud) : null;

  const handleRefreshToken = async () => {
    setIsRefreshing(true);
    try {
      const result = await refreshAccessToken();
      if (result.success) {
        alert("Token renovado com sucesso! A página será recarregada.");
        window.location.reload();
      } else {
        alert(`Erro ao renovar token: ${result.error || "Erro desconhecido"}`);
      }
    } catch (error) {
      alert(`Erro ao renovar token: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
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
      const result = await getTokenClaims();
      if (result.success) {
        setFullClaims(result.claims);
        setShowFullClaims(true);
      } else {
        alert(`Erro ao obter claims: ${result.error || "Erro desconhecido"}`);
      }
    } catch (error) {
      alert(`Erro ao obter claims: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
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
              Todas as Claims do JWT
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
              <pre className="text-sm text-gray-800">
                {JSON.stringify(claims, null, 2)}
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
