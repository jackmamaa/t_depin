import { Request, Response } from 'express';
import { yagnaService } from '../services/yagnaService';
import { Network } from '@golem-sdk/golem-js';
import { VpnInfo } from '../types';
import { dbService } from '../services/dbService';
import { ResponseHandler } from '../utils/responseHandler';

export const vpnStore: Map<string, Network> = new Map();

export class VpnController {
    async createVpn(req: Request, res: Response) {
        try {
            const network = (req as any).network;
            const glm = await yagnaService.getGlm(network);
            if (!glm) {
              throw new Error('Yagna not initialized');
            }

            const { walletAddress, tempId, vpnName, cidr } = req.body;

            const vpn: Network = await glm.createNetwork({ ip: cidr });
            const result: VpnInfo = {
              wallet_address: walletAddress,
              vpn_id: vpn.id,
              name: vpnName,
              cidr: cidr,
              state: 'Active',
              created_at: Date.now()
            }
            vpnStore.set(vpn.id, vpn);
            dbService.update('vpn', tempId, { ...result, network });
            res.status(200).json(ResponseHandler.success(result));
        } catch (error: any) {
            console.error('Error creating VPN:', error);
            res.status(500).json(ResponseHandler.failure('Failed to create VPN', error.message));
        }
    }

    async terminateVpn(req: Request, res: Response) {
        try {
            const network = (req as any).network;
            const glm = await yagnaService.getGlm(network);
            if (!glm) {
                throw new Error('Yagna not initialized');
            }

            const { vpnId } = req.params;
            const vpn = vpnStore.get(vpnId);
            
            if (!vpn) {
                throw new Error('VPN not found');
            }

            const networkInfo = vpn.getNetworkInfo();
            const nodeCount = Object.keys(networkInfo.nodes || {}).length;

            if (nodeCount > 1) {
                return res.status(202).json(ResponseHandler.failure(`There are running nodes on this VPN: ${vpnId}.`, { nodeCount: nodeCount }));
            }

            await glm.destroyNetwork(vpn);
            vpnStore.delete(vpnId);
            dbService.delete('vpn', vpnId);
            
            res.status(200).json(ResponseHandler.success(vpnId));
        } catch (error: any) {
            console.error('Error deleting VPN:', error);
            res.status(500).json(ResponseHandler.failure('Failed to delete VPN', error.message));
        }
    }
    
    async getVpnNodes(req: Request, res: Response) {
        try {
            const { vpnId } = req.params;
            const vpn = vpnStore.get(vpnId);
            const vpnInfo = vpn?.getNetworkInfo();
            const result = Object.keys(vpnInfo?.nodes || {});
            res.status(200).json(ResponseHandler.success(result));
        } catch (error: any) {
            console.error('Error getting VPN nodes:', error);
            res.status(500).json(ResponseHandler.failure('Failed to get VPN nodes', error.message));
        }
    }
}