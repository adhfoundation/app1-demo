# Configuração do Ngrok para Desenvolvimento

## Passo 1: Criar conta e obter authtoken

1. Acesse: https://dashboard.ngrok.com/signup
2. Crie uma conta gratuita (ou faça login)
3. Vá para: https://dashboard.ngrok.com/get-started/your-authtoken
4. Copie o seu authtoken

## Passo 2: Configurar o authtoken

Execute no terminal:

```bash
ngrok config add-authtoken SEU_AUTHTOKEN_AQUI
```

Substitua `SEU_AUTHTOKEN_AQUI` pelo token que você copiou.

## Passo 3: Iniciar o ngrok

Em um terminal separado, execute:

```bash
ngrok http 3000
```

Isso vai gerar uma URL HTTPS tipo: `https://abc123.ngrok.io`

## Passo 4: Usar a URL do ngrok

Copie a URL HTTPS gerada (ex: `https://abc123.ngrok.io`) e:

1. Registre essa URL no backend SSO como `redirect_uri` permitido
2. A URL completa será: `https://abc123.ngrok.io/callback/iframe`

## Passo 5: Atualizar o código (opcional)

O código já detecta automaticamente a origem atual, então se você acessar via ngrok, ele usará a URL do ngrok automaticamente.

## Dicas

- A URL do ngrok muda a cada vez que você reinicia (na versão gratuita)
- Para URL fixa, precisa do plano pago
- Mantenha o ngrok rodando enquanto desenvolve
- Use dois terminais: um para `npm run dev` e outro para `ngrok http 3000`
