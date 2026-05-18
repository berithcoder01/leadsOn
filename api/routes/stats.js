import { pool } from '../../src/db/client.js';

/**
 * Retorna contagens por status para o painel de estatísticas do dashboard.
 */
export async function buscarStats(req, reply) {
  const { rows } = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE status_prospeccao = 'novo')           AS novo,
      COUNT(*) FILTER (WHERE status_prospeccao = 'em_processamento') AS em_processamento,
      COUNT(*) FILTER (WHERE status_prospeccao = 'processado_ia')  AS processado_ia,
      COUNT(*) FILTER (WHERE status_prospeccao = 'enviado')        AS enviado,
      COUNT(*) FILTER (WHERE status_prospeccao = 'convertido')     AS convertido,
      COUNT(*) FILTER (WHERE status_prospeccao = 'erro_ia')        AS erro_ia,
      COUNT(*) AS total
    FROM leads_mei
  `);

  return rows[0];
}
