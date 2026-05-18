import { processManager } from '../processManager.js';

// ─────────────────────────────────────────────
// Retorna o status de execução de ambos os processos
// ─────────────────────────────────────────────
export async function obterStatusProcessos(req, reply) {
  return processManager.getStatus();
}

// ─────────────────────────────────────────────
// Liga/Desliga o Scraper Noturno
// ─────────────────────────────────────────────
export async function iniciarScraperProcesso(req, reply) {
  const { force } = req.body || {};
  try {
    processManager.startScraper(!!force);
    return { ok: true, msg: 'Scraper iniciado com sucesso!' };
  } catch (err) {
    return reply.code(400).send({ erro: err.message });
  }
}

export async function pararScraperProcesso(req, reply) {
  try {
    processManager.stopScraper();
    return { ok: true, msg: 'Scraper parado com sucesso!' };
  } catch (err) {
    return reply.code(400).send({ erro: err.message });
  }
}

// ─────────────────────────────────────────────
// Liga/Desliga o Agente Ollama
// ─────────────────────────────────────────────
export async function iniciarAgentProcesso(req, reply) {
  try {
    processManager.startAgent();
    return { ok: true, msg: 'Agente Ollama iniciado com sucesso!' };
  } catch (err) {
    return reply.code(400).send({ erro: err.message });
  }
}

export async function pararAgentProcesso(req, reply) {
  try {
    processManager.stopAgent();
    return { ok: true, msg: 'Agente Ollama parado com sucesso!' };
  } catch (err) {
    return reply.code(400).send({ erro: err.message });
  }
}

// ─────────────────────────────────────────────
// Server-Sent Events (SSE) para fazer streaming dos logs
// ─────────────────────────────────────────────
export function fazerStreamingLogs(req, reply) {
  // Configura headers do EventStream para persistir a conexão
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  // Envia primeiro o histórico de logs acumulados em memória para o frontend não começar em branco
  const historico = processManager.getLogs();
  
  for (const log of historico.scraper) {
    reply.raw.write(`data: ${JSON.stringify({ type: 'scraper', log })}\n\n`);
  }
  for (const log of historico.agent) {
    reply.raw.write(`data: ${JSON.stringify({ type: 'agent', log })}\n\n`);
  }

  // Listener para novos logs em tempo real
  const logListener = (event) => {
    reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  processManager.on('log', logListener);

  // Se o cliente fechar a aba/conexão, removemos o listener para evitar vazamento de memória
  req.raw.on('close', () => {
    processManager.off('log', logListener);
  });
}
