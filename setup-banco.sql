-- ============================================================
-- SETUP DO BANCO DE DADOS — Agente LeadsOn
-- Execute no Supabase SQL Editor ou via psql
-- ============================================================

-- Tabela principal de leads MEI
CREATE TABLE IF NOT EXISTS leads_mei (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_original       TEXT NOT NULL,
  nome_limpo_ia       TEXT,
  whatsapp            TEXT,
  cidade              TEXT,
  estado              CHAR(2),
  segmento            TEXT,
  status_prospeccao   TEXT NOT NULL DEFAULT 'novo',
    -- valores: novo | em_processamento | processado_ia | enviado | convertido | erro_ia
  conteudo_markdown   TEXT,
  instagram           TEXT,
  website             TEXT,
  mensagem_personalizada TEXT,
  tentativas_ia       INT DEFAULT 0,
  erro_mensagem       TEXT,
  criado_em           TIMESTAMPTZ DEFAULT NOW(),
  processado_em       TIMESTAMPTZ
);

-- Índice para o agente buscar rapidamente o próximo lead 'novo'
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads_mei(status_prospeccao);

-- Índice para ordenação por data de criação (fila FIFO)
CREATE INDEX IF NOT EXISTS idx_leads_criado_em ON leads_mei(criado_em ASC);

-- ============================================================
-- LEAD DE TESTE — execute após criar a tabela para validar
-- ============================================================
INSERT INTO leads_mei (nome_original, whatsapp, cidade, estado, segmento)
VALUES ('PINTURA E REFORMA SILVA MEI', '5544999990000', 'Maringá', 'PR', 'Pintor');

-- ============================================================
-- CONSULTAS ÚTEIS PARA MONITORAMENTO
-- ============================================================

-- Ver status de todos os leads
-- SELECT status_prospeccao, COUNT(*) FROM leads_mei GROUP BY status_prospeccao;

-- Ver os últimos leads processados
-- SELECT nome_original, nome_limpo_ia, segmento, status_prospeccao, processado_em
-- FROM leads_mei ORDER BY processado_em DESC LIMIT 20;

-- Ver leads com erro
-- SELECT id, nome_original, erro_mensagem, tentativas_ia
-- FROM leads_mei WHERE status_prospeccao = 'erro_ia';

-- Resetar leads com erro para novo (se quiser reprocessar)
-- UPDATE leads_mei SET status_prospeccao = 'novo', tentativas_ia = 0, erro_mensagem = NULL
-- WHERE status_prospeccao = 'erro_ia';
