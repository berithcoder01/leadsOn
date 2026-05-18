import 'dotenv/config';
import { processarUmLead } from './processor.js';

// Intervalo constante em milissegundos (padrão: 60s = 1 lead/minuto)
const INTERVALO_MS = Number(process.env.RITMO_CONSTANTE_MS) || 60_000;

// Pequeno cooldown entre leads quando a fila está ativa (evita sobrecarga da CPU)
const COOLDOWN_MS = 2_000;

let timer = null;
let rodando = false;

/**
 * Loop adaptativo:
 * - Se há leads na fila → processa o próximo após COOLDOWN_MS (2s de respiro)
 * - Se a fila está vazia → aguarda INTERVALO_MS antes de verificar novamente
 *
 * Isso garante que picos de leads (ex: scraper insere 200 de uma vez)
 * sejam processados rapidamente sem travar a CPU quando não há trabalho.
 */
async function ciclo() {
  try {
    const processou = await processarUmLead();
    const espera = processou ? COOLDOWN_MS : INTERVALO_MS;

    const tipoEspera = processou ? `cooldown ${COOLDOWN_MS / 1000}s` : `fila vazia — aguardando ${INTERVALO_MS / 1000}s`;
    console.log(`⏱  ${tipoEspera}`);

    timer = setTimeout(ciclo, espera);
  } catch (err) {
    // Erro inesperado no ciclo (ex: DB offline) — aguarda intervalo completo e tenta novamente
    console.error('💥 Erro inesperado no ciclo:', err.message);
    timer = setTimeout(ciclo, INTERVALO_MS);
  }
}

/**
 * Inicia o agente de prospecção em modo contínuo (24h/dia).
 */
export function iniciarScheduler() {
  if (rodando) return;
  rodando = true;
  console.log('🚀 Agente LeadsOn iniciado.');
  console.log(`   Intervalo quando fila vazia: ${INTERVALO_MS / 1000}s`);
  console.log(`   Cooldown entre leads:        ${COOLDOWN_MS / 1000}s`);
  ciclo();
}

/**
 * Para o agente de prospecção de forma segura.
 */
export function pararScheduler() {
  if (timer) clearTimeout(timer);
  rodando = false;
  console.log('⛔ Agente parado.');
}
