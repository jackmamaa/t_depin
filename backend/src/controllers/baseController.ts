import { Request, Response } from 'express';
import { dbService, EntityType } from '../services/dbService';
import { ResponseHandler } from '../utils/responseHandler';

class BaseController {
    protected async handleOperation<T>(
      operation: () => Promise<T>,
      res: Response,
      errorMessage: string,
      validateFn?: () => void,
      returnData: boolean = false
    ) {
      try {
        if (validateFn) {
          validateFn();
        }
        const result = await operation();
        if (returnData) {
          res.status(200).json(ResponseHandler.success(result));
        } else {
          res.status(200).json(ResponseHandler.success());
        }
      } catch (error: any) {
        console.error(errorMessage, error);
        res.status(400).json(ResponseHandler.failure(errorMessage, error.message));
      }
    }
  
    protected validateRequired(value: any, fieldName: string) {
      if (value === undefined || value === null || value === '') {
        throw new Error(`${fieldName} is required`);
      }
    }
  
    protected validateObject(obj: any, fieldName: string) {
      if (!obj || typeof obj !== 'object' || Object.keys(obj).length === 0) {
        throw new Error(`${fieldName} must be a non-empty object`);
      }
    }
  
    protected formatErrorMessage(operation: string, table: EntityType, id?: string): string {
      return id 
        ? `${operation} ${table} for id ${id} failed`
        : `${operation} ${table} failed`;
    }
  }

export class GeneralController extends BaseController {
  async get(req: Request, res: Response) {
    const network = (req as any).network;
    const table = req.params.table as EntityType;
    const id = req.params.id;
    await this.handleOperation(
      async () => dbService.get(table, { wallet_address: id, network }),
      res,
      this.formatErrorMessage('Get', table, id),
      () => {
        this.validateRequired(table, 'table');
        this.validateRequired(id, 'id');
      },
      true
    );
  }

  async insert(req: Request, res: Response) {
    const network = (req as any).network;
    const table = req.params.table as EntityType;
    const { data } = req.body;
    
    await this.handleOperation(
      async () => dbService.insert(table, { ...data, network }),
      res,
      this.formatErrorMessage('Insert', table),
      () => {
        this.validateRequired(table, 'table');
        this.validateObject(data, 'data');
      }
    );
  }

  async update(req: Request, res: Response) {
    const table = req.params.table as EntityType;
    const id = req.params.id;
    const { updates } = req.body;

    await this.handleOperation(
      async () => dbService.update(table, id, updates),
      res,
      this.formatErrorMessage('Update', table, id),
      () => {
        this.validateRequired(table, 'table');
        this.validateRequired(id, 'id');
        this.validateObject(updates, 'updates');
      }
    );
  }

  async delete(req: Request, res: Response) {
    const table = req.params.table as EntityType;
    const id = req.params.id;
    
    await this.handleOperation(
      async () => dbService.delete(table, id),
      res,
      this.formatErrorMessage('Delete', table, id),
      () => {
        this.validateRequired(table, 'table');
        this.validateRequired(id, 'id');
      }
    );
  }
}