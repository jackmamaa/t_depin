import { useState } from "react";
import { useAccount } from "wagmi";
import { useApi } from '../api';

export interface VpnInfo {
  name: string;
  vpn_id: string;
  cidr: string;
  created_at?: number;
  nodes?: string[];
  state: string;
}

export function useVPN() {
  const [vpns, setVPNs] = useState<VpnInfo[]>([])
  const [reloadVPNs, setReloadVPNs] = useState<number>(0)
  const { address } = useAccount()

  const apiRequest = useApi()

  const getVPNs = async () => {
    try {
      const response = await apiRequest.get(`/get/vpn/${address}`)
      const vpns = Array.isArray(response.data as VpnInfo[]) && response.data;
      setVPNs(vpns)
    } catch (error) {
      console.error('Get VPNs Failed', error)
    }
  }

  const getVpnNodes = async (vpnId: string) => {
    try {
      const response = await apiRequest.get(`/vpn/nodes/${vpnId}`)
      const nodes = Array.isArray(response.data) && response.data;
      if (nodes) {
          setVPNs(prevVPNs => prevVPNs.map(vpn => 
          vpn.vpn_id === vpnId 
            ? { ...vpn, nodes: nodes } 
            : vpn
        ))
      }
    } catch (error) {
      console.error('Get VPN Nodes Failed', error)
    }
  }

  const addVPN = async (datas: VpnInfo) => {
    try {
      const response = await apiRequest.post('/insert/vpn', { data: datas });
      return response
    } catch (error) {
      console.error('Add VPN Failed', error)
      throw error;
    }
  }

  const createVPN = async (tempId: string, name: string, cidr: string) => {
    try {
      const response = await apiRequest.post(`/vpn/create`, {
        walletAddress: address,
        tempId: tempId,
        vpnName: name,
        cidr: cidr
      })
      if (response.status === 200) {
        return response.data
      } else {
        throw new Error(response.details)
      }
    } catch (error) {
      console.error('Create VPN Failed', error)
      throw error;
    }
  }

  const terminateVPN = async (vpnId: string) => {
    try {
      const response = await apiRequest.delete(`/vpn/terminate/${vpnId}`)
      return response
    } catch (error) {
      console.error('Terminate VPN Failed', error)
      throw error;
    }
  }

  const updateVpnForId = async (vpnId: string, updates: any) => {
    try {
      const response = await apiRequest.put(`/update/vpn/${vpnId}`, { updates });
      return response
    } catch (error) {
      console.error('Error updating VPN:', error);
      throw error;
    }
  }

  return {
    vpns,
    setVPNs,
    reloadVPNs,
    setReloadVPNs,
    getVPNs,
    getVpnNodes,
    addVPN,
    createVPN,
    terminateVPN,
    updateVpnForId
  }
}
