/**
 * Fonte de Dados: Brasil.io — CNPJ da Receita Federal
 *
 * A API do Brasil.io expõe os dados públicos da Receita Federal de forma
 * estruturada e gratuita. Permite filtrar por município, CNAE e porte da empresa.
 *
 * Documentação: https://brasil.io/api/datasets/
 * Dataset CNPJ: https://brasil.io/dataset/socios-brasil/
 *
 * IMPORTANTE: Requer token de autenticação gratuito.
 * Cadastre-se em https://brasil.io/auth/entrar/ e gere seu token.
 * Adicione ao .env: BRASIL_IO_TOKEN=seu_token_aqui
 */

import 'dotenv/config';

const BASE_URL = 'https://brasil.io/api/dataset/socios-brasil/companies/';
const TOKEN = process.env.BRASIL_IO_TOKEN ?? '';

/**
 * Busca empresas ativas na API do Brasil.io filtradas por cidade e CNAE.
 * Retorna array de objetos normalizados prontos para inserção na tabela leads_mei.
 */
export async function buscarMEIsPorCidadeCNAE({ cidade, estado, cnae, segmentoLabel, limite = 100 }) {
  if (!TOKEN) {
    throw new Error('BRASIL_IO_TOKEN não configurado no .env. Cadastre-se em https://brasil.io/auth/entrar/');
  }

  const params = new URLSearchParams({
    city:               cidade,
    state:              estado,
    cnae_fiscal:        cnae,
    company_type:       'Empresário Individual',   // inclui MEI
    situation:          'ATIVA',
    page_size:          String(limite),
  });

  const url = `${BASE_URL}?${params.toString()}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Token ${TOKEN}`,
      'User-Agent':  'LeadsOn-Scraper/1.0 (uso interno BerithCode)',
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Brasil.io retornou HTTP ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();

  // Normaliza para o formato esperado pela tabela leads_mei
  return (data.results ?? []).map(empresa => ({
    nome_original: empresa.name ?? '',
    whatsapp:      normalizarTelefone(empresa.phone ?? empresa.phone2 ?? ''),
    cidade:        titleCase(empresa.city ?? cidade),
    estado:        empresa.state ?? estado,
    segmento:      segmentoLabel,
  })).filter(lead => lead.nome_original.trim().length > 0);
}

/**
 * Normaliza número de telefone para formato internacional sem símbolos.
 * Ex: "(44) 99999-0000" → "5544999990000"
 */
function normalizarTelefone(raw) {
  if (!raw) return '';
  const digitos = raw.replace(/\D/g, '');
  if (digitos.length === 0) return '';
  // Adiciona DDI 55 (Brasil) se não estiver presente
  if (digitos.startsWith('55') && digitos.length >= 12) return digitos;
  return `55${digitos}`;
}

function titleCase(str) {
  return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}
