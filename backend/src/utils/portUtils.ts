import net from 'net';

/**
 * get a random available port from the system
 * @returns Promise<number> a random available port
 */
export const getAvailablePort = (): Promise<number> => {
  return new Promise((resolve, reject) => {
    // create a temporary server to get an available port
    const server = net.createServer();
    
    // let the system randomly assign an available port
    server.listen(0, () => {
      const address = server.address();
      // get the assigned port
      const port = typeof address === 'object' && address !== null ? address.port : null;
      
      // close the server
      server.close(() => {
        if (port) {
          resolve(port);
        } else {
          reject(new Error('Failed to get an available port'));
        }
      });
    });

    server.on('error', (err) => {
      reject(err);
    });
  });
};

/**
 * check if a specified port is available
 * @param port the port to check
 * @returns Promise<boolean> true if the port is available, false otherwise
 */
export const isPortAvailable = (port: number): Promise<boolean> => {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', () => {
      resolve(false);
    });

    server.once('listening', () => {
      server.close();
      resolve(true);
    });

    server.listen(port);
  });
}; 