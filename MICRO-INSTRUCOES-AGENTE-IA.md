# Micro Instruções — Agente Node.js + Ollama (Processamento de IA)

> Escopo: processamento local de leads MEI via Ollama.
> Banco separado do propostaerta. Scraper ainda não existe — o agente é desacoplado da origem dos dados.

---

## Estrutura de Pastas do Projeto

```
agente-prospeccao/
├── src/
│   ├── db/
│   │   ├── client.js          ← conexão com o banco de prospecção
│   │   └── queries.js         ← todas as queries isoladas aqui
│   ├── ia/
│   │   ├── ollama.js          ← wrapper da chamada ao Ollama
│   │   └── prompts.js         ← system prompt e montagem do prompt de usuário
│   ├── processor.js           ← orquestra: busca lead → chama IA → salva resultado
│   └── scheduler.js           ← controla o setInterval (ritmo diurno/noturno)
├── index.js                   ← entry point, inicia o scheduler
├── .env                       ← DATABASE_URL, OLLAMA_HOST, RITMO_*
└── package.json
```

---

## Micro Instrução 1 — Banco de Dados (Separado)

**Objetivo:** Criar a tabela de leads e as queries que o agente vai usar.

### 1.1 — Criar o banco

Use PostgreSQL (Supabase free tier é suficiente para começar).

No `.env`:
```env
DATABASE_URL=postgresql://usuario:senha@host:5432/prospeccao
OLLAMA_HOST=http://localhost:11434
RITMO_DIURNO_MS=120000    # 1 lead a cada 2 minutos
RITMO_NOTURNO_MS=30000    # 1 lead a cada 30 segundos
HORA_INICIO_NOTURNO=22    # das 22h às 6h no ritmo acelerado
HORA_FIM_NOTURNO=6
```

### 1.2 — Criar a tabela manualmente (sem ORM por enquanto)

```sql
CREATE TABLE leads_mei (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_original       TEXT NOT NULL,
  nome_limpo_ia       TEXT,
  whatsapp            TEXT,
  cidade              TEXT,
  estado              CHAR(2),
  segmento            TEXT,
  status_prospeccao   TEXT NOT NULL DEFAULT 'novo',
    -- valores: novo | em_processamento | processado_ia | enviado | convertido | erro_ia
  conteudo_markdown   TEXT,
  tentativas_ia       INT DEFAULT 0,
  erro_mensagem       TEXT,
  criado_em           TIMESTAMPTZ DEFAULT NOW(),
  processado_em       TIMESTAMPTZ
);

-- Índice para o agente buscar rapidamente o próximo lead
CREATE INDEX idx_leads_status ON leads_mei(status_prospeccao);
```

### 1.3 — `src/db/client.js`

```js
import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
```

### 1.4 — `src/db/queries.js`

