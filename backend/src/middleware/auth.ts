import { Request, Response, NextFunction } from 'express';
import { ResponseHandler } from '../utils/responseHandler';

export const auth = (req: Request, res: Response, next: NextFunction) => {
  const authToken = req.headers.authorization;
  const validApiKey = process.env.API_TOKEN;

  if (!validApiKey) {
    return res.status(500).json(ResponseHandler.failure('Server configuration error'));
  }

  if (!authToken) {
    return res.status(401).json(ResponseHandler.failure('No authorization token provided'));
  }

  const token = authToken.split(' ')[1];
  if (token !== validApiKey) {
    return res.status(403).json(ResponseHandler.failure('Invalid authorization token'));
  }

  next();
}; 