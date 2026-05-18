import 'dotenv/config';

import { buscarProximoLead, salvarResultadoIA, registrarErroIA, obterPitchComercial } from './db/queries.js';
import { chamarOllama } from './ia/ollama.js';
import { montarSystemPrompt, montarPromptUsuario } from './ia/prompts.js';
import { gerarMarkdown } from './utils/template.js';


/**
 * Ciclo principal: busca 1 lead → processa com IA → gera Markdown → grava arquivo local → atualiza banco com mensagem personalizada.
 * Retorna true se processou um lead, false se a fila estava vazia.
 */
export async function processarUmLead() {
  const lead = await buscarProximoLead();

  if (!lead) {
    return false;  // fila vazia
  }

  const hora = new Date().toLocaleTimeString('pt-BR');
  console.log(`[${hora}] ⚙️  Processando: ${lead.nome_original}`);

  try {
    const pitch = await obterPitchComercial();
    const systemPrompt = montarSystemPrompt(pitch);
    const resultado = await chamarOllama(systemPrompt, montarPromptUsuario(lead));

    const nomeLimpo = resultado.nome_limpo ?? lead.nome_original;
    const segmentoDetectado = resultado.segmento_detectado ?? null;
    const mensagemPersonalizada = resultado.mensagem_personalizada ?? '';
    const markdown = gerarMarkdown(lead, nomeLimpo, segmentoDetectado);



    // Salva tudo no banco de dados, incluindo a mensagem personalizada
    await salvarResultadoIA(lead.id, nomeLimpo, markdown, mensagemPersonalizada);

    console.log(`[${hora}] ✅ ${nomeLimpo} (${segmentoDetectado ?? lead.segmento})`);
    return true;
  } catch (err) {
    console.error(`[${hora}] ❌ Erro no lead ${lead.id}:`, err.message);
    await registrarErroIA(lead.id, err.message, lead.tentativas_ia ?? 0);
    return false;
  }
}
