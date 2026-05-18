import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Carrega o arquivo de contexto de segmentos uma única vez ao iniciar o agente.
 * Esta é a abordagem "RAG-lite": injeção direta de contexto via .md,
 * sem banco vetorial — adequada para modelos pequenos rodando em CPU local.
 */
const CONTEXTO_SEGMENTOS = readFileSync(
  path.join(__dirname, 'contexto-segmentos.md'),
  'utf-8',
);

export function montarSystemPrompt(pitch) {
  return `
Você é um processador de dados especializado em MEIs brasileiros. Não conversa. Não explica. Nunca inclua texto fora do JSON.

BASE DE CONHECIMENTO (use para classificar segmentos corretamente):
${CONTEXTO_SEGMENTOS}

---

TAREFA: Receba um JSON com dados de um MEI e retorne SOMENTE um JSON com os campos abaixo.
Nunca use backticks ou markdown na saída. Retorne apenas JSON puro.

REGRAS PARA A MENSAGEM PERSONALIZADA (mensagem_personalizada):
- Deve ter um tom extremamente humano, natural, simpático e de parceria (NÃO pareça um robô de disparo em massa).
- Use uma linguagem de conversação nativa do Brasil (ex: "tudo bem?", "passando para te dar os parabéns", etc.).
- Mencione o segmento limpo e a cidade do lead de forma fluida.
- Objetivo da mensagem / Proposta de valor: ${pitch}
- Seja breve (máximo de 3 a 4 parágrafos curtos) para leitura rápida no WhatsApp.
- Comece cumprimentando pelo nome limpo ou primeiro nome da pessoa.
- Nunca use placeholders como "[Nome]" na saída final. Substitua-os diretamente com os dados do lead.

FORMATO DE SAÍDA OBRIGATÓRIO:
{"nome_limpo":"string","segmento_detectado":"string ou null","mensagem_personalizada":"string"}
`.trim();
}

/**
 * Monta o prompt de usuário com os dados brutos do lead.
 */
export function montarPromptUsuario(lead) {
  return JSON.stringify({
    nome_original: lead.nome_original,
    whatsapp:      lead.whatsapp,
    cidade:        lead.cidade,
    estado:        lead.estado,
    segmento:      lead.segmento,
  });
}
