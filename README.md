# Try Decentralized physical infrastructure network.

This is a decentralized computing resource management system based on Golem Network, integrated with Yagna and traefik, supporting the deployment of instances and endpoint access.

## System Architecture

The system includes the following main components:

- Frontend: React front-end interface
- Backend: Node.js backend API service
- Yagna: Golem Network for Yagna
- MySQL: Data storage
- Traefik: Reverse proxy server

## Prerequisites

- Docker 20.10+
- Docker Compose v2.0+
- Node.js 18+
- At least 2GB of available memory
- At least 2GB of available disk space
- Linux/Windows WSL


## Quick Start

### 1. Clone the code

```bash
git clone https://github.com/jackmamaa/t_depin.git
cd t_depin
```


### 2. Configure environment variables 

The main environment variables to configure `.env` file:

- `DOMAIN`: Your domain name(e.g. tdepin.com, Ensure DNS resolution: *.tdepin.com)
- `VITE_REOWN_APP_NAME`: Reown application name
- `VITE_REOWN_PROJECT_ID`: Reown project ID
- `RELAYER_PRIVATE_KEY`: Relay wallet used by the claim faucet
- `VITE_DEPOSIT_FEE_AMOUNT`: Single deposit fee
- `MYSQL_ROOT_PASSWORD`: MySQL root password
- `MYSQL_PASSWORD`: MySQL user password

### 3. Start the service

```bash
sudo docker-compose build
sudo docker-compose up -d
```

Wait for 1~3 minutes, then you can access:

- Frontend interface: `http://<your-domain>:5173`
- Backend API: `http://<your-domain>:3001/api`
- Traefik panel: `http://<your-domain>:8080`

Note: To ensure that yagna can process transactions normally, please check `VITE_DEPOSIT_SPENDER_ADDRESS` in the `yagna/config` file and add the mainnet token holesky: ETH or Poygon: POL to it.

## Directory structure

- `frontend/`: Frontend code
- `backend/`: Backend code
- `yagna/`: Yagna service configuration
- `mysql/`: MySQL database storage
- `traefik/`: Traefik reverse proxy configuration
- `docker-compose.yml`: Docker Compose configuration file
- `.env`: Environment variable configuration file
