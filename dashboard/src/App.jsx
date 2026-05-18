import React, { useState, useEffect, useRef } from 'react';
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
  ConfigProvider,
  theme,
  Tabs
} from 'antd';
import { 
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
  ThunderboltOutlined,
  CodeOutlined,
  ControlOutlined,
  PlayCircleOutlined,
  StopOutlined,
  DeleteOutlined,
  SettingOutlined
} from '@ant-design/icons';
import axios from 'axios';

const { Header, Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const { Search } = Input;

const API_BASE = 'http://127.0.0.1:3001/api';

const customTheme = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: '#0d9488', // Teal
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

  // ==========================================
  // ESTADO DOS PROCESSOS (DAEMON / LOGS)
  // ==========================================
  const [processStatus, setProcessStatus] = useState({ scraper: 'stopped', agent: 'stopped' });
  const [scraperLogs, setScraperLogs] = useState([]);
  const [agentLogs, setAgentLogs] = useState([]);
  const [actionProcessLoading, setActionProcessLoading] = useState({ scraper: false, agent: false });

  // Configuração da IA (Pitch Comercial)
  const [pitch, setPitch] = useState('');
  const [pitchLoading, setPitchLoading] = useState(false);

  const scraperTerminalRef = useRef(null);
  const agentTerminalRef = useRef(null);

  // Carregar dados de configurações da IA
  const carregarConfig = async () => {
    try {
      const res = await axios.get(`${API_BASE}/config`);
      setPitch(res.data.pitch_comercial);
    } catch (err) {
      console.error('Falha ao carregar pitch comercial.', err);
    }
  };

  // Salvar alterações de pitch comercial
  const atualizarConfig = async () => {
    if (!pitch.trim()) {
      message.warning('O pitch comercial não pode ser vazio!');
      return;
    }
    setPitchLoading(true);
    try {
      await axios.post(`${API_BASE}/config`, { pitch_comercial: pitch });
      message.success('Pitch comercial atualizado com sucesso!');
    } catch (err) {
      message.error('Erro ao atualizar configurações da IA.');
    } finally {
      setPitchLoading(false);
    }
  };

  // Carregar dados principais
  const carregarDados = async () => {
    setLoading(true);
    try {
      const resStats = await axios.get(`${API_BASE}/stats`);
      setStats(resStats.data);

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

  // Carrega status dos processos locais (scraper e agent)
  const carregarStatusProcessos = async () => {
    try {
      const res = await axios.get(`${API_BASE}/processes/status`);
      setProcessStatus(res.data);
    } catch (e) {
      console.error('Falha ao checar status dos daemons.', e);
    }
  };

  useEffect(() => {
    carregarDados();
    carregarStatusProcessos();
    carregarConfig();

    // Inicia conexão SSE para Logs em tempo real
    console.log('🔌 Conectando ao EventSource de Logs do Agente...');
    const eventSource = new EventSource(`${API_BASE}/processes/logs`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'scraper') {
          setScraperLogs(prev => {
            const updated = [...prev, data.log];
            return updated.slice(-150); // Mantém no máximo 150 em tela
          });
        } else if (data.type === 'agent') {
          setAgentLogs(prev => {
            const updated = [...prev, data.log];
            return updated.slice(-150);
          });
        }
      } catch (err) {
        console.error('Erro ao processar mensagem do log stream:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('Erro no canal de logs EventSource, tentando reconectar...', err);
    };

    return () => {
      console.log('🔌 Desconectando EventSource de Logs.');
      eventSource.close();
    };
  }, [page, pageSize, statusFiltro]);

  // Efeito para rolar automaticamente os terminais virtuais até a última linha
  useEffect(() => {
    if (scraperTerminalRef.current) {
      scraperTerminalRef.current.scrollTop = scraperTerminalRef.current.scrollHeight;
    }
  }, [scraperLogs]);

  useEffect(() => {
    if (agentTerminalRef.current) {
      agentTerminalRef.current.scrollTop = agentTerminalRef.current.scrollHeight;
    }
  }, [agentLogs]);

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

  // Excluir lead permanentemente
  const excluirLead = async (id) => {
    Modal.confirm({
      title: 'Excluir Lead',
      content: 'Tem certeza que deseja excluir este lead permanentemente? Esta ação não pode ser desfeita.',
      okText: 'Sim, excluir',
      okType: 'danger',
      cancelText: 'Cancelar',
      onOk: async () => {
        setActionLoading(true);
        try {
          await axios.delete(`${API_BASE}/leads/${id}`);
          message.success('Lead excluído com sucesso');
          setDrawerVisible(false);
          carregarDados();
        } catch (err) {
          message.error('Falha ao excluir o lead.');
        } finally {
          setActionLoading(false);
        }
      }
    });
  };

  // Criar grupo de disparo (20 a 50 leads selecionados)
  const processarGrupoDisparo = async () => {
    if (selectedRowKeys.length === 0) return;
    
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

  const copiarMensagem = (texto) => {
    navigator.clipboard.writeText(texto);
    message.success('Mensagem copiada para a área de transferência! 📋');
  };

  // ==========================================
  // COMANDOS DE INICIAR / PARAR PROCESSOS
  // ==========================================
  const gerenciarScraper = async (action, force = false) => {
    setActionProcessLoading(prev => ({ ...prev, scraper: true }));
    try {
      if (action === 'start') {
        await axios.post(`${API_BASE}/processes/scraper/start`, { force });
        message.success(force ? 'Scraper Iniciado em Modo Forçado! 🚀' : 'Scraper Agendado para a Madrugada! ⏰');
      } else {
        await axios.post(`${API_BASE}/processes/scraper/stop`);
        message.info('Processo do Scraper finalizado.');
      }
      setTimeout(carregarStatusProcessos, 1000);
    } catch (e) {
      message.error(e.response?.data?.erro ?? 'Erro ao comandar Scraper.');
    } finally {
      setActionProcessLoading(prev => ({ ...prev, scraper: false }));
    }
  };

  const gerenciarAgente = async (action) => {
    setActionProcessLoading(prev => ({ ...prev, agent: true }));
    try {
      if (action === 'start') {
        await axios.post(`${API_BASE}/processes/agent/start`);
        message.success('Agente Ollama iniciado! 🧠');
      } else {
        await axios.post(`${API_BASE}/processes/agent/stop`);
        message.info('Agente Ollama desligado.');
      }
      setTimeout(carregarStatusProcessos, 1000);
    } catch (e) {
      message.error(e.response?.data?.erro ?? 'Erro ao comandar Agente Ollama.');
    } finally {
      setActionProcessLoading(prev => ({ ...prev, agent: false }));
    }
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

  // Componente de Terminal de Logs
  const renderTerminal = (title, logs, isRunning, onStart, onStop, onStartForce, loadingKey) => (
    <Card 
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <Space>
            <CodeOutlined style={{ color: '#0d9488' }} />
            <span style={{ fontWeight: 700 }}>{title}</span>
          </Space>
          <Badge 
            status={isRunning ? 'success' : 'default'} 
            text={
              <span style={{ fontWeight: 600, color: isRunning ? '#0f973c' : '#64748b' }}>
                {isRunning ? 'ATIVO (CONECTADO)' : 'DESLIGADO'}
              </span>
            } 
          />
        </div>
      }
      style={{ minHeight: 450 }}
    >
      {/* Botões de Controle */}
      <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'flex-start' }} wrap>
        {!isRunning ? (
          <>
            {onStartForce && (
              <Button 
                type="primary" 
                icon={<PlayCircleOutlined />} 
                style={{ background: '#ca8a04', borderColor: '#ca8a04' }}
                onClick={onStartForce}
                loading={actionProcessLoading[loadingKey]}
              >
                Forçar Execução Agora ⚡
              </Button>
            )}
            <Button 
              type="primary" 
              icon={<PlayCircleOutlined />} 
              onClick={onStart}
              loading={actionProcessLoading[loadingKey]}
            >
              Ligar Daemon
            </Button>
          </>
        ) : (
          <Button 
            danger 
            type="primary" 
            icon={<StopOutlined />} 
            onClick={onStop}
            loading={actionProcessLoading[loadingKey]}
          >
            Desligar Robô 🛑
          </Button>
        )}
      </Space>

      {/* Caixa do Console Virtual */}
      <div 
        ref={loadingKey === 'scraper' ? scraperTerminalRef : agentTerminalRef}
        style={{
          background: '#090b0f',
          border: '1px solid #1c2130',
          borderRadius: '8px',
          padding: '16px',
          fontFamily: "'Courier New', Courier, monospace",
          fontSize: '12px',
          color: '#38bdf8', // Azul Terminal
          height: '350px',
          overflowY: 'auto',
          boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)',
          whiteSpace: 'pre-wrap'
        }}
      >
        {logs.length === 0 ? (
          <span style={{ color: '#475569' }}>[Console] Nenhuma atividade capturada ainda. Inicie o processo para exibir logs.</span>
        ) : (
          logs.map((log, index) => (
            <div key={index} style={{ marginBottom: 4 }}>
              <span style={{ color: '#0d9488', marginRight: 8 }}>[{log.timestamp}]</span>
              <span style={{ color: log.text.startsWith('❌') ? '#ef4444' : '#cbd5e1' }}>{log.text}</span>
            </div>
          ))
        )}
      </div>
    </Card>
  );

  // Painel de Configurações da IA
  const renderConfigPanel = () => (
    <Card 
      title={
        <Space>
          <SettingOutlined style={{ color: '#0d9488' }} />
          <span style={{ fontWeight: 700 }}>Proposta Comercial da IA (Sales Pitch)</span>
        </Space>
      }
      style={{ minHeight: 450 }}
    >
      <Paragraph style={{ color: '#94a3b8', marginBottom: 20 }}>
        Defina a proposta de valor que o robô da IA irá usar para abordar os leads MEI. A IA usará este escopo e objetivo comercial para escrever e personalizar mensagens do WhatsApp dinamicamente para o segmento e cidade de cada lead.
      </Paragraph>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={14}>
          <div style={{ marginBottom: 16 }}>
            <Text style={{ fontWeight: 600, color: '#e2e8f0', display: 'block', marginBottom: 8 }}>
              Instruções de Abordagem Comercial / Pitch da IA:
            </Text>
            <Input.TextArea
              rows={8}
              value={pitch}
              onChange={(e) => setPitch(e.target.value)}
              placeholder="Ex: Oferecer ajuda para criar um site profissional e otimizar o perfil do Google Meu Negócio da empresa para atrair mais clientes locais de forma sutil, apresentando a BerithCode como parceira tecnológica."
              style={{
                background: '#090b0f',
                border: '1px solid #1c2130',
                borderRadius: '8px',
                color: '#e2e8f0',
                padding: '12px',
                fontSize: '14px',
                lineHeight: '1.5'
              }}
            />
          </div>
          <Button 
            type="primary" 
            icon={<SendOutlined />}
            loading={pitchLoading}
            onClick={atualizarConfig}
            size="large"
            style={{
              background: 'linear-gradient(135deg, #0d9488, #0b7a70)',
              borderColor: '#0d9488',
              fontWeight: 600,
              boxShadow: '0 4px 12px rgba(13, 148, 136, 0.2)'
            }}
          >
            Salvar Proposta Comercial da IA
          </Button>
        </Col>

        <Col xs={24} lg={10}>
          <Card 
            size="small" 
            title={<span style={{ fontSize: 13, fontWeight: 700, color: '#0d9488' }}>💡 Ideias e Exemplos de Abordagem</span>}
            style={{ background: '#131620', borderColor: '#232a3c' }}
          >
            <div style={{ padding: '8px 4px' }}>
              <Paragraph style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 12px 0' }}>
                Copie e cole os modelos abaixo no campo ao lado para mudar o foco comercial da sua inteligência artificial:
              </Paragraph>
              
              <div style={{ marginBottom: 12, borderLeft: '3px solid #0d9488', paddingLeft: 8 }}>
                <Text style={{ fontSize: 11, fontWeight: 700, color: '#e2e8f0', display: 'block' }}>🌐 Modelo 1: Criação de Sites e Google Maps</Text>
                <Text style={{ fontSize: 11, color: '#64748b' }}>
                  "Oferecer ajuda para construir a presença digital (site institucional de alto impacto) e otimizar o Google Meu Negócio do MEI para aparecer nas buscas locais do bairro dele, apresentando a BerithCode."
                </Text>
              </div>

              <div style={{ marginBottom: 12, borderLeft: '3px solid #ca8a04', paddingLeft: 8 }}>
                <Text style={{ fontSize: 11, fontWeight: 700, color: '#e2e8f0', display: 'block' }}>💬 Modelo 2: Robôs de Atendimento e Automação</Text>
                <Text style={{ fontSize: 11, color: '#64748b' }}>
                  "Explicar que percebeu o potencial do negócio dele e propor a instalação de um atendente virtual com IA no WhatsApp para que ele não perca nenhum cliente fora do horário comercial, oferecendo teste grátis."
                </Text>
              </div>

              <div style={{ borderLeft: '3px solid #ef4444', paddingLeft: 8 }}>
                <Text style={{ fontSize: 11, fontWeight: 700, color: '#e2e8f0', display: 'block' }}>📈 Modelo 3: Tráfego Pago e Redes Sociais</Text>
                <Text style={{ fontSize: 11, color: '#64748b' }}>
                  "Apontar a importância de atrair clientes locais e oferecer consultoria gratuita de anúncios no Instagram e Facebook para lotar a agenda do segmento de atuação dele na região de abrangência geográfica."
                </Text>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </Card>
  );

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
              Atualizar Dados
            </Button>
          </Space>
        </Header>

        {/* Corpo principal */}
        <Content style={{ padding: '24px', maxWidth: 1440, margin: '0 auto', width: '100%' }}>
          
          {/* Abas Superiores do Sistema */}
          <Tabs
            defaultActiveKey="1"
            type="card"
            items={[
              {
                key: '1',
                label: (
                  <span>
                    <ControlOutlined /> Gestão de Leads
                  </span>
                ),
                children: (
                  <div>
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
                              placeholder="Buscar por nome ou cidade..."
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
                  </div>
                ),
              },
              {
                key: '2',
                label: (
                  <span>
                    <CodeOutlined /> Console do Agente (Live)
                  </span>
                ),
                children: (
                  <div style={{ marginTop: 8 }}>
                    <Paragraph style={{ color: '#94a3b8', marginBottom: 20 }}>
                      Monitore e controle a automação em tempo real. Ligue o scraper de captação e o agente
                      Ollama diretamente abaixo para acompanhar a extração do navegador e o processamento cognitivo da IA.
                    </Paragraph>
                    <Row gutter={[20, 20]}>
                      <Col xs={24} lg={12}>
                        {renderTerminal(
                          '1. Robô Scraper (Playwright/Maps)', 
                          scraperLogs, 
                          processStatus.scraper === 'running', 
                          () => gerenciarScraper('start', false), 
                          () => gerenciarScraper('stop'), 
                          () => gerenciarScraper('start', true), 
                          'scraper'
                        )}
                      </Col>
                      <Col xs={24} lg={12}>
                        {renderTerminal(
                          '2. Agente Cognitivo (Ollama qwen2.5)', 
                          agentLogs, 
                          processStatus.agent === 'running', 
                          () => gerenciarAgente('start'), 
                          () => gerenciarAgente('stop'), 
                          null, 
                          'agent'
                        )}
                      </Col>
                    </Row>
              },
              {
                key: '3',
                label: (
                  <span>
                    <SettingOutlined /> Configurações da IA
                  </span>
                ),
                children: (
                  <div style={{ marginTop: 8 }}>
                    {renderConfigPanel()}
                  </div>
                ),
              }
            ]}
          />

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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <span style={{ color: '#ca8a04', fontWeight: 700, fontSize: 14 }}>💬 Abordagem Humana Sugerida</span>
                      <Button 
                        size="small" 
                        icon={<CopyOutlined />} 
                        onClick={() => copiarMensagem(selectedLead.mensagem_personalizada)}
                      >
                        Copiar
                      </Button>
                    </div>
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
                  <Button 
                    type="primary" 
                    danger 
                    icon={<DeleteOutlined />} 
                    onClick={() => excluirLead(selectedLead.id)}
                    loading={actionLoading}
                  >
                    Excluir Lead
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
