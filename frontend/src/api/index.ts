import { useChainId } from "wagmi";
import { getNetworkName } from "../config";

// API base config
interface ApiConfig {
  baseURL: string;
  token: string;
  timeout?: number;
  headers?: Record<string, string>;
}

export interface ApiResponse {
  ok: boolean;
  status: number;
  success: boolean;
  data?: any;
  error?: any;
  details?: any;
}
// create API instance config
const defaultConfig: ApiConfig = {
  baseURL: import.meta.env.VITE_API_URL,
  token: import.meta.env.VITE_API_TOKEN,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${import.meta.env.VITE_API_TOKEN}`
  },
};

// create a custom hook
export const useApi = (pathSuffix?: string, config: ApiConfig = defaultConfig) => {
  const chainId = useChainId();
  const networkName = getNetworkName(chainId);
  pathSuffix = pathSuffix ? pathSuffix : `/${networkName}`;
  const baseURL = `${config.baseURL}${pathSuffix}`;

  const handleResponse = async (response: Response) => {
    const status = response.status;
    const ok = response.ok;
    const data = await response.json();
    const result: ApiResponse = {
      ...data,
      status,
      ok
    }
    return result;
  };

  return {
    get: async (url: string) => {
      const response = await fetch(`${baseURL}${url}`, {
        method: 'GET',
        headers: config.headers
      });
      return handleResponse(response);
    },

    post: async (url: string, data?: any) => {
      const response = await fetch(`${baseURL}${url}`, {
        method: 'POST',
        headers: config.headers,
        body: JSON.stringify(data)
      });
      return handleResponse(response);
    },

    put: async (url: string, data?: any) => {
      const response = await fetch(`${baseURL}${url}`, {
        method: 'PUT',
        headers: config.headers,
        body: JSON.stringify(data)
      });
      return handleResponse(response);
    },

    delete: async (url: string, data?: any) => {
      const response = await fetch(`${baseURL}${url}`, {
        method: 'DELETE',
        headers: config.headers,
        body: JSON.stringify(data)
      });
      return handleResponse(response);
    }
  };
};
