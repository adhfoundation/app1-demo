# Ajustes Necessários no Backend para iframe-widget.js

## Endpoint Necessário

O backend precisa servir o script JavaScript em:
```
GET https://identity-api.develop.afya.systems/auth/iframe-widget.js
```

## Headers Necessários

O endpoint deve retornar com os seguintes headers:

```
Content-Type: application/javascript
Access-Control-Allow-Origin: *
Cache-Control: public, max-age=3600
```

## Script JavaScript Completo

### Versão Minificada (para produção)

O backend deve retornar o seguinte script minificado:

```javascript
(function(){function g(){const a=new Uint8Array(64);crypto.getRandomValues(a);return btoa(String.fromCharCode(...a)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=/g,"")}async function c(v){const d=new TextEncoder().encode(v),h=await crypto.subtle.digest("SHA-256",d);return btoa(String.fromCharCode(...new Uint8Array(h))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=/g,"")}function i(){document.querySelectorAll('#afya-sso-iframe').forEach(function(e){const t=e.getAttribute('data-client-id')||'i9kz2u01dpu2t1n0eh388',s=e.getAttribute('data-scopes')||'openid profile email offline_access',m=e.getAttribute('data-mode')||'login',w=e.getAttribute('data-width')||'100%',h=e.getAttribute('data-height')||'600px',a='https://identity-api.develop.afya.systems/auth/authorize',u='https://identity-api.develop.afya.systems/auth/token',o=window.location.origin,r=o+'/callback/iframe';let v=null,n=null;async function p(){try{v=g();localStorage.setItem('pkce_verifier',v);const l=await c(v),f=new URLSearchParams({client_id:t,redirect_uri:r,response_type:'code',scope:s,state:'iframe-auth',code_challenge:l,code_challenge_method:'S256',prompt:m==='login'?'login':'none'});e.innerHTML='';n=document.createElement('iframe');n.src=a+'?'+f.toString();n.style.cssText='width:'+w+';height:'+h+';border:none;border-radius:8px;overflow:hidden';n.title='SSO Login Iframe';n.sandbox='allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation-by-user-activation';n.scrolling='no';e.appendChild(n)}catch(l){e.innerHTML='<div style="padding:20px;color:#dc2626">Erro ao iniciar</div>'}}function x(l){const f=window.location.origin;if(!([f,'http://localhost:3000','https://localhost:3000','https://identity-api.develop.afya.systems'].some(d=>l.origin.startsWith(d))||l.origin.includes('ngrok')||l.origin===f))return;if(l.data?.type==='oauth-callback'&&l.data?.code)q(l.data.code);if(l.data?.type==='oauth-error')e.innerHTML='<div style="padding:20px;color:#dc2626">Erro: '+(l.data.error||'Erro')+'</div>'}async function q(f){const y=v||localStorage.getItem('pkce_verifier');if(!y){e.innerHTML='<div style="padding:20px;color:#dc2626">Erro: verifier não encontrado</div>';return}try{const b=await fetch(u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({grant_type:'authorization_code',client_id:t,redirect_uri:r,code:f,code_verifier:y})});if(!b.ok){e.innerHTML='<div style="padding:20px;color:#dc2626">Erro ao obter tokens</div>';return}const d=await b.json();if(d.access_token)localStorage.setItem('access_token',d.access_token);if(d.id_token)localStorage.setItem('id_token',d.id_token);if(d.refresh_token)localStorage.setItem('refresh_token',d.refresh_token);if(n){n.style.transition='opacity 0.3s';n.style.opacity='0';setTimeout(()=>{e.innerHTML='<div style="padding:20px;color:#059669;text-align:center">✓ Sucesso!</div>';window.dispatchEvent(new CustomEvent('afya-sso-success',{detail:{tokens:d}}))},300)}}catch(d){e.innerHTML='<div style="padding:20px;color:#dc2626">Erro</div>'}}window.addEventListener('message',x);if(m==='login'){const l=localStorage.getItem('access_token');if(!l)p();else e.innerHTML='<div style="padding:20px;color:#059669;text-align:center">✓ Autenticado</div>'}e.startAuth=p})}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',i);else i();window.addEventListener('load',i)})();
```

## Funcionalidades do Script

O script faz automaticamente:

1. **Detecta divs** com `id="afya-sso-iframe"`
2. **Lê configuração** dos atributos `data-*`:
   - `data-client-id`: Client ID OAuth (padrão: 'i9kz2u01dpu2t1n0eh388')
   - `data-scopes`: Scopes OAuth (padrão: 'openid profile email offline_access')
   - `data-mode`: Modo 'login' ou outro (padrão: 'login')
   - `data-width`: Largura do iframe (padrão: '100%')
   - `data-height`: Altura do iframe (padrão: '600px')
3. **Gera PKCE** (code verifier e challenge)
4. **Cria iframe** com URL de autorização
5. **Escuta postMessage** do callback
6. **Troca código por tokens** via `/auth/token`
7. **Salva tokens** no localStorage
8. **Dispara evento** `afya-sso-success` quando autenticação é bem-sucedida

## Requisitos do Backend

### 1. Endpoint `/auth/iframe-widget.js`
- Método: `GET`
- Retorna: JavaScript minificado
- Headers: `Content-Type: application/javascript` e CORS habilitado

### 2. Endpoint `/auth/authorize` (já existe)
- Deve aceitar parâmetros PKCE:
  - `code_challenge`
  - `code_challenge_method: S256`
- Deve redirecionar para `/callback/iframe` do cliente

### 3. Endpoint `/auth/token` (já existe)
- Deve aceitar `code_verifier` para validar PKCE
- Deve retornar tokens: `access_token`, `id_token`, `refresh_token`

### 4. Página `/callback/iframe` (no cliente)
- Deve existir no cliente (já existe em `/app/callback/iframe/page.tsx`)
- Envia código via `postMessage` para o parent window

## Exemplo de Uso no Cliente

```html
<!-- 1. Inclua o script -->
<script src="https://identity-api.develop.afya.systems/auth/iframe-widget.js"></script>

<!-- 2. Adicione uma div -->
<div 
  id="afya-sso-iframe"
  data-client-id="seu-client-id"
  data-scopes="openid profile email"
  data-mode="login"
  data-width="100%"
  data-height="500px"
></div>
```

## Notas Importantes

1. **CORS**: O endpoint deve permitir requisições de qualquer origem (`Access-Control-Allow-Origin: *`)
2. **Cache**: Recomendado cache de 1 hora (`Cache-Control: public, max-age=3600`)
3. **HTTPS**: O script funciona melhor com HTTPS (muitos navegadores bloqueiam autenticação em HTTP)
4. **X-Frame-Options**: O backend não deve bloquear o iframe (não usar `X-Frame-Options: DENY`)
