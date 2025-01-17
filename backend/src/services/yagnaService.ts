import { GolemNetwork } from '@golem-sdk/golem-js';

class YagnaService {
  private static instance: YagnaService;
  private networks: Map<string, GolemNetwork> = new Map();
  private initializingNetworks: Set<string> = new Set();

  private constructor() {}

  public static getInstance(): YagnaService {
    if (!YagnaService.instance) {
      YagnaService.instance = new YagnaService();
    }
    return YagnaService.instance;
  }

  async initializeYagna(network: string) {
    if (!['holesky', 'polygon'].includes(network)) {
      throw new Error(`Network not support: ${network}`);
    }

    if (this.networks.has(network)) {
      return this.networks.get(network);
    }

    if (this.initializingNetworks.has(network)) {
      // wait for initialization to complete
      while (this.initializingNetworks.has(network)) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return this.networks.get(network);
    }

    try {
      this.initializingNetworks.add(network);
      const glm = new GolemNetwork({
        api: { 
          key: process.env.YAGNA_APP_KEY,
          url: process.env.YAGNA_API_URL,
        },
        payment: {
          driver: "erc20",
          network: network,
        },
      });

      await glm.connect();
      this.networks.set(network, glm);
      return glm;
    } catch (error) {
      console.error(`Yagna initialization failed for ${network}:`, error);
      throw error;
    } finally {
      this.initializingNetworks.delete(network);
    }
  }

  async getGlm(network: string) {
    if (!this.networks.has(network)) {
      console.log(`Network ${network} not initialized, initializing now...`);
      return this.initializeYagna(network);
    }
    return this.networks.get(network);
  }
}

export const yagnaService = YagnaService.getInstance();
