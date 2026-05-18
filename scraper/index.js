/**
 * Scraper Principal — LeadsOn (Google Maps Automizado via Playwright)
 *
 * Roda como um daemon (processo contínuo).
 * Ele acorda, verifica se está na janela de horário (ex: 00:00 às 06:00).
 * Se sim, executa a busca no Google Maps, extrai dados (Tel, Site, Instagram, WhatsApp)
 * e salva na base PostgreSQL. Se não, ele dorme.
 */

import 'dotenv/config';
import { 
  CIDADES_ALVO, 
  TERMOS_ALVO, 
  HORARIO_INICIO, 
  HORARIO_FIM,
  DELAY_ENTRE_REQUISICOES_MS, 
  MAX_LEADS_POR_BUSCA 
} from './config.js';
import { buscarLeadsGoogleMaps } from './sources/googleMaps.js';
import { inserirLote } from './inserter.js';

const args = process.argv.slice(2);
// Flag para forçar a execução agora mesmo, ignorando a trava de horário (útil para testes)
const forceRun = args.includes('--force');

function aguardar(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function verificarHorario() {
  if (forceRun) return true;
  
  const agora = new Date();
  const hora = agora.getHours();
  
  // Se o horário de início for menor que o de fim (ex: 0 a 6)
  if (HORARIO_INICIO < HORARIO_FIM) {
    return hora >= HORARIO_INICIO && hora < HORARIO_FIM;
  } 
  // Se cruzar a meia noite (ex: 22 a 6)
  else {
    return hora >= HORARIO_INICIO || hora < HORARIO_FIM;
  }
}

async function executarRodadaScraping() {
  console.log('\n======================================================');
  console.log(`🌙 Iniciando rodada noturna de Scraping do Google Maps!`);
  console.log('======================================================\n');

  let totalGeral = { inseridos: 0, duplicados: 0, semWhatsapp: 0 };

  for (const cidade of CIDADES_ALVO) {
    console.log(`\n🏙️  Cidade: ${cidade.nome} / ${cidade.estado}`);

    for (const termo of TERMOS_ALVO) {
      console.log(`\n  🔎 Buscando: ${termo}...`);

      try {
        const leads = await buscarLeadsGoogleMaps({
          cidade: cidade.nome,
          estado: cidade.estado,
          termo:  termo,
          limite: MAX_LEADS_POR_BUSCA,
        });

        if (leads.length === 0) {
          console.log('    Nenhum lead encontrado ou falha na extração.');
        } else {
          const stats = await inserirLote(leads);
          totalGeral.inseridos   += stats.inseridos;
          totalGeral.duplicados  += stats.duplicados;
          totalGeral.semWhatsapp += stats.semWhatsapp;

          console.log(
            `    💾 Salvos no DB: ${stats.inseridos} novos | ${stats.duplicados} já existiam | ${stats.semWhatsapp} sem whats`
          );
        }
      } catch (err) {
        console.error(`    ❌ Erro ao buscar ${termo}: ${err.message}`);
      }

      await aguardar(DELAY_ENTRE_REQUISICOES_MS);
    }
  }

  console.log('\n======================================================');
  console.log('✅ Rodada de Scraping concluída!');
  console.log(`   Total novos inseridos: ${totalGeral.inseridos}`);
  console.log(`   Duplicados:            ${totalGeral.duplicados}`);
  console.log('======================================================\n');
}

/**
 * Loop principal do daemon
 */
async function daemonLoop() {
  console.log(`🤖 Daemon de Scraping Iniciado.`);
  console.log(`   Janela de execução configurada: ${HORARIO_INICIO}:00 às ${HORARIO_FIM}:00`);
  
  if (forceRun) {
    console.log(`   ⚠️ MODO FORÇADO: Ignorando trava de horário e executando imediatamente.`);
  }

  while (true) {
    if (verificarHorario()) {
      await executarRodadaScraping();
      
      // Se executou e ainda está no horário (ou foi forçado), 
      // aguarda um longo tempo antes de tentar repetir tudo para não bater no limite do Google.
      // Dorme 1 hora antes de rodar a mesma lista de novo na mesma noite.
      if (!forceRun) {
        console.log(`💤 Rodada finalizada. Dormindo por 1 hora antes de re-verificar...`);
        await aguardar(60 * 60 * 1000); 
      } else {
        console.log(`🛑 Execução forçada concluída. Encerrando processo.`);
        process.exit(0);
      }
    } else {
      // Fora do horário de trabalho, acorda daqui a 30 minutos para checar de novo.
      const agora = new Date().toLocaleTimeString('pt-BR');
      console.log(`[${agora}] 💤 Fora do horário de trabalho (${HORARIO_INICIO}h - ${HORARIO_FIM}h). Dormindo 30 minutos...`);
      await aguardar(30 * 60 * 1000);
    }
  }
}

// Inicia
daemonLoop().catch(err => {
  console.error('💥 Erro fatal no daemon do scraper:', err);
  process.exit(1);
});
