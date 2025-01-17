import { Request, Response, NextFunction } from 'express';
import { ResponseHandler } from '../utils/responseHandler';

export const network = (req: Request, res: Response, next: NextFunction) => {
  const network = req.params.network;
  if (!['holesky', 'polygon'].includes(network)) {
    return res.status(400).json(ResponseHandler.failure('Network not support'));
  }
  
  (req as any).network = network;
  next();
}; 