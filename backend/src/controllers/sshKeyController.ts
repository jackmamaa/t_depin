import { Request, Response } from 'express';
import * as forge from 'node-forge';
import { v4 as uuidv4 } from 'uuid';
import { dbService } from '../services/dbService';
import { SshKey } from '../types';
import logger from '../logger';
import { ResponseHandler } from '../utils/responseHandler';

export class SshKeyController {
  
  private generateKeyPair() {
    // generate RSA key pair
    const keypair = forge.pki.rsa.generateKeyPair({ bits: 2048, workers: -1 });
    const privateKey = forge.pki.privateKeyToPem(keypair.privateKey);
    const publicKey = forge.ssh.publicKeyToOpenSSH(keypair.publicKey);
    return {
      privateKey,
      publicKey
    };
  }

  async createKey(req: Request, res: Response) {
    try {
      const network = (req as any).network;
      const { walletAddress, name } = req.body;

      // use new key generation method
      const { privateKey, publicKey } = this.generateKeyPair();

      const key_id = uuidv4();
      const result: SshKey = {
        wallet_address: walletAddress,
        key_id,
        name,
        public_key: publicKey,
        private_key: privateKey,
        created_at: Date.now()
      };

      dbService.insert('ssh_key', { ...result, network });
      logger.info(`SSH key created: ${key_id}`);
      res.status(200).json(ResponseHandler.success(result));
    } catch (error: any) {
      logger.error('Failed to create SSH key:', error);
      res.status(202).json(ResponseHandler.failure('Failed to create SSH key', error.message));
    }
  }
} 