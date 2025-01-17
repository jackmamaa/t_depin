import WebSocket from 'ws';
import { sshService } from '../services/sshService';
import logger from '../logger';
import { URL } from 'url';
import { Request, Response } from 'express';
import { SocksClient } from 'socks';
import { SshConfig } from '../types';
import { ResponseHandler } from '../utils/responseHandler';

const tipMessage = (socks_port: number = 1080, state: boolean = false) => {
  const tunnelOff = [
    'Tunnel: False',
    'Notice: ',
    '  Instance will not have internet access.',
    '  Please check the network access configuration.',
  ];

  const tunnelOn = [
    'Tunnel: True',
    'host: 127.0.0.1',
    `Port: ${socks_port}`,
    'Internet access:',
    `  socks5: socks5h://127.0.0.1:${socks_port}`,
    '  For curl:',
    `    echo 'export ALL_PROXY=socks5h://127.0.0.1:${socks_port}' >> ~/.bashrc && source ~/.bashrc`,
    '  For apt:',
    `    echo -n 'Acquire::http::Proxy "socks5h://127.0.0.1:${socks_port}/";' >> /etc/apt/apt.conf.d/12proxy`
  ];

  const content = state ? tunnelOn : tunnelOff;

  const width = Math.max(...content.map(line => line.length)) + 4;
  const topBorder    = '╔' + '═'.repeat(width - 2) + '╗';
  const bottomBorder = '╚' + '═'.repeat(width - 2) + '╝';

  return [
    '',
    topBorder,
    ...content.map(line => `║ ${line.padEnd(width - 4)} ║`),
    bottomBorder,
    ''
  ].join('\n');
}

export class SshController {
  async handleConnection(ws: WebSocket, url: string) {
    try {
      // parse URL parameters
      const parsedUrl = new URL(url, 'ws://localhost');
      const agreementId = parsedUrl.pathname.split('/').pop() || '';
      
      // get SSH config
      const config: SshConfig = {
        user_name: parsedUrl.searchParams.get('user_name') || 'root',
      }

      if (parsedUrl.searchParams.get('tunnel_port')
        && parsedUrl.searchParams.get('socks_host')
        && parsedUrl.searchParams.get('socks_port')) {
        config.tunnel = {
          local_port: parseInt(parsedUrl.searchParams.get('tunnel_port') || ''),
          remote_host: parsedUrl.searchParams.get('socks_host') || '',
          remote_port: parseInt(parsedUrl.searchParams.get('socks_port') || ''),
          state: Boolean(parsedUrl.searchParams.get('state') || false),
        }

        if (!config.tunnel.state) {
          const result = await this.checkSocks5Connection(config.tunnel.remote_host, config.tunnel.remote_port);
          config.tunnel.state = result;
        }
      };

      // create SSH connection
      const { conn, sshConfig } = await sshService.createSshConnection(agreementId, config);
      
      // save connection for cleanup
      sshService.addConnection(agreementId, conn);

      conn.on('ready', () => {
        ws.send(JSON.stringify({ type: 'data', data: tipMessage(config.tunnel?.local_port, config.tunnel?.state) }));
        conn.shell((err, stream) => {
          if (err) {
            ws.send(JSON.stringify({ type: 'error', data: err.message }));
            return;
          }

          // receive data from WebSocket and send to SSH stream
          ws.on('message', (data: string) => {
            stream.write(data);
          });

          // receive data from SSH stream and send to WebSocket
          stream.on('data', (data: Buffer) => {
            ws.send(JSON.stringify({ type: 'data', data: data.toString() }));
          });

          // handle SSH stream close
          stream.on('close', () => {
            sshService.terminateConnection(agreementId);
            ws.close();
          });
        });
      });

      conn.on('error', (err) => {
        logger.error(`SSH connection error: ${err}`);
        ws.send(JSON.stringify({ type: 'error', data: err.message }));
        sshService.terminateConnection(agreementId);
      });

      // handle WebSocket close
      ws.on('close', () => {
        logger.info(`WebSocket closed for agreement: ${agreementId}`);
        sshService.terminateConnection(agreementId);
      });

      // connect to SSH
      conn.connect(sshConfig);

    } catch (error) {
      logger.error(error);
      ws.send(JSON.stringify({ type: 'error', data: String(error) }));
      ws.close();
    }
  }

  private async checkSocks5Connection(host: string, port: number) {
    try {
      await SocksClient.createConnection({
        proxy: {
          host: host,
          port: port,
          type: 5
        },
        command: 'connect',
        destination: {
          host: 'www.google.com',
          port: 80
        },
        timeout: 5000
      });
      return true;
    } catch (error) {
      logger.error('SOCKS5 check failed', error);
      return false;
    }
  }

  async checkSocks5Api(req: Request, res: Response) {
    const { host, port } = req.body;

    try {
      const result = await this.checkSocks5Connection(host, port);
      if (result) {
        res.status(200).json(ResponseHandler.success('Connect successfully', `socks5://${host}:${port}`));
      } else {
        res.status(202).json(ResponseHandler.failure('Connect failed', 'please check if the proxy server is running'));
      }
    } catch (error: any) {
      logger.error('SOCKS5 check failed', error);
      res.status(500).json(ResponseHandler.failure('Check failed', error.message));
    }
  }
}

export const sshController = new SshController(); 