import { pool } from '../src/db/client.js';

/**
 * Insere um lead na tabela leads_mei de forma segura.
 * Usa ON CONFLICT (whatsapp) para não duplicar leads com o mesmo número.
 * Se o número for vazio, usa nome_original como chave de deduplicação.
 */
export async function inserirLead({ nome_original, whatsapp, cidade, estado, segmento, instagram, website }) {
  // Se não tem WhatsApp, verifica duplicata por nome + cidade
  if (!whatsapp) {
    const { rows } = await pool.query(
      'SELECT id FROM leads_mei WHERE nome_original = $1 AND cidade = $2 LIMIT 1',
      [nome_original, cidade],
    );
    if (rows.length > 0) return { inserido: false, motivo: 'duplicado_sem_whatsapp' };
  }

  const { rowCount } = await pool.query(`
    INSERT INTO leads_mei (nome_original, whatsapp, cidade, estado, segmento, instagram, website, status_prospeccao)
    VALUES ($1, $2, $3, $4, $5, $6, $7, 'novo')
    ON CONFLICT DO NOTHING
  `, [nome_original, whatsapp || null, cidade, estado, segmento, instagram || null, website || null]);

  return { inserido: rowCount > 0, motivo: rowCount > 0 ? 'ok' : 'duplicado' };
}

/**
 * Insere um lote de leads e retorna estatísticas da operação.
 */
export async function inserirLote(leads) {
  let inseridos = 0;
  let duplicados = 0;
  let semWhatsapp = 0;

  for (const lead of leads) {
    if (!lead.whatsapp) semWhatsapp++;
    const { inserido } = await inserirLead(lead);
    if (inserido) inseridos++;
    else duplicados++;
  }

  return { total: leads.length, inseridos, duplicados, semWhatsapp };
}
