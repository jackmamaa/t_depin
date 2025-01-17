import { 
  FaChartBar, 
  FaTint, 
  FaFileInvoiceDollar, 
  FaBuffer, 
  FaNetworkWired, 
  FaStore 
} from 'react-icons/fa';
import { NavItem } from './types';

export const navItems: NavItem[] = [
  { 
    id: "dashboard", 
    icon: <FaChartBar />, 
    text: "Dashboard"
  },
  { 
    id: "faucet", 
    icon: <FaTint />, 
    text: "Get some GLM"
  },
  { 
    id: "deposit", 
    icon: <FaFileInvoiceDollar />, 
    text: "Deposit Manager"
  },
  { 
    id: "instance", 
    icon: <FaBuffer />, 
    text: "Instances Manager",
    subMenu: [
      { id: 'instances', text: 'Instances', path: '/instance/index' },
      { id: 'keys', text: 'SSH Keys', path: '/instance/ssh-key' },
      { id: 'scripts', text: 'Launch Scripts', path: '/instance/launch-script' }
    ]
  },
  { 
    id: "vpn", 
    icon: <FaNetworkWired />, 
    text: "VPN Manager"
  },
  { 
    id: "market", 
    icon: <FaStore />, 
    text: "Market",
    href: "https://stats.golem.network/network/providers/online"
  }
]; 