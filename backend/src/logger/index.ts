import dotenv from 'dotenv';
import pino from 'pino';
import fs from 'fs';
import path from 'path';

dotenv.config();
const transports: any[] = [];

const formatOptions = {
  translateTime: 'SYS:standard',
  ignore: 'pid,hostname',
  messageFormat: '{msg}',
  singleLine: true
};


if (process.env.LOG_CONSOLE === 'true') {
  transports.push({
    target: 'pino-pretty',
    options: {
      ...formatOptions,
      colorize: true,
    }
  });
}

if (process.env.LOG_FILE) {
  try {
    const logDir = path.dirname(process.env.LOG_FILE);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    transports.push({
      target: 'pino-pretty',
      options: { 
        ...formatOptions,
        colorize: false,
        destination: process.env.LOG_FILE,
        mkdir: true,
        sync: false
      }
    });
  } catch (error) {
    console.error('Failed to create log directory:', error);
  }
}

const logger = pino({
  transport: {
    targets: transports
  }
});

export default logger;
