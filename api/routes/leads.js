import { pool } from '../src/db/client.js';

// ─────────────────────────────────────────────
// Listar leads com filtros, busca e paginação
// ─────────────────────────────────────────────
export async function listarLeads(req, reply) {
  const {
    status = '',
    busca  = '',
    page   = 1,
    limit  = 50,
  } = req.query;

  const offset = (Number(page) - 1) * Number(limit);
  const params = [];
  const condicoes = [];

  if (status) {
    params.push(status);
    condicoes.push(`status_prospeccao = $${params.length}`);
  }

  if (busca) {
    params.push(`%${busca}%`);
    condicoes.push(`(nome_original ILIKE $${params.length} OR nome_limpo_ia ILIKE $${params.length} OR cidade ILIKE $${params.length})`);
  }

  const where = condicoes.length > 0 ? `WHERE ${condicoes.join(' AND ')}` : '';

  params.push(Number(limit));
  params.push(offset);

  const { rows } = await pool.query(`
    SELECT
      id, nome_original, nome_limpo_ia, whatsapp, cidade, estado,
      segmento, status_prospeccao, instagram, website, mensagem_personalizada,
      tentativas_ia, criado_em, processado_em
    FROM leads_mei
    ${where}
    ORDER BY criado_em DESC
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `, params);

  // Total para paginação do frontend
  const paramsCount = params.slice(0, params.length - 2);
  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*) AS total FROM leads_mei ${where}`,
    paramsCount,
  );

  return { leads: rows, total: Number(countRows[0].total), page: Number(page), limit: Number(limit) };
}

// ─────────────────────────────────────────────
// Buscar lead único com markdown completo
// ─────────────────────────────────────────────
export async function buscarLead(req, reply) {
  const { id } = req.params;
  const { rows } = await pool.query('SELECT * FROM leads_mei WHERE id = $1', [id]);

  if (!rows[0]) return reply.code(404).send({ erro: 'Lead não encontrado' });
  return rows[0];
}

// ─────────────────────────────────────────────
// Atualizar status de um lead (enviado / convertido / etc.)
// ─────────────────────────────────────────────
export async function atualizarStatus(req, reply) {
  const { id } = req.params;
  const { status } = req.body;

  const statusPermitidos = ['novo', 'processado_ia', 'enviado', 'convertido', 'erro_ia'];
  if (!statusPermitidos.includes(status)) {
    return reply.code(400).send({ erro: `Status inválido. Permitidos: ${statusPermitidos.join(', ')}` });
  }

  const { rowCount } = await pool.query(
    'UPDATE leads_mei SET status_prospeccao = $1 WHERE id = $2',
    [status, id],
  );

  if (rowCount === 0) return reply.code(404).send({ erro: 'Lead não encontrado' });
  return { ok: true, status };
}

// ─────────────────────────────────────────────
// Criar grupo de disparo (20-50 leads selecionados)
// Retorna os dados formatados prontos para ação de contato
// ─────────────────────────────────────────────
export async function criarGrupoDisparo(req, reply) {
  const { ids } = req.body;  // array de UUIDs

  if (!Array.isArray(ids) || ids.length < 1 || ids.length > 50) {
    return reply.code(400).send({ erro: 'Envie entre 1 e 50 IDs de leads.' });
  }

  const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
  const { rows } = await pool.query(`
    SELECT id, nome_limpo_ia, whatsapp, cidade, estado, segmento, status_prospeccao, instagram, website, mensagem_personalizada
    FROM leads_mei
    WHERE id IN (${placeholders}) AND status_prospeccao = 'processado_ia'
    ORDER BY nome_limpo_ia
  `, ids);

  if (rows.length === 0) {
    return reply.code(404).send({ erro: 'Nenhum lead processado encontrado com os IDs informados.' });
  }

  // Marca todos como 'enviado'
  await pool.query(
    `UPDATE leads_mei SET status_prospeccao = 'enviado' WHERE id IN (${placeholders})`,
    ids,
  );

  return {
    total: rows.length,
    grupo: rows.map(lead => ({
      id:                    lead.id,
      nome:                  lead.nome_limpo_ia ?? lead.nome_original,
      whatsapp:              lead.whatsapp,
      cidade:                lead.cidade,
      estado:                lead.estado,
      segmento:              lead.segmento,
      instagram:             lead.instagram,
      website:               lead.website,
      mensagem_personalizada: lead.mensagem_personalizada,
      whatsapp_link:         `https://api.whatsapp.com/send?phone=${(lead.whatsapp ?? '').replace(/\D/g, '')}&text=${encodeURIComponent(lead.mensagem_personalizada ?? '')}`,
    })),
  };
}
