import { spawn, ChildProcess, SpawnOptions } from 'child_process';
import * as request from 'request';

export interface Config {
  // authToken defines the ngrok auth token
  authToken: string;

  // config path to the config file
  config: string;

  // debug the process
  debug?: boolean;

  // tunnels defines which tunnel to start
  tunnels?: string|string[];
}

interface TunnelsResponse {
  // tunnels returns the list of tunnels
  tunnels: Tunnel[];

  // uri returns the uri path.
  uri: string;
}

export interface Tunnel {
  name: string;
  uri: string;
  public_url: string;
  proto: string;
  // TODO define config
  config: any;
  // TODO define metrics
  metrics: any;
}

interface STDIO {
  addr?: string;
  comp?: string;
  err?: string;
  id?: string;
  lvl: string;
  msg: string;
  obj: string;
  path: string;
  t: string;
}

function getSpawnArgs(config: Config): string[] {
  const cmds = ['start'];
  if (!config.tunnels) {
    cmds.push('--all');
  }
  cmds.push('--log=stdout');
  cmds.push('--log-format=json');
  if (config.config) {
    cmds.push(`--config=${config.config}`);
  }
  if (config.tunnels) {
    if (Array.isArray(config.tunnels)) {
      config.tunnels.forEach((tunnel: string) => {
        cmds.push(tunnel);
      });
    } else {
      cmds.push(config.tunnels);
    }
  }
  return cmds;
}

function getSpawnOpts(config: Config): SpawnOptions {
  return <SpawnOptions>{
    cwd: process.cwd(),
  };
}

class Logger {
  constructor(protected config: Config) {}

  info(...args: any[]) {
    if (this.config.debug) {
      console.log('[INFO]', ...args);
    }
  }

  error(...args: any[]) {
    if (this.config.debug) {
      console.error('[ERR]', ...args);
    }
  }
}

function parseSTDIO(...data: any[]): STDIO[] {
  return ('' + data[0]).split('\n').map((line: string): STDIO|null => {
    try {
      if (line) {
        return JSON.parse(line);
      }
    } catch (e) {
      console.log('[PARSE]', e.message);
      console.log(line);
    }
    return null;
  }).filter((line) => {
    return !!line;
  });
}

function getTunnels(url: string, cb: (err: boolean, body?: Tunnel[]) => void) {
  request(url, function (err: any, _: request.Response, resp: any) {
    if (err) {
      cb(true);
    }
    try {
      const body = JSON.parse(resp);
      if (body && body.tunnels && body.tunnels.length > 0) {
        cb(false, body.tunnels);
        return;
      }
    } catch (e) {
      // noop
    }
    cb(true);
  });
}

const REGEX_SESSION_ESTABLISHED = /client session established/i;

export class Ngrok extends Logger {
  ngrokProcess: ChildProcess|undefined;

  hostname: string;

  init(): Promise<void> {
    return new Promise((resolve: Function, reject: Function) => {
      this.info('spawning ngrok process');

      this.ngrokProcess = spawn('.bin/ngrok', getSpawnArgs(this.config), getSpawnOpts(this.config));

      const close = (err: boolean) => {
        this.ngrokProcess.stdout.removeListener('data', stdoutCB);
        this.ngrokProcess.stderr.removeListener('data', stderrCB);
        setTimeout(() => {
          if (err) {
            reject(new Error('failed to initialize ngrok'));
          } else {
            resolve();
          }
        }, 100);
      };

      const stdoutCB = (...data: any[]): void => {
        const entries = parseSTDIO(data);
        let found = false;
        for (let entry of entries) {
          this.info(entry.msg);
          if (entry.addr) {
            this.info(`found ngrok host: ${entry.addr}`);
            this.hostname = entry.addr;
          }
          if (REGEX_SESSION_ESTABLISHED.test(entry.msg)) {
            found = true;
          }
        }
        if (found) {
          close(false);
        }
      };

      const stderrCB = (...data: any[]): void => {
        const entries = parseSTDIO(data);
        for (let entry of entries) {
          this.error(entry.msg);
        }
        close(true);
      };

      this.ngrokProcess.stdout.on('data', stdoutCB);
      this.ngrokProcess.stderr.on('data', stderrCB);

      this.ngrokProcess.on('exit', () => {
        this.info('closed ngrok tunnels');
        this.ngrokProcess = undefined;
      });

      process.on('exit', () => {
        this.close();
      });
    });
  }

  tunnels(): Promise<Tunnel[]> {
    if (!this.hostname) {
      return Promise.resolve([]);
    }
    this.info('retrieving ngrok tunnels');

    let count = 0;
    const fetchTunnels = (resolve: (tunnels: Tunnel[]) => void, reject: Function) => {
      getTunnels(`http://${this.hostname}/api/tunnels`, (err: boolean, tunnels: Tunnel[]) => {
        if (err) {
          if (count < 10) {
            count += 1;
            setTimeout(fetchTunnels, 500, resolve, reject);
          } else {
            reject();
          }
        } else {
          resolve(tunnels);
        }
      });
    };

    return new Promise(fetchTunnels);
  }

  close(): Promise<void> {
    if (!this.ngrokProcess) {
      return Promise.resolve();
    }
    this.info('closing ngrok tunnels');
    return new Promise((resolve: (...args: any[]) => void) => {
      this.ngrokProcess.on('exit', resolve);
      this.ngrokProcess.kill();
    });
  }
}
