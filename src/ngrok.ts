import { Config, Ngrok, Tunnel } from './lib';

let NGROK_PROCESS: Ngrok|undefined;

export function init(config: Config): Promise<void> {
  if (NGROK_PROCESS) {
    return Promise.reject(new Error('cannot re-initialize ngrok process'));
  }
  NGROK_PROCESS = new Ngrok(config);
  return NGROK_PROCESS.init();
}

export function tunnels(): Promise<Tunnel[]> {
  if (!NGROK_PROCESS) {
    return Promise.reject(new Error('ngrok process is not initialized'));
  }
  return NGROK_PROCESS.tunnels();
}

export function close(): Promise<void> {
  if (!NGROK_PROCESS) {
    return Promise.reject(new Error('ngrok process is not initialized'));
  }
  return NGROK_PROCESS.close().then(() => {
    NGROK_PROCESS = undefined;
  });
}

