/**
 * Renderiza o template Markdown para o Obsidian a partir dos dados do lead
 * e do resultado limpo da IA. O Node.js faz isso — não a IA —
 * para máxima velocidade e ausência de erros de escape JSON.
 */
export function gerarMarkdown(lead, nomeLimpo, segmentoDetectado) {
  const segmento = segmentoDetectado ?? lead.segmento ?? 'Não informado';
  const whatsapp = (lead.whatsapp ?? '').replace(/\D/g, '');
  const data = new Date().toISOString().slice(0, 10);

  return `---
nome: ${nomeLimpo}
whatsapp: "${whatsapp}"
cidade: ${lead.cidade ?? ''}
estado: ${lead.estado ?? ''}
segmento: ${segmento}
status: Novo
data_processamento: ${data}
---

# ${nomeLimpo}

- 📍 ${lead.cidade ?? '?'} / ${lead.estado ?? '?'}
- 📱 ${whatsapp}
- 🔧 ${segmento}
- 🔗 [Abrir WhatsApp](https://api.whatsapp.com/send?phone=${whatsapp})

## Notas
_Sem notas ainda._
`.trim();
}

/**
 * Gera o nome de arquivo seguro para o Obsidian a partir do nome limpo.
 * Remove caracteres inválidos no sistema de arquivos Windows/macOS/Linux.
 */
export function gerarNomeArquivo(nomeLimpo) {
  return nomeLimpo
    .replace(/[<>:"/\\|?*]/g, '')  // caracteres inválidos em FS
    .replace(/\s+/g, '_')
    .slice(0, 100);                 // limite de comprimento
}
