import React, { useState, useEffect } from 'react';
import { 
  Layout, 
  Typography, 
  Row, 
  Col, 
  Card, 
  Table, 
  Tag, 
  Space, 
  Input, 
  Select, 
  Button, 
  Drawer, 
  Modal, 
  Badge, 
  Divider, 
  message, 
  Tooltip,
  ConfigProvider,
  theme
} from 'antd';
import { 
  UserOutlined, 
  WhatsAppOutlined, 
  InstagramOutlined, 
  GlobalOutlined, 
  SearchOutlined, 
  SendOutlined, 
  CheckCircleOutlined, 
  CloseCircleOutlined, 
  ReloadOutlined, 
  FileTextOutlined,
  CopyOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import axios from 'axios';

const { Header, Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const { Search } = Input;

const API_BASE = 'http://127.0.0.1:3001/api';

// Configurando cores e temas para a BerithCode (foco em Teal/Teal-Dark e Ouro)
const customTheme = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: '#0d9488', // Teal moderno
    colorBgBase: '#0f1115',  // Charcoal premium
    colorTextBase: '#e2e8f0',
    borderRadius: 8,
  },
};

export default function App() {
  const [stats, setStats] = useState({ novo: 0, em_processamento: 0, processado_ia: 0, enviado: 0, convertido: 0, erro_ia: 0, total: 0 });
  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState('');
  
  // Drawer de Detalhes
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Seleção de múltiplos leads
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);

  // Modal de Grupo de Disparo
  const [groupModalVisible, setGroupModalVisible] = useState(false);
  const [dispatchGroup, setDispatchGroup] = useState([]);
  const [groupLoading, setGroupLoading] = useState(false);

  // Carregar dados
  const carregarDados = async () => {
    setLoading(true);
    try {
      // 1. Carrega Estatísticas
      const resStats = await axios.get(`${API_BASE}/stats`);
      setStats(resStats.data);

      // 2. Carrega Leads
      const resLeads = await axios.get(`${API_BASE}/leads`, {
        params: {
          page,
          limit: pageSize,
          busca,
          status: statusFiltro
        }
      });
      setLeads(resLeads.data.leads);
      setTotal(resLeads.data.total);
    } catch (err) {
      message.error('Erro ao conectar à API local. Verifique se o servidor Fastify está rodando!');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [page, pageSize, statusFiltro]);

  // Executar busca de leads ao apertar enter ou buscar
  const handleBusca = () => {
    setPage(1);
    carregarDados();
  };

  // Atualizar status individual
  const alterarStatusLead = async (id, novoStatus) => {
    setActionLoading(true);
    try {
      await axios.patch(`${API_BASE}/leads/${id}`, { status: novoStatus });
      message.success(`Lead atualizado para '${novoStatus}'`);
      
      // Atualiza o lead selecionado se o drawer estiver aberto
      if (selectedLead && selectedLead.id === id) {
        setSelectedLead(prev => ({ ...prev, status_prospeccao: novoStatus }));
      }
      carregarDados();
    } catch (err) {
      message.error('Falha ao atualizar status do lead.');
    } finally {
      setActionLoading(false);
    }
  };

  // Criar grupo de disparo (20 a 50 leads selecionados)
  const processarGrupoDisparo = async () => {
    if (selectedRowKeys.length === 0) return;
    
    // Verifica se todos estão como processado_ia
    const invalidLeads = selectedRows.filter(l => l.status_prospeccao !== 'processado_ia');
    if (invalidLeads.length > 0) {
      message.warning('Apenas leads com status "processado_ia" podem ser selecionados para disparo!');
      return;
    }

    setGroupLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/leads/grupo`, { ids: selectedRowKeys });
      setDispatchGroup(res.data.grupo);
      setGroupModalVisible(true);
      setSelectedRowKeys([]);
      setSelectedRows([]);
      carregarDados();
    } catch (err) {
      message.error(err.response?.data?.erro ?? 'Erro ao criar grupo de disparo.');
    } finally {
      setGroupLoading(false);
    }
  };

  // Copiar mensagem para o clipboard
  const copiarMensagem = (texto) => {
    navigator.clipboard.writeText(texto);
    message.success('Mensagem copiada para a área de transferência! 📋');
  };

  // Definição das colunas da tabela de leads
  const columns = [
    {
      title: 'Nome Tratado',
      dataIndex: 'nome_limpo_ia',
      key: 'nome_limpo_ia',
      render: (text, record) => (
        <span style={{ fontWeight: 600, color: text ? '#e2e8f0' : '#64748b' }}>
          {text || record.nome_original}
        </span>
      ),
    },
    {
      title: 'WhatsApp',
      dataIndex: 'whatsapp',
      key: 'whatsapp',
      render: (text) => text ? (
        <Space>
          <WhatsAppOutlined style={{ color: '#0f973c' }} />
          <span>{text.replace('55', '')}</span>
        </Space>
      ) : <span style={{ color: '#475569' }}>N/A</span>,
    },
    {
      title: 'Cidade',
      dataIndex: 'cidade',
      key: 'cidade',
      render: (text, record) => text ? `${text} - ${record.estado}` : 'Não cadastrado',
    },
    {
      title: 'Segmento',
      dataIndex: 'segmento',
      key: 'segmento',
      render: (text) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'status_prospeccao',
      key: 'status_prospeccao',
      render: (status) => {
        let color = 'default';
        let text = status;
        if (status === 'novo') { color = 'cyan'; text = 'Novo'; }
        if (status === 'em_processamento') { color = 'warning'; text = 'Na IA...'; }
        if (status === 'processado_ia') { color = 'success'; text = 'Pronto p/ Falar'; }
        if (status === 'enviado') { color = 'processing'; text = 'Contato Feito'; }
        if (status === 'convertido') { color = 'gold'; text = 'Convertido 🔥'; }
        if (status === 'erro_ia') { color = 'error'; text = 'Erro de IA'; }
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: 'Ações',
      key: 'acoes',
      render: (_, record) => (
        <Button 
          type="primary" 
          ghost 
          size="small" 
          icon={<SearchOutlined />}
          onClick={() => {
            setSelectedLead(record);
            setDrawerVisible(true);
          }}
        >
          Ver Perfil
        </Button>
      ),
    },
  ];

  // Configuração de seleção de linhas da tabela
  const rowSelection = {
    selectedRowKeys,
    onChange: (keys, rows) => {
      setSelectedRowKeys(keys);
      setSelectedRows(rows);
    },
    getCheckboxProps: (record) => ({
      disabled: record.status_prospeccao !== 'processado_ia', // Apenas permite selecionar prontos
    }),
  };

  return (
    <ConfigProvider theme={customTheme}>
      <Layout style={{ minHeight: '100vh' }}>
        
        {/* Topbar */}
        <Header style={{ background: '#131620', borderBottom: '1px solid #232a3c', height: 70, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ background: 'linear-gradient(135deg, #0d9488, #0b7a70)', width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ThunderboltOutlined style={{ fontSize: 20, color: '#fff' }} />
            </div>
            <div>
              <Title level={4} style={{ margin: 0, fontWeight: 700, color: '#e2e8f0', letterSpacing: '0.5px' }}>LeadsOn</Title>
              <Text style={{ fontSize: 10, color: '#0d9488', fontWeight: 600 }}>BERITHCODE INTELLIGENCE</Text>
            </div>
          </div>
          <Space size="middle">
            <Button icon={<ReloadOutlined />} onClick={carregarDados} loading={loading}>
              Atualizar Painel
            </Button>
          </Space>
        </Header>

        {/* Corpo principal */}
        <Content style={{ padding: '32px 24px', maxWidth: 1400, margin: '0 auto', width: '100%' }}>
          
          {/* Dashboard KPIs */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={12} sm={8} md={4}>
              <Card size="small">
                <Badge status="cyan" text={<Text style={{ fontSize: 12, color: '#94a3b8' }}>Novos Captação</Text>} />
                <Title level={3} style={{ margin: '8px 0 0 0', fontWeight: 700 }}>{stats.novo}</Title>
              </Card>
            </Col>
            <Col xs={12} sm={8} md={4}>
              <Card size="small">
                <Badge status="warning" text={<Text style={{ fontSize: 12, color: '#94a3b8' }}>Processando na IA</Text>} />
                <Title level={3} style={{ margin: '8px 0 0 0', fontWeight: 700 }}>{stats.em_processamento}</Title>
              </Card>
            </Col>
            <Col xs={12} sm={8} md={4}>
              <Card size="small" style={{ borderLeft: '3px solid #0d9488 !important' }}>
                <Badge color="#0d9488" text={<Text style={{ fontSize: 12, color: '#94a3b8' }}>Prontos p/ Falar</Text>} />
                <Title level={3} style={{ margin: '8px 0 0 0', fontWeight: 700, color: '#0d9488' }}>{stats.processado_ia}</Title>
              </Card>
            </Col>
            <Col xs={12} sm={8} md={4}>
              <Card size="small">
                <Badge status="processing" text={<Text style={{ fontSize: 12, color: '#94a3b8' }}>Contatos Feitos</Text>} />
                <Title level={3} style={{ margin: '8px 0 0 0', fontWeight: 700 }}>{stats.enviado}</Title>
              </Card>
            </Col>
            <Col xs={12} sm={8} md={4}>
              <Card size="small">
                <Badge status="gold" text={<Text style={{ fontSize: 12, color: '#94a3b8' }}>Convertidos 🔥</Text>} />
                <Title level={3} style={{ margin: '8px 0 0 0', fontWeight: 700, color: '#ca8a04' }}>{stats.convertido}</Title>
              </Card>
            </Col>
            <Col xs={12} sm={8} md={4}>
              <Card size="small">
                <Badge status="error" text={<Text style={{ fontSize: 12, color: '#94a3b8' }}>Erros IA</Text>} />
                <Title level={3} style={{ margin: '8px 0 0 0', fontWeight: 700, color: '#ef4444' }}>{stats.erro_ia}</Title>
              </Card>
            </Col>
          </Row>

          {/* Filtros e Tabela */}
          <Card>
            <Row gutter={[16, 16]} style={{ marginBottom: 20 }} align="middle" justify="space-between">
              <Col xs={24} md={12}>
                <Space size="middle" style={{ width: '100%' }}>
                  <Search
                    placeholder="Buscar por nome, original ou cidade..."
                    allowClear
                    enterButton={<SearchOutlined />}
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    onSearch={handleBusca}
                    style={{ width: 300 }}
                  />
                  <Select
                    placeholder="Filtrar por Status"
                    allowClear
                    value={statusFiltro || undefined}
                    onChange={(val) => setStatusFiltro(val || '')}
                    style={{ width: 180 }}
                    options={[
                      { value: 'novo', label: 'Novo na fila' },
                      { value: 'em_processamento', label: 'Em processamento' },
                      { value: 'processado_ia', label: 'Pronto para contato (IA)' },
                      { value: 'enviado', label: 'Contato realizado' },
                      { value: 'convertido', label: 'Convertido' },
                      { value: 'erro_ia', label: 'Erro na IA' },
                    ]}
                  />
                </Space>
              </Col>
              
              <Col xs={24} md={12} style={{ textAlign: 'right' }}>
                <Space>
                  {selectedRowKeys.length > 0 && (
                    <Button 
                      type="primary" 
                      icon={<SendOutlined />}
                      onClick={processarGrupoDisparo}
                      loading={groupLoading}
                      style={{ background: '#ca8a04', borderColor: '#ca8a04' }}
                    >
                      Disparar Lote ({selectedRowKeys.length} selecionados)
                    </Button>
                  )}
                </Space>
              </Col>
            </Row>

            <Table 
              rowSelection={rowSelection}
              columns={columns} 
              dataSource={leads.map(l => ({ ...l, key: l.id }))} 
              loading={loading}
              pagination={{
                current: page,
                pageSize: pageSize,
                total: total,
                showSizeChanger: true,
                onChange: (p, ps) => { setPage(p); setPageSize(ps); }
              }}
            />
          </Card>

        </Content>

        {/* DRAWER: Perfil de Lead Único */}
        <Drawer
          title="Perfil Detalhado do Lead"
          placement="right"
          width={550}
          onClose={() => setDrawerVisible(false)}
          visible={drawerVisible}
          extra={
            <Space>
              {selectedLead?.status_prospeccao === 'processado_ia' && (
                <Button 
                  type="primary"
                  icon={<WhatsAppOutlined />}
                  style={{ background: '#0f973c', borderColor: '#0f973c' }}
                  onClick={() => {
                    const text = encodeURIComponent(selectedLead.mensagem_personalizada || '');
                    window.open(`https://api.whatsapp.com/send?phone=${selectedLead.whatsapp}&text=${text}`, '_blank');
                    alterarStatusLead(selectedLead.id, 'enviado');
                  }}
                >
                  Abrir Conversa
                </Button>
              )}
            </Space>
          }
        >
          {selectedLead && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              {/* Card de Informações Base */}
              <div>
                <Title level={4} style={{ margin: 0 }}>{selectedLead.nome_limpo_ia || selectedLead.nome_original}</Title>
                <Text style={{ fontSize: 11, color: '#64748b' }}>Original: {selectedLead.nome_original}</Text>
                <div style={{ marginTop: 10 }}>
                  <Tag color="cyan">{selectedLead.segmento}</Tag>
                  <Tag color="geekblue">{selectedLead.cidade} - {selectedLead.estado}</Tag>
                </div>
              </div>

              <Divider style={{ margin: '8px 0' }} />

              {/* Informações de Contato e Links */}
              <div>
                <Title level={5} style={{ fontSize: 14, color: '#94a3b8', marginBottom: 12 }}>Canais e Redes Sociais</Title>
                <Row gutter={[12, 12]}>
                  {selectedLead.whatsapp && (
                    <Col span={12}>
                      <Card size="small" style={{ background: '#1c2130 !important' }}>
                        <Space>
                          <WhatsAppOutlined style={{ color: '#0f973c', fontSize: 18 }} />
                          <div>
                            <Text style={{ fontSize: 10, display: 'block', color: '#64748b' }}>WhatsApp</Text>
                            <Text style={{ fontSize: 12, fontWeight: 600 }}>{selectedLead.whatsapp.replace('55', '')}</Text>
                          </div>
                        </Space>
                      </Card>
                    </Col>
                  )}
                  {selectedLead.instagram && (
                    <Col span={12}>
                      <Card size="small" style={{ background: '#1c2130 !important', cursor: 'pointer' }} onClick={() => window.open(selectedLead.instagram, '_blank')}>
                        <Space>
                          <InstagramOutlined style={{ color: '#e1306c', fontSize: 18 }} />
                          <div>
                            <Text style={{ fontSize: 10, display: 'block', color: '#64748b' }}>Instagram</Text>
                            <Text style={{ fontSize: 12, fontWeight: 600 }}>Ver Perfil</Text>
                          </div>
                        </Space>
                      </Card>
                    </Col>
                  )}
                  {selectedLead.website && (
                    <Col span={24}>
                      <Card size="small" style={{ background: '#1c2130 !important', cursor: 'pointer' }} onClick={() => window.open(selectedLead.website, '_blank')}>
                        <Space>
                          <GlobalOutlined style={{ color: '#0d9488', fontSize: 18 }} />
                          <div>
                            <Text style={{ fontSize: 10, display: 'block', color: '#64748b' }}>Site do Cliente</Text>
                            <Text style={{ fontSize: 11, fontWeight: 500 }} ellipsis>{selectedLead.website}</Text>
                          </div>
                        </Space>
                      </Card>
                    </Col>
                  )}
                </Row>
              </div>

              <Divider style={{ margin: '8px 0' }} />

              {/* CARD DA MENSAGEM HUMANA GERADA PELA IA */}
              {selectedLead.mensagem_personalizada && (
                <Card 
                  title={
                    <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                      <span style={{ color: '#ca8a04', fontWeight: 700, fontSize: 14 }}>💬 Abordagem Humana Sugerida</span>
                      <Button 
                        size="small" 
                        icon={<CopyOutlined />} 
                        onClick={() => copiarMensagem(selectedLead.mensagem_personalizada)}
                      >
                        Copiar
                      </Button>
                    </Space>
                  }
                  style={{ border: '1px solid #ca8a04 !important', background: '#191715 !important' }}
                >
                  <Paragraph style={{ fontStyle: 'italic', fontSize: 13, color: '#cbd5e1', whiteSpace: 'pre-line', margin: 0 }}>
                    {selectedLead.mensagem_personalizada}
                  </Paragraph>
                </Card>
              )}

              {/* Ações Rápidas de Prospecção */}
              <div>
                <Title level={5} style={{ fontSize: 14, color: '#94a3b8', marginBottom: 12 }}>Ações e Atualização de Status</Title>
                <Space wrap size="small">
                  <Button 
                    type="primary" 
                    icon={<CheckCircleOutlined />} 
                    style={{ background: '#0d9488', borderColor: '#0d9488' }}
                    onClick={() => alterarStatusLead(selectedLead.id, 'convertido')}
                    loading={actionLoading}
                  >
                    Marcar como Convertido 🔥
                  </Button>
                  <Button 
                    icon={<SendOutlined />} 
                    onClick={() => alterarStatusLead(selectedLead.id, 'enviado')}
                    loading={actionLoading}
                  >
                    Marcar como Contatado
                  </Button>
                  <Button 
                    danger 
                    icon={<CloseCircleOutlined />} 
                    onClick={() => alterarStatusLead(selectedLead.id, 'erro_ia')}
                    loading={actionLoading}
                  >
                    Registrar Falha
                  </Button>
                </Space>
              </div>

              {/* Preview do Markdown Técnico */}
              {selectedLead.conteudo_markdown && (
                <div>
                  <Title level={5} style={{ fontSize: 14, color: '#94a3b8', marginBottom: 8 }}>
                    <FileTextOutlined style={{ marginRight: 6 }} /> Arquivo MD Técnico
                  </Title>
                  <pre style={{ background: '#131620', border: '1px solid #232a3c', padding: 12, borderRadius: 8, fontSize: 11, color: '#94a3b8', maxHeight: 200, overflowY: 'auto', margin: 0 }}>
                    {selectedLead.conteudo_markdown}
                  </pre>
                </div>
              )}

            </div>
          )}
        </Drawer>

        {/* MODAL: Grupo de Disparo */}
        <Modal
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <ThunderboltOutlined style={{ color: '#ca8a04', fontSize: 20 }} />
              <span style={{ fontSize: 16, fontWeight: 700 }}>Fila de Disparo em Lote</span>
            </div>
          }
          visible={groupModalVisible}
          onCancel={() => setGroupModalVisible(false)}
          footer={[
            <Button key="close" type="primary" onClick={() => setGroupModalVisible(false)}>
              Concluir Fila
            </Button>
          ]}
          width={800}
        >
          <div style={{ padding: '10px 0' }}>
            <Paragraph style={{ color: '#94a3b8' }}>
              Parabéns! Nós separamos os leads que você selecionou. As mensagens abaixo foram personalizadas
              pela nossa IA de forma nativa e humana para garantir um alto engajamento. Clicar no botão abrirá o WhatsApp Web.
            </Paragraph>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxHeight: 450, overflowY: 'auto', paddingRight: 8 }}>
              {dispatchGroup.map((lead, idx) => (
                <Card 
                  key={lead.id} 
                  size="small" 
                  style={{ background: '#1c2130 !important' }}
                  title={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <Text strong style={{ color: '#e2e8f0' }}>{idx + 1}. {lead.nome} ({lead.segmento}) — {lead.cidade}</Text>
                      <Space>
                        <Button 
                          size="small" 
                          icon={<CopyOutlined />} 
                          onClick={() => copiarMensagem(lead.mensagem_personalizada)}
                        >
                          Copiar Texto
                        </Button>
                        <Button 
                          type="primary" 
                          size="small" 
                          icon={<WhatsAppOutlined />}
                          style={{ background: '#0f973c', borderColor: '#0f973c' }}
                          onClick={() => window.open(lead.whatsapp_link, '_blank')}
                        >
                          Chamar WhatsApp
                        </Button>
                      </Space>
                    </div>
                  }
                >
                  <Paragraph style={{ fontStyle: 'italic', fontSize: 12, color: '#cbd5e1', whiteSpace: 'pre-line', margin: 0 }}>
                    {lead.mensagem_personalizada}
                  </Paragraph>
                </Card>
              ))}
            </div>
          </div>
        </Modal>

      </Layout>
    </ConfigProvider>
  );
}
