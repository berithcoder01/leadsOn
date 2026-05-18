import 'dotenv/config';

const OLLAMA_HOST = process.env.OLLAMA_HOST ?? 'http://localhost:11434';
const MODEL = 'qwen2.5:1.5b';

/**
 * Tenta extrair um objeto JSON válido de uma string que pode conter
 * texto extra antes/depois das chaves (resiliência contra modelos pequenos).
 */
function extrairJSON(texto) {
  const inicio = texto.indexOf('{');
  const fim = texto.lastIndexOf('}');
  if (inicio === -1 || fim === -1) throw new Error(`Nenhum JSON encontrado na resposta: ${texto}`);
  return JSON.parse(texto.slice(inicio, fim + 1));
}

/**
 * Chama o modelo Ollama local e retorna o objeto JSON parseado.
 * Inclui resiliência contra JSON ligeiramente malformado.
 */
export async function chamarOllama(systemPrompt, userPrompt) {
  const res = await fetch(`${OLLAMA_HOST}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      stream: false,
      options: {
        temperature: 0.1,  // foco técnico, baixa criatividade
        num_predict: 128,  // resposta curta (apenas nome_limpo + segmento_detectado)
      },
      format: 'json',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt   },
      ],
    }),
  });

  if (!res.ok) throw new Error(`Ollama HTTP ${res.status}: ${await res.text()}`);

  const data = await res.json();
  const texto = data.message?.content ?? '';

  return extrairJSON(texto);
}
