import { ServiceConfig } from '../types';
import logger from '../logger';
import fs from 'fs';
import path from 'path';

export class ProxyService {
  private readonly traefikConfigPath: string;
  private readonly domain: string;

  constructor() {
    this.traefikConfigPath = process.env.TRAEFIK_CONFIG_PATH || '/etc/traefik/config';
    this.domain = process.env.DOMAIN || 'examples.com';
  }

  public async setupWebProxy(activityId: string, service: ServiceConfig): Promise<string> {
    try {
      if (!service.listen) {
        throw new Error('Service listen port not defined');
      }

      const subdomain = activityId;
      const configFile = path.join(this.traefikConfigPath, `${subdomain}.yml`);
      
      const config = {
        http: {
          routers: {
            [subdomain]: {
              rule: `Host(\`${activityId}.${this.domain}\`)`,
              service: subdomain,
              entryPoints: ['web']
            }
          },
          services: {
            [subdomain]: {
              loadBalancer: {
                servers: [{
                  url: `http://backend:${service.listen}`
                }]
              }
            }
          }
        }
      };

      await fs.promises.writeFile(
        configFile,
        JSON.stringify(config, null, 2)
      );

      logger.info({
        activityId,
        domain: `${subdomain}.${this.domain}`,
        targetPort: service.listen
      }, 'Web proxy configured');

      return `${subdomain}.${this.domain}`;
    } catch (error) {
      logger.error(`Failed to setup web proxy: ${error}`);
      throw error;
    }
  }

  public async removeWebProxy(activityId: string): Promise<void> {
    try {
      const subdomain = activityId;
      const configFile = path.join(this.traefikConfigPath, `${subdomain}.yml`);
      
      if (fs.existsSync(configFile)) {
        await fs.promises.unlink(configFile);
        logger.info(`Removed proxy configuration for ${activityId}`);
      }
    } catch (error) {
      logger.error(`Failed to remove web proxy: ${error}`);
      throw error;
    }
  }
}

export const proxyService = new ProxyService();
