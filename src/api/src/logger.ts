/**
 * Copyright 2025 ogt11.com, llc
 */

import winston from 'winston';
import { ConfigLoader } from './config-loader';

export class Logger {
  private static instance: Logger;
  private logger: winston.Logger;

  private constructor() {
    const configLoader = ConfigLoader.getInstance();
    const config = configLoader.loadConfig();
    
    // Create Winston logger with JSON format
    this.logger = winston.createLogger({
      level: config.log_level || 'info',
      format: winston.format.combine(
        winston.format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss.SSS'
        }),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { 
        service: 'api',
        timestamp: new Date().toISOString()
      },
      transports: [
        new winston.transports.File({ 
          filename: config.log_file || '/var/spool/certM3/logs/api/app.log',
          maxsize: 10485760, // 10MB
          maxFiles: 5,
          tailable: true
        })
      ]
    });

    // Add console output if verbose mode is enabled
    if (config.verbose) {
      this.logger.add(new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss.SSS'
          }),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
          })
        )
      }));
    }
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  info(message: string, meta?: any) {
    this.logger.info(message, meta);
  }

  error(message: string, meta?: any) {
    this.logger.error(message, meta);
  }

  warn(message: string, meta?: any) {
    this.logger.warn(message, meta);
  }

  debug(message: string, meta?: any) {
    this.logger.debug(message, meta);
  }

  // Request-specific logging with correlation
  logRequest(req: any, res: any, duration: number) {
    const requestId = req.headers['x-request-id'] || 'unknown';
    const userId = req.user?.id || 'anonymous';
    
    this.info('Request completed', {
      request_id: requestId,
      user_id: userId,
      method: req.method,
      path: req.path,
      query: req.query,
      status: res.statusCode,
      duration: `${duration}ms`,
      remote_ip: req.ip || req.connection?.remoteAddress,
      user_agent: req.headers['user-agent']
    });
  }

  // Error logging with request context
  logError(error: Error, req?: any, context?: any) {
    const requestId = req?.headers['x-request-id'] || 'unknown';
    const userId = req?.user?.id || 'anonymous';
    
    this.error('Error occurred', {
      request_id: requestId,
      user_id: userId,
      error: error.message,
      stack: error.stack,
      method: req?.method,
      path: req?.path,
      ...context
    });
  }

  // Security event logging
  logSecurityEvent(eventType: string, details: any, req?: any) {
    const requestId = req?.headers['x-request-id'] || 'unknown';
    const userId = req?.user?.id || 'anonymous';
    
    this.warn('Security event', {
      event_type: eventType,
      request_id: requestId,
      user_id: userId,
      method: req?.method,
      path: req?.path,
      remote_ip: req?.ip || req?.connection?.remoteAddress,
      ...details
    });
  }

  // Database operation logging
  logDatabaseOperation(operation: string, table: string, details: any, req?: any) {
    const requestId = req?.headers['x-request-id'] || 'unknown';
    const userId = req?.user?.id || 'anonymous';
    
    this.debug('Database operation', {
      request_id: requestId,
      user_id: userId,
      operation: operation,
      table: table,
      ...details
    });
  }
} 