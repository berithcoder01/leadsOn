import { iniciarScheduler, pararScheduler } from './src/scheduler.js';

// Encerramento seguro ao pressionar Ctrl+C ou ao receber sinal de término do sistema
process.on('SIGINT',  () => { pararScheduler(); process.exit(0); });
process.on('SIGTERM', () => { pararScheduler(); process.exit(0); });

iniciarScheduler();
