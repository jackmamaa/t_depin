import { ApiResponse } from '../types';

export class ResponseHandler {
  /**
   * generate success response
   * @param data response data
   * @param details additional details (optional)
   */
  static success<T>(data?: T, details?: any): ApiResponse {
    return {
      success: true,
      data,
      details
    };
  }

  /**
   * generate failure response
   * @param error error message
   * @param details error details (optional)
   */
  static failure(error: string, details?: any): ApiResponse {
    return {
      success: false,
      error,
      details
    };
  }
} 