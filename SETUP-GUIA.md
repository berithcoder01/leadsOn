# Guia de Instalação — Ollama + Agente LeadsOn no Windows

> Guia passo a passo para colocar o modelo de IA local (`qwen2.5:1.5b`) e o agente rodando na sua máquina Windows com Docker instalado.

---

## 🐳 Docker vs. Instalação Nativa — Qual é Melhor para Você?

### Resumo da Decisão

| Critério | Docker | Instalação Nativa |
|----------|--------|-------------------|
| **Velocidade da IA** | ⚠️ Mais lento (overhead de virtualização) | ✅ Máxima velocidade |
| **Facilidade de gestão** | ✅ `docker compose up/down` | Requer gerenciar processos manualmente |
| **Isolamento** | ✅ Não interfere com o SO | ⚠️ Instala globalmente |
| **GPU/CPU local** | ❌ GPU passthrough complexo no Windows | ✅ Acesso direto à GPU/CPU |
| **Reinício automático** | ✅ `restart: always` no compose | Precisa de pm2 ou Task Scheduler |

### ✅ Recomendação para Seu Caso

**Rode o Ollama de forma NATIVA no Windows** (mais rápido para CPU local).  
**Rode o agente Node.js via Docker** (gerenciamento fácil com `docker compose`).

Dessa forma você tem o melhor dos dois mundos: IA rápida + agente gerenciável.

---

## Parte 1: Instalar o Ollama Nativamente no Windows

### Passo 1 — Baixar e Instalar o Ollama

1. Acesse: **https://ollama.com/download/windows**
2. Clique em **Download for Windows**
3. Execute o instalador `OllamaSetup.exe`
4. Após a instalação, o Ollama ficará ativo na bandeja do sistema (ícone de lhama)

### Passo 2 — Baixar o Modelo de IA

Abra o **PowerShell** ou **Prompt de Comando** e execute:

```powershell
# Verificar se o Ollama está instalado
ollama --version

# Baixar o modelo (tamanho: ~1GB, demora alguns minutos)
ollama pull qwen2.5:1.5b

# Verificar se foi baixado com sucesso
ollama list
```

Saída esperada de `ollama list`:
```
NAME              ID              SIZE    MODIFIED
qwen2.5:1.5b      ...             986 MB  ...
```

### Passo 3 — Testar se o Modelo Responde

```powershell
# Teste rápido de resposta
ollama run qwen2.5:1.5b "Responda apenas: OK"
```

Se retornar `OK`, o modelo está funcionando. ✅

### Passo 4 — Verificar se a API Local Está Ativa

```powershell
# O Ollama expõe uma API REST na porta 11434
# Teste no navegador ou via curl:
curl http://localhost:11434/api/tags
```

Ou simplesmente abra no navegador: **http://localhost:11434**

---

## Parte 2: Rodar o Agente Node.js via Docker

### Passo 1 — Criar o Dockerfile

Crie um arquivo `Dockerfile` na raiz do projeto:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
CMD ["node", "index.js"]
```

### Passo 2 — Criar o docker-compose.yml

```yaml
version: '3.8'

services:
  agente-leadson:
    build: .
    container_name: leadson-agente
    restart: always           # reinicia automaticamente se cair
    env_file:
      - .env                  # carrega suas variáveis do arquivo .env
    extra_hosts:
      - "host.docker.internal:host-gateway"  # permite acessar o Ollama no host Windows
    volumes:
      - ${OBSIDIAN_VAULT_PATH}:/obsidian     # monta a pasta do Obsidian no container
```

> ⚠️ **Atenção:** No `.env`, mude o `OBSIDIAN_VAULT_PATH` para `/obsidian` quando rodar via Docker:
> ```env
> OBSIDIAN_VAULT_PATH=/obsidian
> ```
> E o `OLLAMA_HOST` para:
> ```env
> OLLAMA_HOST=http://host.docker.internal:11434
> ```

### Passo 3 — Subir o Agente

```powershell
# Construir a imagem e iniciar
docker compose up -d

# Ver os logs em tempo real
docker compose logs -f

# Parar o agente
docker compose down
```

---

## Parte 3: Instalação Alternativa — 100% Nativa (sem Docker)

Se preferir rodar tudo nativo (mais simples para começar):

### Pré-requisitos
- **Node.js v18+**: https://nodejs.org/en/download (baixe a versão LTS)
- **Ollama**: Passos da Parte 1 acima

### Verificar instalações

```powershell
node --version     # deve mostrar v18.x.x ou superior
npm --version      # deve mostrar 9.x ou superior
ollama --version   # deve mostrar a versão instalada
```

### Instalar e rodar o agente

```powershell
# Na pasta do projeto
cd "C:\Users\marco\OneDrive\Documentos\BerithCode\LeadsOn"

# Instalar dependências (já feito, mas caso precise)
npm install

# Copiar o template de configuração
copy .env.example .env
# Edite o .env com seus dados (DATABASE_URL, OBSIDIAN_VAULT_PATH)

# Iniciar o agente
npm start

# Ou com hot-reload para desenvolvimento
npm run dev
```

### Manter o agente rodando com pm2 (recomendado para produção nativa)

```powershell
# Instalar o pm2 globalmente
npm install -g pm2

# Iniciar o agente com pm2
pm2 start index.js --name "leadson-agente"

# Configurar para iniciar com o Windows
pm2 startup
pm2 save

# Comandos úteis
pm2 status          # ver status
pm2 logs leadson-agente   # ver logs
pm2 stop leadson-agente   # parar
pm2 restart leadson-agente  # reiniciar
```

---

## Checklist de Validação Completo

```
[ ] Ollama instalado e ícone aparece na bandeja do sistema
[ ] ollama list mostra qwen2.5:1.5b
[ ] http://localhost:11434 responde no navegador
[ ] .env preenchido com DATABASE_URL real
[ ] .env preenchido com OBSIDIAN_VAULT_PATH real
[ ] setup-banco.sql executado no Supabase
[ ] npm start roda sem erros
[ ] Lead de teste aparece processado no Obsidian
```

---

## Solução de Problemas Comuns

| Problema | Causa | Solução |
|---------|-------|---------|
| `Connection refused` no Ollama | Ollama não está rodando | Abrir o app Ollama ou rodar `ollama serve` |
| `SSL certificate` error no Postgres | SSL obrigatório no Supabase | Já tratado no `client.js` com `rejectUnauthorized: false` |
| Arquivo `.md` não aparece no Obsidian | Caminho errado no `.env` | Verificar o `OBSIDIAN_VAULT_PATH` — deve ser o caminho exato da pasta |
| `ReferenceError` no Node | Versão antiga do Node.js | Atualizar para v18+ (`node --version`) |
| Modelo lento | CPU sem aceleração de hardware | Normal para 1.5B — cada lead demora ~5-20s |
