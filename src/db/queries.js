import { pool } from './client.js';

/**
 * Busca o próximo lead disponível com status 'novo' e já o trava (evita processamento duplo em paralelo).
 * Retorna o lead ou null se a fila estiver vazia.
 */
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

/**
 * Salva o resultado do processamento da IA, incluindo o Markdown e a mensagem personalizada.
 */
export async function salvarResultadoIA(id, nomeLimpo, markdown, mensagemPersonalizada) {
  await pool.query(`
    UPDATE leads_mei
    SET
      nome_limpo_ia          = $1,
      conteudo_markdown      = $2,
      mensagem_personalizada = $3,
      status_prospeccao      = 'processado_ia',
      processado_em          = NOW()
    WHERE id = $4
  `, [nomeLimpo, markdown, mensagemPersonalizada, id]);
}

/**
 * Registra falha no processamento e devolve o lead para a fila 'novo' (até 3 tentativas).
 * Se estourar 3 tentativas, o status muda permanentemente para 'erro_ia'.
 */
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

/**
 * Cria a tabela de configuração se não existir e popula o pitch comercial padrão.
 */
export async function iniciarTabelaConfig() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS config_agente (
      chave  TEXT PRIMARY KEY,
      valor  TEXT NOT NULL
    );
  `);
  await pool.query(`
    INSERT INTO config_agente (chave, valor)
    VALUES ('pitch_comercial', 'Oferecer ajuda para aumentar a presença digital e atração de clientes locais específicos para o nicho dele, apresentando de forma sutil a BerithCode como parceira tecnológica.')
    ON CONFLICT (chave) DO NOTHING;
  `);
}

/**
 * Recupera o pitch comercial personalizado salvo no Supabase.
 */
export async function obterPitchComercial() {
  try {
    const { rows } = await pool.query("SELECT valor FROM config_agente WHERE chave = 'pitch_comercial'");
    return rows[0]?.valor ?? 'Oferecer ajuda para aumentar a presença digital e atração de clientes locais específicos para o nicho dele, apresentando de forma sutil a BerithCode como parceira tecnológica.';
  } catch (e) {
    return 'Oferecer ajuda para aumentar a presença digital e atração de clientes locais específicos para o nicho dele, apresentando de forma sutil a BerithCode como parceira tecnológica.';
  }
}
