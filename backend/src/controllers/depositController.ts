import { Request, Response } from 'express';
import { yagnaService } from '../services/yagnaService';
import { dbService } from '../services/dbService';
import { ResponseHandler } from '../utils/responseHandler';
import logger from '../logger';

export class DepositController {
  private handleError(res: Response, error: any, message: string) {
    logger.error(`${message}: ${error.message}`);
    res.status(202).json(ResponseHandler.failure(message, error.message));
  }

  async createAllocation(req: Request, res: Response) {
    try {
        const network = (req as any).network;
        const glm = await yagnaService.getGlm(network);
        if (!glm) {
          throw new Error('Yagna not initialized');
        }
  
      const { deposit } = req.body;
      const allocation = await glm.payment.createAllocation({
        budget: deposit.budget.toString(),
        deposit: {
          contract: deposit.contract,
          id: BigInt(deposit.id).toString(16),
        },
        expirationSec: (deposit.expirationSec - 5) - Math.floor(Date.now() / 1000),
      });
      dbService.update('deposit', deposit.tempId, {
        deposit_id: deposit.id,
        allocation_id: allocation.id,
        tx_hash: deposit.tx_hash,
        state: 'Active'
      });
      res.status(200).json(ResponseHandler.success(allocation));
    } catch (error: any) {
      this.handleError(res, error, 'Failed to create allocation');
    }
  }

  async updateAllocation(req: Request, res: Response) {
    const { depositId, newTotalAmount, newValidTo } = req.body as { 
      depositId: string,
      newTotalAmount: number, 
      newValidTo: number 
    };
    try {
      const timeout = new Date(Number(newValidTo) * 1000).toISOString()
      const yagnaUrl = process.env.YAGNA_API_URL;
      const yagnaAppKey = process.env.YAGNA_APP_KEY;
      const allocationId = req.params.id;
      const requestUrl = `${yagnaUrl}/payment-api/v1/allocations/${allocationId}`;
      const response = await fetch(requestUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${yagnaAppKey}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ totalAmount: newTotalAmount, timeout }),
      })
      const data = await response.json()
      if (!response.ok) {
        console.log('Extend allocation failed:', data)
        throw new Error(`Extend allocation failed: ${data}`)
      }
      dbService.update('deposit', depositId, { allocation_id: req.params.id });
      res.status(200).json(ResponseHandler.success(data));
    } catch (error: any) {
      this.handleError(res, error, 'Extend allocation failed');
    }
  }
}