import { WagmiProvider } from "wagmi";
import { getDefaultConfig, RainbowKitProvider, darkTheme, lightTheme } from "@rainbow-me/rainbowkit";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { ToastContainer } from "react-toastify";
import { holesky, polygon } from 'wagmi/chains';
import { GlobalProvider } from '../context/GlobalContext'
import { useEffect, useState } from 'react';

const config = getDefaultConfig({
  appName: import.meta.env.VITE_REOWN_APP_NAME,
  projectId: import.meta.env.VITE_REOWN_PROJECT_ID,
  chains: [holesky, polygon],
});

const queryClient = new QueryClient();

const customLightTheme = lightTheme({
  accentColor: '#6366f1',
  accentColorForeground: 'white',
  borderRadius: 'medium',
  fontStack: 'system',
});

const customDarkTheme = darkTheme({
  accentColor: '#6366f1',
  accentColorForeground: 'white',
  borderRadius: 'medium',
  fontStack: 'system',
  overlayBlur: 'small'
});

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>(
    () => localStorage.getItem('theme') as 'light' | 'dark' || 'light'
  );

  useEffect(() => {
    // 监听主题变化事件
    const handleThemeChange = (event: CustomEvent<'light' | 'dark'>) => {
      setTheme(event.detail);
    };

    window.addEventListener('themeChanged', handleThemeChange as EventListener);

    // 初始化时同步主题
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark';
    if (savedTheme) {
      setTheme(savedTheme);
    }

    return () => {
      window.removeEventListener('themeChanged', handleThemeChange as EventListener);
    };
  }, []);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider 
          modalSize="compact"
          theme={theme === 'light' ? customLightTheme : customDarkTheme}
        >
          <GlobalProvider>
            {children}
            <ToastContainer
              hideProgressBar
              position="bottom-right"
              stacked
              autoClose={2500}
              theme={theme}
            />
          </GlobalProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
} 