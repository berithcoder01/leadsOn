import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import 'dotenv/config';

import { buscarProximoLead, salvarResultadoIA, registrarErroIA } from './db/queries.js';
import { chamarOllama } from './ia/ollama.js';
import { SYSTEM_PROMPT, montarPromptUsuario } from './ia/prompts.js';
import { gerarMarkdown, gerarNomeArquivo } from './utils/template.js';

// Por padrão, salva localmente dentro da pasta do projeto em 'storage/leads'
// Se OBSIDIAN_VAULT_PATH for fornecido, usa ele.
const STORAGE_PATH = process.env.OBSIDIAN_VAULT_PATH || './storage/leads';

/**
 * Garante que a pasta destino dos arquivos Markdown existe antes de escrever.
 */
async function garantirPasta(caminho) {
  await mkdir(caminho, { recursive: true });
}

/**
 * Grava o arquivo .md diretamente na pasta local configurada.
 */
async function gravarMarkdownLocal(nomeLimpo, conteudo) {
  const caminhoPasta = path.resolve(STORAGE_PATH);
  await garantirPasta(caminhoPasta);

  const nomeArquivo = gerarNomeArquivo(nomeLimpo) + '.md';
  const caminhoCompleto = path.join(caminhoPasta, nomeArquivo);

  await writeFile(caminhoCompleto, conteudo, 'utf-8');
  console.log(`📄 Salvo arquivo local: ${nomeArquivo}`);
}

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
    const resultado = await chamarOllama(SYSTEM_PROMPT, montarPromptUsuario(lead));

    const nomeLimpo = resultado.nome_limpo ?? lead.nome_original;
    const segmentoDetectado = resultado.segmento_detectado ?? null;
    const mensagemPersonalizada = resultado.mensagem_personalizada ?? '';
    const markdown = gerarMarkdown(lead, nomeLimpo, segmentoDetectado);

    // Grava o arquivo físico na pasta local proprietária
    await gravarMarkdownLocal(nomeLimpo, markdown);

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
