import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';

import { listarLeads, buscarLead, atualizarStatus, criarGrupoDisparo, excluirLead } from './routes/leads.js';
import { buscarStats } from './routes/stats.js';
import { 
  obterStatusProcessos, 
  iniciarScraperProcesso, 
  pararScraperProcesso, 
  iniciarAgentProcesso, 
  pararAgentProcesso, 
  fazerStreamingLogs 
} from './routes/processes.js';

const PORT = Number(process.env.API_PORT) || 3001;
const app = Fastify({ logger: true });

// CORS liberado para o dashboard local (localhost:5173 do Vite)
await app.register(cors, {
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
});

// ── Rotas de Leads ──────────────────────────────────────────
app.get('/api/leads',             listarLeads);
app.get('/api/leads/:id',         buscarLead);
app.patch('/api/leads/:id',       atualizarStatus);
app.delete('/api/leads/:id',      excluirLead);
app.post('/api/leads/grupo',      criarGrupoDisparo);

// ── Rotas de Estatísticas ───────────────────────────────────
app.get('/api/stats',             buscarStats);

// ── Rotas de Controle de Processos (Daemon Integrado) ───────
app.get('/api/processes/status',        obterStatusProcessos);
app.post('/api/processes/scraper/start', iniciarScraperProcesso);
app.post('/api/processes/scraper/stop',  pararScraperProcesso);
app.post('/api/processes/agent/start',   iniciarAgentProcesso);
app.post('/api/processes/agent/stop',    pararAgentProcesso);
app.get('/api/processes/logs',           fazerStreamingLogs);

// ── Health Check ────────────────────────────────────────────
app.get('/health', async () => ({ ok: true, timestamp: new Date().toISOString() }));

// ── Iniciar ─────────────────────────────────────────────────
try {
  await app.listen({ port: PORT, host: '127.0.0.1' });
  console.log(`🌐 API LeadsOn rodando em http://127.0.0.1:${PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
