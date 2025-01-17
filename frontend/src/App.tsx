import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useState, useEffect } from 'react';
import { FaSun, FaMoon } from 'react-icons/fa';
import { useGlobalContext } from './context/GlobalContext'
import { Navigation } from './navigation/Navigation';
import Index from './index';
import { Link } from 'react-router-dom';

interface Props {
  children?: React.ReactNode
}

export default function App({ children }: Props) {
  const { isWalletConnected } = useGlobalContext();

  return (
    <div className="flex flex-col h-screen">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Navigation />
        <main className="flex-1 bg-base-100">
          <WalletCheck isWalletConnected={isWalletConnected}>
            {children}
          </WalletCheck>
        </main>
      </div>
    </div>
  );
}

function Header() {
  const [theme, setTheme] = useState<'light' | 'dark'>(
    () => (localStorage.getItem('theme') as 'light' | 'dark') || 'light'
  );

  useEffect(() => {
    const themeChangeEvent = new CustomEvent('themeChanged', { detail: theme });
    window.dispatchEvent(themeChangeEvent);
    
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <header className="navbar bg-base-100 border-b-2 border-base-200 h-4">
      <div className="navbar-start">
        <Link to="/" className="text-2xl font-bold cursor-pointer">
          TdePIN
        </Link>
      </div>
      <div className="navbar-end flex gap-4 items-center">
        {theme === 'light' ? (
          <FaMoon
            onClick={toggleTheme}
            className="cursor-pointer hover:text-primary"
          />
        ) : (
          <FaSun 
            onClick={toggleTheme}
            className="cursor-pointer hover:text-primary"
          />
        )}
        <ConnectButton showBalance={false} accountStatus="address"/>
      </div>
    </header>
  );
} 

function WalletCheck({ isWalletConnected, children }: { isWalletConnected: boolean, children: React.ReactNode }) {
  return (
    <ConnectButton.Custom>
      {({ chain }) => {
        if (!isWalletConnected) return <Index />;
        
        if (chain?.unsupported) {
          return <UnsupportedNetwork />;
        }
        
        return children;
      }}
    </ConnectButton.Custom>
  );
}

function UnsupportedNetwork() {
  return (
    <div className="card-body w-full h-full">
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">
          Unsupported network
        </h1>
        <a className="alert alert-warning">
          Please switch to holesky or polygon network
        </a>
      </div>
    </div>
  );
}