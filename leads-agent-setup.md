# Plano de Implementação — Agente LeadsOn

Este documento detalha o plano técnico para implementar o agente local de prospecção de leads MEI utilizando Node.js, PostgreSQL e Ollama (`qwen2.5:1.5b`).

O plano reflete as escolhas de arquitetura aprovadas pelo usuário para máxima performance local, automação e resiliência.

---

## 📋 Escopo do Projeto

O agente rodará localmente e de forma constante (24h por dia) em um ritmo configurável, realizando o seguinte ciclo:
1. Busca o próximo lead com status `novo` no PostgreSQL (usando concorrência segura `FOR UPDATE SKIP LOCKED`).
2. Envia os dados brutos para o Ollama local (`qwen2.5:1.5b`).
3. A IA realiza a limpeza do nome e detecção de segmento de forma estruturada (retornando apenas JSON puro).
4. O Node.js renderiza os dados limpos em um template Markdown.
5. O agente grava o arquivo `.md` resultante diretamente na pasta do Vault do Obsidian configurada.
6. Atualiza o status do lead no banco para `processado_ia`.

---

## 🛠️ Tecnologias e Configuração

* **Runtime:** Node.js (v18+ para suporte a `fetch` nativo)
* **Arquitetura:** Módulos ESM (`"type": "module"`)
* **Banco de Dados:** PostgreSQL (`pg` pool)
* **Processamento de IA:** Ollama local rodando `qwen2.5:1.5b`
* **Persistência de Arquivos:** `fs/promises` nativo para gravação no Obsidian

### Variáveis de Ambiente (`.env`)
```env
DATABASE_URL=postgresql://usuario:senha@host:5432/prospeccao
OLLAMA_HOST=http://localhost:11434
RITMO_CONSTANTE_MS=60000    # Intervalo constante de 1 lead por minuto (24h/dia)
OBSIDIAN_VAULT_PATH=C:/Users/marco/OneDrive/Documentos/Obsidian/Vault/Leads
```

---

## 📁 Estrutura de Arquivos Proposta

```
LeadsOn/
├── src/
│   ├── db/
│   │   ├── client.js          ← Conexão com o banco PostgreSQL
│   │   └── queries.js         ← Queries de busca, sucesso e erro
│   ├── ia/
│   │   ├── ollama.js          ← Wrapper da chamada de IA com resiliência
│   │   └── prompts.js         ← System prompt focado em extração de JSON limpo
│   ├── utils/
│   │   └── template.js        ← Gerador dinâmico de Markdown para o Obsidian
│   ├── processor.js           ← Orquestrador: busca lead → IA → template → salva .md → status db
│   └── scheduler.js           ← Temporizador adaptativo de 24h constante
├── index.js                   ← Ponto de entrada do serviço
├── .env                       ← Configurações locais
├── package.json               ← Gerenciador de dependências e scripts
└── leads-agent-setup.md       ← Este plano de implementação
```

---

## 🏃‍♀️ Plano de Ações (Task Breakdown)

### Fase 1: Fundação & Banco de Dados (P0)
* **Tarefa 1.1:** Instalação e configuração inicial do `package.json` e dependências (`dotenv`, `pg`).
* **Tarefa 1.2:** Configuração do cliente de conexão PostgreSQL (`src/db/client.js`) com tratamento de erro de conexão.
* **Tarefa 1.3:** Implementação das queries seguras (`src/db/queries.js`) para busca concorrente e registro de resultados, corrigindo o bug do plano original (`nomelivpo` -> `nome_limpo`).

### Fase 2: Camada de IA & Extração Estruturada (P1)
* **Tarefa 2.1:** Configuração do prompt do sistema (`src/ia/prompts.js`) focado em retornar apenas a estrutura dos dados (`nome_limpo`, `segmento_detectado`) sem o overhead de renderizar o Markdown completo na IA.
* **Tarefa 2.2:** Criação do cliente Ollama (`src/ia/ollama.js`) com resiliência de parsing para garantir que respostas ligeiramente fora do JSON padrão sejam devidamente tratadas.

### Fase 3: Renderizador & Gravação Direta (P1.5)
* **Tarefa 3.1:** Implementação do gerador de templates Obsidian (`src/utils/template.js`) para processar o Markdown no Node.js.
* **Tarefa 3.2:** Criação do módulo de escrita física de arquivos no Vault do Obsidian (`src/processor.js`), validando caminhos dinâmicos e criando pastas caso não existam.

### Fase 4: Orquestração & Scheduler 24/7 (P2)
* **Tarefa 4.1:** Finalização do `src/processor.js` integrando IA, Banco de Dados, Template e Escrita Física.
* **Tarefa 4.2:** Implementação do scheduler de ritmo constante (`src/scheduler.js`) rodando 24 horas por dia com o intervalo definido em `.env`.

---

## 🛡️ Plano de Verificação

### Testes Manuais
1. **Conexão de Banco:** Verificar se o pool do Postgres conecta com sucesso.
2. **Conexão Ollama:** Validar chamada ao modelo local `qwen2.5:1.5b` no host configurado.
3. **Escrita no Obsidian:** Confirmar se arquivos `.md` são gerados na pasta do Vault com o cabeçalho YAML correto.

---

## ✅ FASE X: CHECKLIST DE ENTREGA
- [ ] Conexão robusta ao PostgreSQL
- [ ] Prompt com foco técnico e alta velocidade
- [ ] Gravação automática no caminho Obsidian Vault
- [ ] Agente rodando 24/7 em ritmo constante configurado no `.env`
