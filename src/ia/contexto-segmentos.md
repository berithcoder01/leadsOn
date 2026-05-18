# Base de Conhecimento — Segmentos de MEI

> Este arquivo é injetado no system prompt do agente de IA.
> Ele fornece exemplos reais para evitar alucinações na classificação de segmento.
> Adicione novos exemplos sempre que encontrar casos não cobertos.

## Regras de Limpeza de Nome

- Remova sufixos jurídicos: MEI, LTDA, EIRELI, ME, SS, EPP, S/A e variações (incluindo com pontos e barras)
- Converta para Title Case: "MARCOS SILVA" → "Marcos Silva"
- Se o nome contém o ofício (ex: "PINTURA SILVA"), extraia o ofício para segmento_detectado
- Se não conseguir limpar, repita o nome_original no nome_limpo

## Mapeamento de Segmentos (Exemplos para Referência)

### Construção Civil e Reforma
- PINTURA E REFORMA SILVA MEI → segmento: Pintor
- CONSTRUÇÕES OLIVEIRA MEI → segmento: Pedreiro
- HIDRÁULICA SANTOS → segmento: Encanador
- ELÉTRICA COSTA MEI → segmento: Eletricista
- GESSEIRO PEREIRA → segmento: Gesseiro
- MARCENARIA LIMA → segmento: Marceneiro
- SERRALHERIA ALVES → segmento: Serralheiro
- PISO E REVESTIMENTO MELO → segmento: Azulejista

### Serviços Gerais e Manutenção
- AR CONDICIONADO ROCHA → segmento: Técnico em Ar-condicionado
- REFRIGERAÇÃO BARBOSA → segmento: Técnico em Refrigeração
- JARDINAGEM SOUZA MEI → segmento: Jardineiro
- DESENTUPIDORA FERREIRA → segmento: Desentupidor
- LIMPEZA E CONSERVAÇÃO GOMES → segmento: Limpeza

### Alimentação e Gastronomia
- SALGADOS E DOCES RIBEIRO → segmento: Confeiteiro
- MARMITEX CARVALHO → segmento: Fornecedor de Marmitas
- CHURRASQUEIRO EVENTOS TEIXEIRA → segmento: Churrasqueiro
- LANCHONETE MONTEIRO → segmento: Lanchonete

### Saúde e Estética
- CABELEIREIRO DIAS MEI → segmento: Cabeleireiro
- MANICURE PEDICURE NUNES → segmento: Manicure
- DEPILAÇÃO CASTRO → segmento: Depiladora
- MASSAGISTA MOREIRA → segmento: Massagista

### Transporte e Logística
- MOTOTAXI SILVA → segmento: Mototaxista
- FRETE E MUDANÇA ARAÚJO → segmento: Freteiro
- ENTREGADOR AUTÔNOMO RAMOS → segmento: Entregador

### Tecnologia e Serviços Digitais
- SUPORTE TI CORREIA → segmento: Técnico em TI
- DESENVOLVIMENTO WEB PINTO → segmento: Desenvolvedor
- DESIGNER GRÁFICO CUNHA → segmento: Designer

### Comércio
- COMERCIO DE ROUPAS NASCIMENTO → segmento: Vendedor de Roupas
- DISTRIBUIDORA CAVALCANTI → segmento: Distribuidor
- ARTESANATO LOPES → segmento: Artesão

## Instruções de Prioridade

1. Se o segmento fornecido nos dados já está preenchido e é consistente com o nome → use-o como base
2. Se o nome original dá mais informação que o campo segmento → prefira o detectado pelo nome
3. Em caso de dúvida → retorne null no segmento_detectado e preserve o segmento original
4. Nunca invente um segmento que não esteja claramente indicado nos dados
