/**
 * Configuração do Scraper — Cidades e Segmentos Alvo
 *
 * Para adicionar uma cidade: inclua o nome exatamente como aparece no IBGE (maiúsculo)
 * Para adicionar um segmento: inclua o código CNAE de 7 dígitos e o label legível
 *
 * CNAEs de referência — Serviços para MEI:
 *  4321-5/00  Instalação e manutenção elétrica
 *  4322-3/01  Instalações hidráulicas, sanitárias e de gás
 *  4322-3/04  Instalação e manutenção de ar-condicionado
 *  4329-1/04  Instalação de equipamentos de refrigeração
 *  4330-4/04  Serviços de pintura de edifícios em geral
 *  4330-4/02  Obras de alvenaria
 *  4399-1/99  Serviços especializados de construção
 *  9609-2/99  Outras atividades de serviços pessoais (faxina, diarista)
 *  4322-3/03  Instalações de sistema de prevenção contra incêndio
 *  3321-0/00  Instalação de máquinas e equipamentos industriais
 */

export const CIDADES_ALVO = [
  { nome: 'Maringá',  estado: 'PR' },
  { nome: 'Marialva', estado: 'PR' },
  { nome: 'Sarandi',  estado: 'PR' },
  { nome: 'Paiçandu', estado: 'PR' },
];

export const TERMOS_ALVO = [
  'Eletricista',
  'Encanador',
  'Instalador de Ar condicionado',
  'Técnico em Refrigeração',
  'Pintor',
  'Pedreiro',
  'Serviços de Construção em Geral',
];

// Configuração da janela noturna
export const HORARIO_INICIO = 0; // Meia-noite
export const HORARIO_FIM = 6;    // 6 da manhã

// Intervalo entre buscas de diferentes segmentos na mesma cidade
export const DELAY_ENTRE_REQUISICOES_MS = 5000;

// Máximo de leads por combinação cidade+segmento por rodada
export const MAX_LEADS_POR_BUSCA = 100;
