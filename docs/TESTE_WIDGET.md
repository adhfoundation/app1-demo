# Como Testar o Widget SSO no Localhost (QA)

## Configuração Atual

O widget está configurado para usar o ambiente **Develop**:
- **URL do Widget**: `https://identity-api.develop.afya.systems/auth/widget.js`
- **API SSO**: `https://identity-api.develop.afya.systems`
- **Client ID**: `i9kz2u01dpu2t1n0eh388`
- **Redirect URI**: `http://localhost:3000/callback`

## Passos para Testar

### 1. Iniciar o Servidor Local

```bash
npm run dev
```

O servidor estará rodando em `http://localhost:3000`

### 2. Abrir a Página Principal

Acesse: `http://localhost:3000`

Você verá:
- Botão "Entrar com SSO (Redirecionamento)" - método tradicional
- Seção "Ou use o widget SSO (QA/Develop)" - novo widget inline

### 3. Verificar o Console do Navegador

Abra o DevTools (F12) e verifique o console. Você deve ver:

```
[WIDGET] Configuração do widget SSO concluída
[WIDGET] Config: {clientId: "...", redirectUri: "...", ...}
[WIDGET] Script do widget carregado
```

### 4. Testar o Widget

1. **Aguardar o carregamento**: O widget deve aparecer na seção dedicada
2. **Fazer login**: Use suas credenciais de QA
3. **Verificar tokens**: Após login bem-sucedido, você será redirecionado para `/dashboard`

### 5. Verificar Funcionamento

No dashboard, você pode:
- Ver os tokens (Access Token, ID Token, Refresh Token)
- Ver as claims decodificadas
- Verificar tempo de expiração
- Testar renovação de tokens

## Troubleshooting

### Widget não aparece

1. **Verifique o console do navegador**:
   - Erro ao carregar o script?
   - Erro de CORS?
   - Configuração do widget está correta?

2. **Verifique a URL do widget**:
   - A URL `https://identity-api.develop.afya.systems/auth/widget.js` está acessível?
   - Teste no navegador: `curl https://identity-api.develop.afya.systems/auth/widget.js`

3. **Verifique o container**:
   - O elemento `#sso-widget-container` existe na página?
   - O widget está tentando renderizar nele?

### Erro de CORS

Se houver erro de CORS ao carregar o widget:
- Verifique se o servidor SSO permite requisições do `localhost:3000`
- Pode ser necessário configurar CORS no servidor SSO

### Widget carrega mas não funciona

1. **Verifique a configuração**:
   ```javascript
   console.log(window.ssoWidgetConfig);
   ```
   Deve mostrar:
   ```json
   {
     "clientId": "i9kz2u01dpu2t1n0eh388",
     "redirectUri": "http://localhost:3000/callback",
     "codeChallenge": "...",
     "scope": "openid profile email offline_access",
     "autoRedirect": false,
     "containerId": "sso-widget-container"
   }
   ```

2. **Verifique o code_verifier**:
   ```javascript
   console.log(sessionStorage.getItem("code_verifier"));
   ```
   Deve existir um valor

### Verificar URL do Widget

O widget está configurado para usar:
- `https://identity-api.develop.afya.systems/auth/widget.js`

## Estrutura do Widget

O widget espera encontrar:
- **Container**: `#sso-widget-container`
- **Configuração**: `window.ssoWidgetConfig`
- **Code Verifier**: `sessionStorage.getItem("code_verifier")`

## Logs Úteis

Durante o teste, monitore estes logs no console:

```
[WIDGET] Configuração do widget SSO concluída
[WIDGET] Config: {...}
[WIDGET] Script do widget carregado
[WIDGET] Login bem-sucedido: {...}  // Quando login funcionar
[WIDGET] Erro no login: {...}       // Se houver erro
```

## Próximos Passos

Após confirmar que funciona em QA:
1. Teste com diferentes scopes
2. Teste renovação de tokens
3. Teste logout e novo login
4. Verifique se os tokens são salvos corretamente
