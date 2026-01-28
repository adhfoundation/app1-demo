/**
 * Script JavaScript do Widget SSO Iframe
 * Este script deve ser servido em: GET /auth/iframe-widget.js
 * 
 * Headers necessários:
 * - Content-Type: application/javascript
 * - Access-Control-Allow-Origin: *
 * - Cache-Control: public, max-age=3600
 */

(function() {
  'use strict';
  
  // Gera code verifier para PKCE
  function generateCodeVerifier() {
    const array = new Uint8Array(64);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
  }

  // Gera code challenge para PKCE
  async function generateCodeChallenge(verifier) {
    const data = new TextEncoder().encode(verifier);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
  }

  // Inicializa todos os widgets
  function initWidgets() {
    const containers = document.querySelectorAll('#afya-sso-iframe');
    
    containers.forEach(function(container) {
      // Lê configuração dos atributos data-*
      const clientId = container.getAttribute('data-client-id') || 'i9kz2u01dpu2t1n0eh388';
      const scopes = container.getAttribute('data-scopes') || 'openid profile email offline_access';
      const mode = container.getAttribute('data-mode') || 'login';
      const width = container.getAttribute('data-width') || '100%';
      const height = container.getAttribute('data-height') || '600px';
      
      // URLs do backend
      const authUrl = 'https://identity-api.develop.afya.systems/auth/authorize';
      const tokenUrl = 'https://identity-api.develop.afya.systems/auth/token';
      const currentOrigin = window.location.origin;
      const redirectUri = currentOrigin + '/callback/iframe';
      
      let codeVerifier = null;
      let iframeElement = null;
      
      // Função para iniciar autenticação
      async function startAuth() {
        try {
          // Gera PKCE
          codeVerifier = generateCodeVerifier();
          localStorage.setItem('pkce_verifier', codeVerifier);
          const challenge = await generateCodeChallenge(codeVerifier);
          
          // Monta URL de autorização
          const params = new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            response_type: 'code',
            scope: scopes,
            state: 'iframe-auth',
            code_challenge: challenge,
            code_challenge_method: 'S256',
            prompt: mode === 'login' ? 'login' : 'none'
          });
          
          // Cria iframe
          container.innerHTML = '';
          iframeElement = document.createElement('iframe');
          iframeElement.src = authUrl + '?' + params.toString();
          iframeElement.style.cssText = 'width:' + width + ';height:' + height + ';border:none;border-radius:8px;overflow:hidden';
          iframeElement.title = 'SSO Login Iframe';
          iframeElement.sandbox = 'allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation-by-user-activation';
          iframeElement.scrolling = 'no';
          
          container.appendChild(iframeElement);
          
        } catch (err) {
          console.error('[AFYA-SSO] Erro ao iniciar autenticação:', err);
          container.innerHTML = '<div style="padding:20px;color:#dc2626">Erro ao iniciar autenticação</div>';
        }
      }
      
      // Escuta mensagens do iframe
      function handleMessage(event) {
        const currentOrigin = window.location.origin;
        const allowedOrigins = [
          currentOrigin,
          'http://localhost:3000',
          'https://localhost:3000',
          'https://identity-api.develop.afya.systems'
        ];
        
        const isAllowed = allowedOrigins.some(origin => event.origin.startsWith(origin)) || 
                         event.origin.includes('ngrok') ||
                         event.origin === currentOrigin;
        
        if (!isAllowed) {
          console.warn('[AFYA-SSO] Mensagem de origem desconhecida:', event.origin);
          return;
        }
        
        // Processa callback OAuth
        if (event.data?.type === 'oauth-callback' && event.data?.code) {
          exchangeCodeForTokens(event.data.code);
        }
        
        // Processa erro
        if (event.data?.type === 'oauth-error') {
          console.error('[AFYA-SSO] Erro do OAuth:', event.data.error);
          container.innerHTML = '<div style="padding:20px;color:#dc2626">Erro: ' + (event.data.error || 'Erro desconhecido') + '</div>';
        }
      }
      
      // Troca código por tokens
      async function exchangeCodeForTokens(code) {
        const verifier = codeVerifier || localStorage.getItem('pkce_verifier');
        
        if (!verifier) {
          console.error('[AFYA-SSO] Code verifier não encontrado');
          container.innerHTML = '<div style="padding:20px;color:#dc2626">Erro: verifier não encontrado</div>';
          return;
        }
        
        try {
          const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              grant_type: 'authorization_code',
              client_id: clientId,
              redirect_uri: redirectUri,
              code: code,
              code_verifier: verifier
            })
          });
          
          if (!response.ok) {
            const text = await response.text();
            console.error('[AFYA-SSO] Erro ao obter tokens:', text);
            container.innerHTML = '<div style="padding:20px;color:#dc2626">Erro ao obter tokens</div>';
            return;
          }
          
          const tokens = await response.json();
          
          // Salva tokens
          if (tokens.access_token) {
            localStorage.setItem('access_token', tokens.access_token);
          }
          if (tokens.id_token) {
            localStorage.setItem('id_token', tokens.id_token);
          }
          if (tokens.refresh_token) {
            localStorage.setItem('refresh_token', tokens.refresh_token);
          }
          
          // Remove iframe com animação
          if (iframeElement) {
            iframeElement.style.transition = 'opacity 0.3s';
            iframeElement.style.opacity = '0';
            setTimeout(function() {
              container.innerHTML = '<div style="padding:20px;color:#059669;text-align:center">✓ Sucesso!</div>';
              
              // Dispara evento customizado
              window.dispatchEvent(new CustomEvent('afya-sso-success', {
                detail: { tokens: tokens }
              }));
            }, 300);
          }
          
        } catch (error) {
          console.error('[AFYA-SSO] Erro ao trocar código por tokens:', error);
          container.innerHTML = '<div style="padding:20px;color:#dc2626">Erro</div>';
        }
      }
      
      // Adiciona listener de mensagens
      window.addEventListener('message', handleMessage);
      
      // Inicia autenticação automaticamente se mode for 'login'
      if (mode === 'login') {
        const accessToken = localStorage.getItem('access_token');
        if (!accessToken) {
          startAuth();
        } else {
          container.innerHTML = '<div style="padding:20px;color:#059669;text-align:center">✓ Autenticado</div>';
        }
      }
      
      // Expõe função para iniciar manualmente
      container.startAuth = startAuth;
    });
  }
  
  // Inicializa quando DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidgets);
  } else {
    initWidgets();
  }
  
  // Também inicializa após carregamento completo (para conteúdo dinâmico)
  window.addEventListener('load', initWidgets);
  
})();
