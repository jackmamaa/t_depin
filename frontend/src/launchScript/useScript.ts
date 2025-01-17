import { useApi } from '../api';
import { useState } from 'react';
import { useAccount } from 'wagmi';

export interface LaunchScript {
  script_id: string;
  name: string;
  content: string;
  updated_at: number;
  tags?: string;
}

export interface CreateScriptParams {
  name: string;
  content: string;
}

export function useScript() {
  const apiRequest = useApi()
  const { address } = useAccount()
  const [ scripts, setScripts ] = useState<LaunchScript[]>([])
  const [ reloadScripts, setReloadScripts ] = useState<number>(0)

  const createScript = async (params: CreateScriptParams) => {
    try {
      const response = await apiRequest.post('/insert/launch_script', { data: { ...params, wallet_address: address } });
      if (response.ok) {
        return response.success
      } else {
        throw new Error(response.details)
      }
    } catch (error) {
      console.error('Failed to create script:', error);
      return { success: false };
    }
  };

  const updateScript = async (id: string, params: Partial<CreateScriptParams>) => {
    try {
      const response = await apiRequest.put(`/update/launch_script/${id}`, { updates: params });
      if (response.ok) {
        return response.success
      } else {
        throw new Error(response.details)
      }
    } catch (error) {
      console.error('Failed to update script:', error);
      return { success: false };
    }
  };

  const deleteScript = async (id: string) => {
    try {
      const response = await apiRequest.delete(`/delete/launch_script/${id}`)
      if (response.ok) {
        return response.success
      } else {
        throw new Error(response.details)
      }
    } catch (error) {
      console.error('Failed to delete script:', error);
      return { success: false };
    }
  };

  const getScripts = async () => {
    try {
      const response = await apiRequest.get(`/get/launch_script/${address}`)
      if (response.ok) {
        const scripts = Array.isArray(response.data as LaunchScript[]) && response.data;
        setScripts(scripts)
      } else {
        throw new Error(response.details)
      }
    } catch (error) {
      console.error('Failed to get scripts:', error);
    }
  }

  return {
    scripts,
    setScripts,
    reloadScripts,
    setReloadScripts,
    createScript,
    updateScript,
    deleteScript,
    getScripts
  };
} 