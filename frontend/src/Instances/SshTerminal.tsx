import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { useGlobalContext } from '../context/GlobalContext';
import 'xterm/css/xterm.css';

export default function SshTerminal() {
  const { agreementId } = useParams<{ agreementId: string }>();
  const { instances, truncateId } = useGlobalContext();
  const [isTerminalReady, setIsTerminalReady] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const terminalRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const terminalInstanceRef = useRef<Terminal | null>(null);
  const sshConfig = useMemo(() => {
    const stateParam = searchParams.get('opts');
    if (stateParam) {
      try {
        const parsedState = JSON.parse(decodeURIComponent(stateParam));
        return parsedState.sshConfig;
      } catch (e) {
        console.error('Failed to parse state from URL:', e);
      }
    }
    return location.state?.sshConfig;
  }, [searchParams, location.state]);

  const instance = instances.find(i => i.agreement_id === agreementId);
  const handleResize = useCallback((fitAddon: FitAddon) => {
    try {
      fitAddon.fit();
    } catch (error) {
      console.error('Resize error:', error);
    }
  }, []);

  useEffect(() => {
    if (terminalRef.current) {
      setIsTerminalReady(true);
    }
  }, []);

  useEffect(() => {
    if (!isTerminalReady || !agreementId) return;

    const terminal = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#ffffff',
        cursor: '#ffffff',
        black: '#000000',
        red: '#e06c75',
        green: '#98c379',
        yellow: '#d19a66',
        blue: '#61afef',
        magenta: '#c678dd',
        cyan: '#56b6c2',
        white: '#abb2bf'
      },
      allowTransparency: true,
      scrollback: 100000,
      cols: 100,
      rows: 30,
      convertEol: true,
      lineHeight: 1.2,
      letterSpacing: 0
    });
    
    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.loadAddon(new WebLinksAddon());
    
    // use requestAnimationFrame to ensure DOM is fully rendered
    requestAnimationFrame(() => {
      terminal.open(terminalRef.current!);
      handleResize(fitAddon);
    });
    
    terminalInstanceRef.current = terminal;

    // create WebSocket connection
    const wsUrl = new URL(import.meta.env.VITE_SSH_URL + agreementId);
    if (sshConfig) {
      wsUrl.searchParams.append('user_name', sshConfig.user_name);
      const { tunnel } = sshConfig;
      if (tunnel) {
        const params = {
          tunnel_port: tunnel.local_port,
          socks_host: tunnel.remote_host,
          socks_port: tunnel.remote_port,
          state: tunnel.state
        };
        Object.entries(params).forEach(([key, value]) => {
          if (value) wsUrl.searchParams.append(key, value.toString());
        });
      }
    }
    const ws = new WebSocket(wsUrl.toString());
    wsRef.current = ws;

    ws.onopen = () => {
      terminal.writeln('Connected to SSH server...');
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'data') {
          const formattedData = message.data.replace(/\n/g, '\r\n');
          terminal.write(formattedData);
        } else if (message.type === 'error') {
          terminal.writeln(message.data);
        }
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    };

    ws.onerror = (error) => {
      terminal.writeln(`\r\nWebSocket error: ${error}`);
    };

    ws.onclose = () => {
      terminal.writeln('\r\nConnection closed');
    };

    // handle terminal input
    terminal.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });

    // use debounce to handle window size change
    let resizeTimeout: NodeJS.Timeout;
    const debouncedResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => handleResize(fitAddon), 100);
    };

    window.addEventListener('resize', debouncedResize);

    return () => {
      clearTimeout(resizeTimeout);
      window.removeEventListener('resize', debouncedResize);
      ws.close();
      terminal.dispose();
    };
  }, [agreementId, isTerminalReady, handleResize, sshConfig]);

  // handle page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      handleBeforeUnload();
    };
  }, []);

  // handle route change
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return (
    <div className="card w-full h-full">
      <div className="h-full flex flex-col">
        <div className="flex justify-between items-center pl-4 p-1">
          <div className="flex items-center gap-4">
            <h2 className="card-title text-lg">SSH Terminal</h2>
            {instance && (
              <div className="flex items-center gap-2 text-sm text-base-content/70">
                <span>{instance.name}</span>
                <span className="opacity-50">|</span>
                <span className="font-mono">{truncateId(instance.agreement_id)}</span>
                <span className={`badge badge-sm ${
                  instance.state === 'Active' ? 'badge-success' : 'badge-warning'
                }`}>
                  {instance.state}
                </span>
              </div>
            )}
          </div>
          <button 
            onClick={() => navigate('/instance/index')}
            className="p-2 font-bold text-base-content hover:text-primary transition-colors">
            ✕
          </button>
        </div>
        <div className="flex-1 relative overflow-hidden rounded-md">
          <div 
            ref={terminalRef} 
            className="w-full h-full bg-[#1e1e1e]"
          />
        </div>
      </div>
    </div>
  );
} 