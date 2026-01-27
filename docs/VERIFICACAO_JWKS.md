# Verificação do JWKS Endpoint

## Como Verificar se o JWKS está Configurado Corretamente

Após corrigir o servidor SSO, você pode verificar se o JWKS está funcionando:

### 1. Testar Endpoint JWKS

```bash
curl https://identity-api.develop.afya.systems/.well-known/jwks.json
```

**Resposta esperada:**
```json
{
  "keys": [
    {
      "kty": "RSA",
      "use": "sig",
      "kid": "...",
      "n": "...",
      "e": "AQAB"
    }
  ]
}
```

### 2. Verificar se a Chave é RSA

O campo `kty` deve ser `"RSA"` (não `"oct"` que é para chaves simétricas).

### 3. Testar Validação no Cliente

Após o SSO ser corrigido, o cliente deve conseguir:
1. Fazer login e receber o token
2. Validar o token usando o JWKS
3. Ver as claims no dashboard

## Checklist de Correção no SSO

- [ ] JWT Module configurado com `privateKey` e `publicKey` (não `secret`)
- [ ] Algoritmo definido como `RS256`
- [ ] Endpoint `.well-known/jwks.json` retornando chave pública RSA
- [ ] Chave pública no formato JWK correto
- [ ] Teste de geração de token funcionando

## Teste Rápido

Após corrigir, teste o fluxo completo:

1. Cliente faz login → SSO retorna `code`
2. Cliente troca `code` por `token` → SSO retorna JWT assinado com RS256
3. Cliente valida JWT → Usa JWKS para verificar assinatura
4. Dashboard mostra claims do token

Se todos os passos funcionarem, está correto! ✅



