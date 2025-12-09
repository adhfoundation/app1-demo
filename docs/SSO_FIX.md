# Correção do Erro no Servidor SSO

## Erros Encontrados

### Erro 1: Chave Simétrica com RS256
```
Error: secretOrPrivateKey must be an asymmetric key when using RS256
at JwtService.sign
at AuthService.generateTokens
```

### Erro 2: JWKS Endpoint Protegido (NOVO)
```
UnauthorizedException: Token de acesso ou sessão necessária
at HybridAuthGuard.canActivate
GET /.well-known/jwks.json [401]
```

## Problemas

1. O servidor SSO está configurado para usar **RS256** (algoritmo assimétrico), mas está passando uma **chave simétrica** (string) ao invés de uma **chave privada RSA**.

2. O endpoint `.well-known/jwks.json` está protegido por autenticação, mas **DEVE SER PÚBLICO** - qualquer cliente precisa acessá-lo para validar tokens.

## Solução

### 1. Verificar Configuração do JWT Module

No arquivo do módulo JWT (provavelmente `auth.module.ts` ou similar):

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { readFileSync } from 'fs';
import { join } from 'path';

@Module({
  imports: [
    JwtModule.register({
      // ❌ ERRADO - chave simétrica
      // secret: 'sua-chave-secreta',
      
      // ✅ CORRETO - chave privada RSA para RS256
      privateKey: readFileSync(join(__dirname, '..', 'keys', 'private.pem')),
      publicKey: readFileSync(join(__dirname, '..', 'keys', 'public.pem')),
      signOptions: {
        algorithm: 'RS256',
        expiresIn: '1h',
      },
    }),
  ],
})
export class AuthModule {}
```

### 2. Gerar Par de Chaves RSA

Se não tiver as chaves, gere um par RSA:

```bash
# Gerar chave privada
openssl genrsa -out private.pem 2048

# Gerar chave pública
openssl rsa -in private.pem -pubout -out public.pem
```

### 3. Atualizar AuthService

No método `generateTokens` do `AuthService`:

```typescript
// ❌ ERRADO
const accessToken = this.jwtService.sign(payload, {
  secret: 'chave-simetrica', // Não funciona com RS256
  algorithm: 'RS256',
});

// ✅ CORRETO
const accessToken = this.jwtService.sign(payload, {
  algorithm: 'RS256',
  // Não precisa passar secret/privateKey se já configurado no módulo
});
```

### 4. Configurar JWKS Endpoint (DEVE SER PÚBLICO!)

⚠️ **CRÍTICO**: O endpoint `.well-known/jwks.json` **NÃO PODE** ter guard de autenticação!

```typescript
import { Controller, Get } from '@nestjs/common';
import { Public } from '@nestjs/common'; // ou use @SetMetadata('isPublic', true)

@Controller('.well-known')
export class WellKnownController {
  constructor(private readonly jwksService: JwksService) {}

  @Public() // ⚠️ IMPORTANTE: Remove autenticação deste endpoint!
  @Get('jwks.json')
  getJwks() {
    return this.jwksService.getJwks();
  }
}
```

**OU** configure o guard para ignorar este endpoint:

```typescript
// No HybridAuthGuard ou guard global
canActivate(context: ExecutionContext): boolean {
  const request = context.switchToHttp().getRequest();
  const path = request.url;

  // Permite acesso público ao JWKS
  if (path === '/.well-known/jwks.json') {
    return true;
  }

  // Resto da lógica de autenticação...
}
```

**OU** use `@SetMetadata`:

```typescript
@SetMetadata('isPublic', true)
@Get('jwks.json')
getJwks() {
  return this.jwksService.getJwks();
}
```

E no guard:
```typescript
const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
  context.getHandler(),
  context.getClass(),
]);

if (isPublic) {
  return true;
}
```

### 5. Variáveis de Ambiente (Opcional)

Para produção, use variáveis de ambiente:

```typescript
JwtModule.registerAsync({
  useFactory: () => ({
    privateKey: process.env.JWT_PRIVATE_KEY || readFileSync('private.pem'),
    publicKey: process.env.JWT_PUBLIC_KEY || readFileSync('public.pem'),
    signOptions: {
      algorithm: 'RS256',
      expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    },
  }),
}),
```

## Resumo

- **RS256** = Algoritmo assimétrico = precisa de **chave privada RSA** para assinar
- **HS256** = Algoritmo simétrico = usa **string secreta** para assinar

Se estiver usando RS256, **DEVE** usar chave privada RSA, não uma string.

## Verificação

Após corrigir, o token JWT deve ser gerado corretamente e o endpoint `/auth/token` deve retornar o token sem erros.

