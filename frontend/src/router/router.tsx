import { createBrowserRouter } from 'react-router-dom'
import { createElement } from 'react'
import '@rainbow-me/rainbowkit/styles.css'
import 'react-toastify/dist/ReactToastify.css'

import { AppProviders } from '../providers/AppProviders'
import { navItems } from '../navigation/config'
import Layout from '../Layout'
import DashBoard from '../dashboard/DashBoard'
import InstancesMgr from '../Instances/InstancesMgrTab'
import DepositMgrTab from '../deposit/DepositMgrTab'
import ClaimFaucet from '../faucet/ClaimFaucet'
import VPNsMgr from '../vpn/VPNsMgrTab'
import SshTerminal from '../Instances/SshTerminal'
import KeysManager from '../sshKey/KeysMgrTab'
import ScriptsManager from '../launchScript/ScriptsMgrTab'

const routeComponents = {
  dashboard: DashBoard,
  faucet: ClaimFaucet,
  deposit: DepositMgrTab,
  instance: InstancesMgr,
  vpn: VPNsMgr
} as const;

export const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <AppProviders>
        <Layout />
      </AppProviders>
    ),
    children: [
      {
        index: true,
        element: <DashBoard />
      },
      {
        path: 'deposit',
        element: <DepositMgrTab />,
        children: [
          { path: ':depositId', element: <DepositMgrTab /> }
        ]
      },
      {
        path: 'vpn',
        element: <VPNsMgr />,
        children: [
          { path: ':vpnId', element: <VPNsMgr /> }
        ]
      },
      {
        path: 'instance',
        children: [
          { path: 'index', element: <InstancesMgr /> },
          { path: 'ssh-key', element: <KeysManager /> },
          { path: 'launch-script', element: <ScriptsManager /> },
          { path: ':agreementId', element: <InstancesMgr /> },
          { path: ':agreementId/terminal', element: <SshTerminal /> }
        ]
      },
      ...navItems.map(item => ({
        path: item.id,
        element: createElement(routeComponents[item.id as keyof typeof routeComponents])
      })),
    ]
  }
])