```js
import { pool } from './client.js';

// Busca o próximo lead disponível e já trava ele (evita processamento duplo)
export async function buscarProximoLead() {
  const { rows } = await pool.query(`
    UPDATE leads_mei
    SET status_prospeccao = 'em_processamento'
    WHERE id = (
      SELECT id FROM leads_mei
      WHERE status_prospeccao = 'novo'
      ORDER BY criado_em ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    RETURNING *
  `);
  return rows[0] ?? null;
}

// Salva o resultado da IA com sucesso
export async function salvarResultadoIA(id, nomelimpo, markdown) {
  await pool.query(`
    UPDATE leads_mei
    SET
      nome_limpo_ia       = $1,
      conteudo_markdown   = $2,
      status_prospeccao   = 'processado_ia',
      processado_em       = NOW()
    WHERE id = $3
  `, [nomelivpo, markdown, id]);
}

// Registra falha e devolve o lead para a fila (até 3 tentativas)
export async function registrarErroIA(id, mensagem, tentativas) {
  const novoStatus = tentativas >= 3 ? 'erro_ia' : 'novo';
  await pool.query(`
    UPDATE leads_mei
    SET
      status_prospeccao = $1,
      erro_mensagem     = $2,
      tentativas_ia     = $3
    WHERE id = $4
  `, [novoStatus, mensagem, tentativas + 1, id]);
}
```

> **Ponto de integração com o scraper:** quando o scraper for criado, ele só precisa fazer `INSERT INTO leads_mei (nome_original, whatsapp, cidade, estado, segmento)`. O agente pega o resto.

---

## Micro Instrução 2 — Configuração do Ollama

**Objetivo:** Instalar o modelo e garantir que o agente consiga chamar localmente.

### 2.1 — Instalar Ollama e baixar o modelo

```bash
# Instalar Ollama (Linux/Mac)
curl -fsSL https://ollama.com/install.sh | sh

# Baixar o modelo (melhor custo-benefício para CPU sem GPU dedicada)
ollama pull qwen2.5:1.5b

# Testar se está respondendo
ollama run qwen2.5:1.5b "responda apenas: ok"
```

### 2.2 — `src/ia/ollama.js`

```js
import 'dotenv/config';

const OLLAMA_HOST = process.env.OLLAMA_HOST ?? 'http://localhost:11434';

export async function chamarOllama(systemPrompt, userPrompt) {
  const res = await fetch(`${OLLAMA_HOST}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'qwen2.5:1.5b',
      stream: false,
      options: {
        temperature: 0.1,   // foco técnico, baixa criatividade
        num_predict: 256,   // respostas curtas para economizar CPU
      },
      format: 'json',       // força saída JSON estruturado
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt   },
      ],
    }),
  });

  if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);

  const data = await res.json();
  const texto = data.message?.content ?? '';

  try {
    return JSON.parse(texto);
  } catch {
    throw new Error(`Resposta da IA não é JSON válido: ${texto}`);
  }
}
```

---

## Micro Instrução 3 — Engenharia de Prompts

**Objetivo:** Criar o system prompt determinístico que limpa o nome e gera o bloco Markdown para o Obsidian.

### 3.1 — `src/ia/prompts.js`

```js
export const SYSTEM_PROMPT = `
Você é um processador de dados. Não conversa. Não explica. Não acrescenta comentários.
Recebe um JSON com dados de um MEI e retorna SOMENTE um JSON com os campos abaixo.
Nunca inclua texto fora do JSON.

REGRAS DE LIMPEZA DO NOME:
- Remova sufixos jurídicos: MEI, LTDA, EIRELI, ME, SS, EPP, S/A e variações.
- Remova excesso de maiúsculas: converta para Title Case.
- Remova caracteres especiais desnecessários.
- Se o nome contiver ofício claro (ex: "PINTURA SILVA"), extraia o ofício para o campo segmento_detectado.
- Se não conseguir limpar, repita o nome_original no nome_limpo.

FORMATO DE SAÍDA OBRIGATÓRIO (JSON puro, sem markdown, sem backticks):
{
  "nome_limpo": "string",
  "segmento_detectado": "string ou null",
  "markdown": "string com o bloco completo formatado conforme template"
}

TEMPLATE DO MARKDOWN (preencha com os dados recebidos):
---
nome: {{nome_limpo}}
whatsapp: {{whatsapp}}
cidade: {{cidade}}
estado: {{estado}}
segmento: {{segmento}}
status: Novo
---

# {{nome_limpo}}

- 📍 {{cidade}} / {{estado}}
- 📱 {{whatsapp}}
- 🔧 {{segmento}}
- 🔗 [Abrir WhatsApp](https://api.whatsapp.com/send?phone={{whatsapp}})

## Notas
_Sem notas ainda._
`.trim();

export function montarPromptUsuario(lead) {
  return JSON.stringify({
    nome_original: lead.nome_original,
    whatsapp:      lead.whatsapp,
    cidade:        lead.cidade,
    estado:        lead.estado,
    segmento:      lead.segmento,
  });
}
```

---

## Micro Instrução 4 — Processor (Orquestrador)

**Objetivo:** Unir banco + IA em um único ciclo de processamento.

### `src/processor.js`

```js
import { buscarProximoLead, salvarResultadoIA, registrarErroIA } from './db/queries.js';
import { chamarOllama } from './ia/ollama.js';
import { SYSTEM_PROMPT, montarPromptUsuario } from './ia/prompts.js';

