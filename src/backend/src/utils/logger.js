import winston from 'winston';
import { mkdirSync } from 'node:fs';

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue'
};

winston.addColors(colors);

const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} [${info.level}]: ${info.message}`
  )
);

const transports = [new winston.transports.Console()];

// File logging is optional - disable with LOG_TO_FILE=false (e.g. on
// read-only serverless hosts). Enabled by default for local development.
if (process.env.LOG_TO_FILE !== 'false') {
  try {
    mkdirSync('logs', { recursive: true });
    transports.push(
      new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
      new winston.transports.File({ filename: 'logs/all.log' })
    );
  } catch {
    // Cannot create the logs directory - console logging only.
  }
}

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format: consoleFormat,
  transports
});
