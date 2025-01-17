import { Request, Response } from 'express';
import { ethers } from 'ethers';
import { dbService } from '../services/dbService';
import { FaucetStatus } from '../types';
import { readFileSync } from 'fs'
import { ResponseHandler } from '../utils/responseHandler';

const FAUCET_CONFIG = {
  HOLESKY: {
    RPC_URL: process.env.HOLESKY_RPC_URL,
    CONTRACT_ADDRESS: process.env.HOLESKY_FAUCET_CONTRACT_ADDRESS,
    ABI: JSON.parse(readFileSync('./src/contracts/holeskyFaucetAbi.json', 'utf-8')),
    RELAYER_PRIVATE_KEY: process.env.RELAYER_PRIVATE_KEY,
  }
} as const;

type NetworkType = keyof typeof FAUCET_CONFIG;

class FaucetError extends Error {
  constructor(message: string, public readonly code: number = 500) {
    super(message);
    this.name = 'FaucetError';
  }
}

const handleFaucetError = (error: any): FaucetError => {
  if (error?.error?.reason?.includes('already claimed')) {
    return new FaucetError('Faucet already claimed', 201);
  }
  return new FaucetError(error.message);
};

export class FaucetController {
  private async updateClaimedNetworks(address: string, network: string) {
    const existingUser = await dbService.get<FaucetStatus>('user', undefined, { wallet_address: address });
    const claimedNetworks = existingUser[0]?.faucet_claimed 
      ? JSON.parse(existingUser[0].faucet_claimed)
      : [];

    claimedNetworks.push(network);

    if (existingUser[0]) {
      dbService.update('user', address, {
        faucet_claimed: JSON.stringify(claimedNetworks)
      });
    } else {
      dbService.insert('user', {
        wallet_address: address,
        faucet_claimed: JSON.stringify([network])
      });
    }
  }

  async checkStatus(req: Request, res: Response) {
    const network = (req as any).network;
    try {
      const row = await dbService.get<FaucetStatus>('user', { wallet_address: req.params.address });
      const claimedNetworks = row[0]?.faucet_claimed;
      
      if (claimedNetworks && claimedNetworks.includes(network)) {
        return res.status(200).json(ResponseHandler.success('Claimed'));
      }
      res.status(200).json(ResponseHandler.failure('Unclaimed'));
    } catch (error: any) {
      res.status(500).json(ResponseHandler.failure('Failed to check faucet status', error.message));
    }
  }

  async claimFaucet(req: Request, res: Response) {
    const network = (req as any).network as NetworkType;
    const { claimConfig } = req.body;

    if (!claimConfig.signature) {
      return res.status(400).json(ResponseHandler.failure('Missing required parameters'));
    }

    const config = FAUCET_CONFIG[network.toUpperCase() as NetworkType];
    if (!config) {
      return res.status(400).json(ResponseHandler.failure('Invalid network'));
    }

    try {
      const provider = new ethers.providers.JsonRpcProvider(config.RPC_URL);
      const relayerWallet = new ethers.Wallet(config.RELAYER_PRIVATE_KEY!, provider);
      const faucetContract = new ethers.Contract(
        config.CONTRACT_ADDRESS!,
        config.ABI,
        relayerWallet
      );

      const tx = await faucetContract.claimFaucet(
        claimConfig.address, 
        claimConfig.nonce, 
        claimConfig.signature
      );
      await tx.wait();

      await this.updateClaimedNetworks(claimConfig.address, network);
      
      return res.status(200).json(ResponseHandler.success('Claimed', { txHash: tx.hash }));
    } catch (error: any) {
      const faucetError = handleFaucetError(error);
      
      if (faucetError.code === 201) {
        await this.updateClaimedNetworks(claimConfig.address, network);
      }
      
      res.status(faucetError.code).json(
        ResponseHandler.failure('Failed to claim faucet', faucetError.message)
      );
    }
  }
} 