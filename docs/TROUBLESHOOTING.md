# Troubleshooting - Problemas Comuns

## App Travando / ERR_CONNECTION_RESET

### Sintomas
- Chunks do Next.js não carregam
- `ERR_CONNECTION_RESET` nos arquivos estáticos
- App trava durante desenvolvimento

### Soluções

#### 1. Limpar Cache do Next.js
```bash
rm -rf .next
npm run dev
```

#### 2. Limpar Cache do Navegador
- Chrome/Edge: `Ctrl+Shift+Delete` → Limpar cache
- Ou usar modo anônimo para testar

#### 3. Reiniciar Servidor de Desenvolvimento
```bash
# Parar o servidor (Ctrl+C)
# Limpar node_modules e reinstalar (se necessário)
rm -rf node_modules
npm install
npm run dev
```

#### 4. Verificar Porta
Se a porta 3000 estiver ocupada:
```bash
# Verificar o que está usando a porta
lsof -i :3000

# Matar o processo
kill -9 <PID>

# Ou usar outra porta
PORT=3001 npm run dev
```

#### 5. Aumentar Memória do Node (se necessário)
```bash
NODE_OPTIONS="--max-old-space-size=4096" npm run dev
```

#### 6. Verificar Loops Infinitos
- Abrir DevTools → Console
- Verificar se há erros de re-render infinito
- Verificar se `useEffect` não está causando loops

#### 7. Desabilitar Extensões do Navegador
Algumas extensões podem interferir. Testar em modo anônimo.

### Prevenção

O código foi otimizado para:
- ✅ Evitar re-renders desnecessários
- ✅ Adicionar delays para evitar chamadas simultâneas
- ✅ Limpar timeouts corretamente
- ✅ Configurar webpack para melhor chunking

## Outros Problemas

### Hot Reload Não Funciona
```bash
# Limpar cache
rm -rf .next
npm run dev
```

### Erro de Módulo Não Encontrado
```bash
# Reinstalar dependências
rm -rf node_modules package-lock.json
npm install
```

### Porta Já em Uso
```bash
# Usar outra porta
PORT=3001 npm run dev
```




