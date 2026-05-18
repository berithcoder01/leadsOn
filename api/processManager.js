import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import EventEmitter from 'events';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');

class ProcessManager extends EventEmitter {
  constructor() {
    super();
    this.processes = {
      scraper: null,
      agent: null
    };
    
    // Buffers em memória para guardar os últimos 150 logs de cada processo
    this.logs = {
      scraper: [],
      agent: []
    };

    this.maxLogs = 150;
  }

  addLog(type, data) {
    const text = data.toString();
    // Limpa alguns caracteres de formatação de terminal do Windows
    const cleanText = text.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
    
    const lines = cleanText.split('\n').map(line => line.trimEnd()).filter(line => line.length > 0);
    
    for (const line of lines) {
      const logEntry = {
        timestamp: new Date().toLocaleTimeString('pt-BR'),
        text: line
      };
      
      this.logs[type].push(logEntry);
      if (this.logs[type].length > this.maxLogs) {
        this.logs[type].shift();
      }
      
      // Emite o evento para quem estiver escutando via SSE
      this.emit('log', { type, log: logEntry });
    }
  }

  startScraper(force = false) {
    if (this.processes.scraper) {
      throw new Error('Scraper já está rodando!');
    }

    console.log(`[Manager] Iniciando Scraper (force=${force})...`);
    this.logs.scraper = [{ timestamp: new Date().toLocaleTimeString('pt-BR'), text: '🤖 Iniciando Scraper Noturno...' }];
    
    const args = ['scraper/index.js'];
    if (force) {
      args.push('--force');
    }

    const child = spawn('node', args, {
      cwd: ROOT_DIR,
      env: { ...process.env, FORCE_COLOR: '1' }
    });

    this.processes.scraper = child;
    this.emit('status', { scraper: 'running' });

    child.stdout.on('data', (data) => this.addLog('scraper', data));
    child.stderr.on('data', (data) => this.addLog('scraper', `❌ ${data}`));

    child.on('close', (code) => {
      console.log(`[Manager] Scraper finalizado com código ${code}`);
      this.processes.scraper = null;
      this.addLog('scraper', `⛔ Scraper desligado (Código de saída: ${code})`);
      this.emit('status', { scraper: 'stopped' });
    });
  }

  stopScraper() {
    if (!this.processes.scraper) {
      throw new Error('Scraper não está rodando!');
    }
    console.log('[Manager] Parando Scraper...');
    this.processes.scraper.kill();
  }

  startAgent() {
    if (this.processes.agent) {
      throw new Error('Agente de IA já está rodando!');
    }

    console.log('[Manager] Iniciando Agente de IA...');
    this.logs.agent = [{ timestamp: new Date().toLocaleTimeString('pt-BR'), text: '🧠 Iniciando Agente Ollama...' }];

    const child = spawn('node', ['index.js'], {
      cwd: ROOT_DIR,
      env: { ...process.env, FORCE_COLOR: '1' }
    });

    this.processes.agent = child;
    this.emit('status', { agent: 'running' });

    child.stdout.on('data', (data) => this.addLog('agent', data));
    child.stderr.on('data', (data) => this.addLog('agent', `❌ ${data}`));

    child.on('close', (code) => {
      console.log(`[Manager] Agente de IA finalizado com código ${code}`);
      this.processes.agent = null;
      this.addLog('agent', `⛔ Agente Ollama desligado (Código de saída: ${code})`);
      this.emit('status', { agent: 'stopped' });
    });
  }

  stopAgent() {
    if (!this.processes.agent) {
      throw new Error('Agente de IA não está rodando!');
    }
    console.log('[Manager] Parando Agente de IA...');
    this.processes.agent.kill();
  }

  getStatus() {
    return {
      scraper: this.processes.scraper ? 'running' : 'stopped',
      agent: this.processes.agent ? 'running' : 'stopped'
    };
  }

  getLogs() {
    return this.logs;
  }
}

export const processManager = new ProcessManager();
