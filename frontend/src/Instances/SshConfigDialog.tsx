import { useState } from 'react';
import { useApi } from '../api';
import PopupWindow from '../components/PopupWindow';

interface SshConfigDialogProps {
  instanceId: string;
  onClose: () => void;
  onConfirm: (config: SshConfig) => void;
}

export interface SshConfig {
  user_name: string;
  tunnel?: {
    local_port?: number;
    remote_host?: string;
    remote_port?: number;
    state?: boolean;
  }
}

export default function SshConfigDialog({ onClose, onConfirm }: SshConfigDialogProps) {
  const apiRequest = useApi();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{success: boolean; details: string} | null>(null);
  const [config, setConfig] = useState<SshConfig>({
    user_name: 'root'
  });
  
  const testSocks5Connection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const response = await apiRequest.post('/check_socks5', {
          host: config.tunnel?.remote_host,
          port: config.tunnel?.remote_port
      });

      if (response.ok) {
        setConfig(prev => ({
          ...prev,
          tunnel: { ...prev.tunnel, state: response.success }
        }));
        setTestResult({ success: response.success, details: response.details });
      }
    } catch (error) {
      console.error('SOCKS5 check failed:', error);
      setConfig(prev => ({
        ...prev,
        tunnel: { ...prev.tunnel, state: false }
      }));
    } finally {
      setTesting(false);
    }
  };

  const renderContent = () => (
    <div>
      <div className="form-control w-full">
        <label className="label">
          <span className="label-text">User Name</span>
        </label>
        <input
          type="text"
          className="input input-sm input-bordered"
          value={config.user_name}
          placeholder="root"
          onChange={e => setConfig(prev => ({ ...prev, user_name: e.target.value }))}
        />
      </div>

      <div className="divider">Network Access Configuration</div>

      <div className="form-control w-full">
        <label className="label">
          <span className="label-text">Port to Instance</span>
        </label>
        <input
          type="number"
          className="input input-sm input-bordered"
          value={config.tunnel?.local_port}
          placeholder="1080"
          onChange={e => setConfig(prev => ({ 
            ...prev, 
            tunnel: { 
              ...prev.tunnel, 
              local_port: parseInt(e.target.value)
            } 
          }))}
        />
      </div>

      <div className="form-control w-full mt-4">
        <label className="label">
          <span className="label-text">SOCKS5 Proxy IP</span>
        </label>
        {testResult && (
          <div className={`text-sm alert text-white ${testResult.success ? 'alert-success' : 'alert-error'} mb-2 py-2`}>
            {testResult.details} {testResult.success && 'Connected'}
          </div>
        )}
        <div className="flex gap-2 items-center">
          <input
            type="text"
            className="input input-sm input-bordered w-[180px]"
            value={config.tunnel?.remote_host}
            placeholder="192.168.1.1"
            onChange={e => setConfig(prev => ({ 
              ...prev, 
              tunnel: { ...prev.tunnel, remote_host: e.target.value } 
            }))}
          />
          <span className="text-lg px-1">:</span>
          <input
            type="number"
            className="input input-sm input-bordered w-32"
            value={config.tunnel?.remote_port}
            placeholder="1080"
            onChange={e => setConfig(prev => ({ 
              ...prev, 
              tunnel: { 
                ...prev.tunnel, 
                remote_port: parseInt(e.target.value)
              } 
            }))}
          />
          <button 
            className="btn btn-outline btn-sm min-w-[60px]"
            onClick={testSocks5Connection}
            disabled={testing || !config.tunnel?.remote_host || !config.tunnel?.remote_port}
          >
            {testing ? 'Testing' : 'Test'}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <PopupWindow
      title="SSH Connection Configuration"
      content={renderContent()}
      onClose={onClose}
      onConfirm={() => onConfirm(config)}
      closeText="Cancel"
      confirmText="Connect"
    />
  );
} 