import express from 'express';
import cors from 'cors';
import WebSocket from 'ws';
import dotenv from 'dotenv';
import logger from './logger';
import { auth } from './middleware/auth';
import { network } from './middleware/network';
import { yagnaService } from './services/yagnaService';
import { monitorService } from './services/monitorService';
import { sshService } from './services/sshService';
import { GeneralController } from './controllers/baseController';
import { DepositController } from './controllers/depositController';
import { InstanceController } from './controllers/instanceController';
import { FaucetController } from './controllers/faucetController';
import { VpnController } from './controllers/vpnController';
import { sshController } from './controllers/sshController';
import { SshKeyController } from './controllers/sshKeyController';

dotenv.config();

const depositController = new DepositController();
const instanceController = new InstanceController();
const faucetController = new FaucetController();
const vpnController = new VpnController();
const generalController = new GeneralController();
const sshKeyController = new SshKeyController();

const app = express();
const router = express.Router();

// middleware
app.use(cors());
app.use(express.json());

// route handler
const createNetworkRoutes = (router: express.Router) => {
  // common
  router.get('/get/:table/:id', generalController.get.bind(generalController));
  router.post('/insert/:table', generalController.insert.bind(generalController));
  router.put('/update/:table/:id', generalController.update.bind(generalController));
  router.delete('/delete/:table/:id', generalController.delete.bind(generalController));

  // deposit
  router.post('/deposit/create-allocation', depositController.createAllocation.bind(depositController));
  router.put('/deposit/update-allocation/:id', depositController.updateAllocation.bind(depositController));

  // instance
  router.post('/instance/create', instanceController.createInstance.bind(instanceController));
  router.delete('/instance/terminate', instanceController.terminateInstance.bind(instanceController));

  // VPN
  router.get('/vpn/nodes/:vpnId', vpnController.getVpnNodes.bind(vpnController));
  router.post('/vpn/create', vpnController.createVpn.bind(vpnController));
  router.delete('/vpn/terminate/:vpnId', vpnController.terminateVpn.bind(vpnController));
  
  // faucet
  router.get('/faucet/check/:address', faucetController.checkStatus.bind(faucetController));
  router.post('/faucet/claim', faucetController.claimFaucet.bind(faucetController));
  
  // ssh key
  router.post('/ssh_key/create', sshKeyController.createKey.bind(sshKeyController));

  // socks5 check
  router.post('/check_socks5', sshController.checkSocks5Api.bind(sshController));

  return router;
};

// register total router, add auth middleware
app.use('/api', auth, router);

// apply network middleware first
router.use('/:network', network);

// then set up routes for each network
router.use('/holesky', createNetworkRoutes(express.Router()));
router.use('/polygon', createNetworkRoutes(express.Router()));

// health check
app.get('/health', (req, res) => {
  res.json({ 
    version: '1.0.0',
    status: 'active'
  });
});

const PORT = process.env.API_PORT;

// start server
async function startServer() {
  try {
    // initialize two networks' yagna
    await Promise.all([
      yagnaService.initializeYagna('holesky'),
      yagnaService.initializeYagna('polygon')
    ]);
    
    logger.info('Yagna initialized');
    
    monitorService.startMonitoring(30000);
    monitorService.removeAllListeners('error');
    monitorService.on('error', (error) => {
      logger.error(`Instance monitor error: ${error}`);
    });


    const server = app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
    });

    // create websocket server
    const wss = new WebSocket.Server({ server });

    wss.on('connection', (ws, req) => {
      const agreementId = req.url?.split('/').pop();
      
      if (!agreementId) {
        ws.close();
        return;
      }

      sshController.handleConnection(ws, agreementId);
    });

  } catch (error) {
    logger.error(`Failed to start server: ${error}`);
    process.exit(1);
  }
}

startServer();

// graceful shutdown
process.on('SIGTERM', () => {
  logger.info('Sigterm closing server...');
  sshService.terminateAllConnections();
});

process.on('SIGINT', () => {
  logger.info('Sigint closing server...');
  sshService.terminateAllConnections();
  process.exit(0);
});
