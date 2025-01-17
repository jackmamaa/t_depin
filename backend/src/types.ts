// api response
export interface ApiResponse {
  success: boolean;
  data?: any;
  error?: any;
  details?: any;
}

// base entity
export interface BaseEntity {
  wallet_address?: string;
  network?: string;
}

// faucet status
export interface FaucetStatus extends BaseEntity {
  faucet_claimed?: string;
}

// deposit info
export interface DepositInfo extends BaseEntity {
  name: string;
  deposit_id: string;
  tx_hash: string;
  total_amount: string;
  expiration: string;
  allocation_id?: string;
  state?: string;
}

// instance info
export interface InstanceInfo extends BaseEntity {
  name?: string;
  allocation_id: string;
  agreement_id: string;
  activity_id: string;
  provider_id: string;
  capabilities?: string[];
  image_tag: string;
  expiration: number;
  vpn_id?: string;
  services?: ServiceConfig[];
  ipv4_address?: string;
  state: string;
  endpoint?: string;
}
export interface DemandOptions {
  imageTag: string;
  minMemGib: number;
  minCpuThreads: number;
  minStorageGib: number;
  capabilities?: string[];
  subnetTag: string;
  runtime: {
    name: string,
  };
}
export interface OrderMarketOptions {
  rentHours: number;
  pricing: {
    model: 'linear' | 'burn-rate';
    maxStartPrice?: number;
    maxCpuPerHourPrice?: number;
    maxEnvPerHourPrice?: number;
    avgGlmPerHour?: number;
  };
}

// service config
export interface ServiceConfig {
  name: string;
  port: number;
  listen?: number;
  options?: any;
}

// vpn info
export interface VpnInfo extends BaseEntity {
  vpn_id: string;
  name: string;
  cidr: string;
  created_at?: number;
  state: string;
}

// launch script
export interface LaunchScript extends BaseEntity {
  script_id: string;
  name: string;
  content: string;
  updated_at?: number;
  tags?: string;
}

// ssh key
export interface SshKey extends BaseEntity {
  key_id: string;
  name: string;
  public_key: string;
  private_key: string;
  created_at?: number;
}

// ssh config
export interface SshConfig {
  user_name: string;
  tunnel?: TunnelConfig;
}

// tunnel config
export interface TunnelConfig {
  local_port: number;
  remote_host: string;
  remote_port: number;
  state?: boolean;
}