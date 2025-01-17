import { useApi } from '../api';
import { useState } from 'react';
import { useAccount } from 'wagmi';

export interface SshKey {
  key_id: string;
  name: string;
  created_at?: number;
}

export function useKey() {
  const [ keys, setKeys ] = useState<SshKey[]>([])
  const [ reloadKeys, setReloadKeys ] = useState<number>(0)
  const { address } = useAccount()
  const apiRequest = useApi();

  const createKey = async (name: string) => {
    try {
      const response = await apiRequest.post('/ssh_key/create', { walletAddress: address, name });
      if (response.ok) {
        return response.data
      } else {
        throw new Error(response.error)
      }
    } catch (error) {
      console.error('Failed to create SSH key:', error);
      return { success: false };
    }
  };

  const deleteKey = async (id: string) => {
    try {
      const response = await apiRequest.delete(`/delete/ssh_key/${id}`);
      if (response.ok) {
        return response.success
      } else {
        throw new Error(response.error)
      }
    } catch (error) {
      console.error('Failed to delete SSH key:', error);
      return { success: false };
    }
  };

  const updateKey = async (id: string, keyName: string) => {
    try {
      const response = await apiRequest.put(`/update/ssh_key/${id}`, { updates: { name: keyName } });
      if (response.ok) {
        return response.success
      } else {
        throw new Error(response.error)
      }
    } catch (error) {
      console.error('Failed to update SSH key:', error);
      return { success: false };
    }
  }

  const getKeys = async () => {
    try {
      const response = await apiRequest.get(`/get/ssh_key/${address}`)
      if (response.ok) {
        const keys = Array.isArray(response.data as SshKey[]) && response.data;
        setKeys(keys)
      } else {
        throw new Error(response.error)
      }
    } catch (error) {
      console.error('Error getting SSH keys:', error)
    }
  }

  return {
    keys,
    setKeys,
    reloadKeys,
    setReloadKeys,
    createKey,
    deleteKey,
    updateKey,
    getKeys,
  };
} 