export async function processarUmLead() {
  const lead = await buscarProximoLead();

  if (!lead) {
    console.log(`[${new Date().toLocaleTimeString()}] Nenhum lead novo na fila.`);
    return;
  }

  console.log(`[${new Date().toLocaleTimeString()}] Processando: ${lead.nome_original}`);

  try {
    const resultado = await chamarOllama(SYSTEM_PROMPT, montarPromptUsuario(lead));

    await salvarResultadoIA(
      lead.id,
      resultado.nome_limpo,
      resultado.markdown,
    );

    console.log(`✅ Salvo: ${resultado.nome_limpo}`);
  } catch (err) {
    console.error(`❌ Erro no lead ${lead.id}:`, err.message);
    await registrarErroIA(lead.id, err.message, lead.tentativas_ia);
  }
}
```

---

## Micro Instrução 5 — Scheduler (Controle de Ritmo)

**Objetivo:** Processar de forma cadenciada para não engargalar a CPU, acelerando à noite.

### `src/scheduler.js`

```js
import 'dotenv/config';
import { processarUmLead } from './processor.js';

const DIURNO  = Number(process.env.RITMO_DIURNO_MS)  || 120_000; // 2 min
const NOTURNO = Number(process.env.RITMO_NOTURNO_MS) || 30_000;  // 30 seg
const H_INICIO = Number(process.env.HORA_INICIO_NOTURNO) || 22;
const H_FIM    = Number(process.env.HORA_FIM_NOTURNO)    || 6;

function ehHorarioNoturno() {
  const hora = new Date().getHours();
  return hora >= H_INICIO || hora < H_FIM;
}

function intervaloAtual() {
  return ehHorarioNoturno() ? NOTURNO : DIURNO;
}

let timer = null;

function agendar() {
  const intervalo = intervaloAtual();
  console.log(`⏱  Próximo ciclo em ${intervalo / 1000}s (${ehHorarioNoturno() ? 'noturno' : 'diurno'})`);
  timer = setTimeout(async () => {
    await processarUmLead();
    agendar(); // reagenda após cada ciclo (permite ajuste dinâmico do ritmo)
  }, intervalo);
}

export function iniciarScheduler() {
  console.log('🚀 Agente de prospecção iniciado.');
  agendar();
}

export function pararScheduler() {
  if (timer) clearTimeout(timer);
  console.log('⛔ Agente parado.');
}
```

### `index.js`

```js
import { iniciarScheduler } from './src/scheduler.js';
iniciarScheduler();
```

### `package.json` (essencial)

```json
{
  "name": "agente-prospeccao",
  "type": "module",
  "scripts": {
    "start": "node index.js",
    "dev": "node --watch index.js"
  },
  "dependencies": {
    "dotenv": "^16.0.0",
    "pg": "^8.11.0"
  }
}
```

---

## Ordem de Execução para Subir o Agente

```bash
# 1. Instalar dependências
npm install

# 2. Garantir que o Ollama está rodando
ollama serve &

# 3. Criar a tabela no banco (rodar o SQL da Instrução 1.2 no Supabase/psql)

# 4. Inserir um lead de teste manualmente
# INSERT INTO leads_mei (nome_original, whatsapp, cidade, estado, segmento)
# VALUES ('PINTURA E REFORMA SILVA MEI', '5544999990000', 'Maringá', 'PR', 'Pintor');

# 5. Iniciar o agente
npm start
```

---

## Checklist de Validação

- [ ] Ollama responde em `http://localhost:11434`
- [ ] Modelo `qwen2.5:1.5b` baixado (`ollama list`)
- [ ] Banco conecta sem erro (`pool.query('SELECT 1')`)
- [ ] Tabela `leads_mei` criada com o índice
- [ ] Lead de teste inserido com `status_prospeccao = 'novo'`
- [ ] Agente processa o lead e salva `conteudo_markdown` corretamente
- [ ] Lead com erro após 3 tentativas fica com status `erro_ia` (não fica em loop)

---

## Próximos Passos (fora deste escopo)

- **Scraper:** quando pronto, só precisa fazer INSERT na tabela — zero mudança no agente
- **Painel Ant Design:** consome a tabela para exibir status e exportar `.zip` dos markdowns
- **Obsidian:** recebe o `.zip` extraído no vault, Dataview filtra os leads do dia
