/**
 * Copyright 2025 ogt11.com, llc
 */

import {
  MiddlewareSequence,
  RequestContext,
  HttpErrors,
} from '@loopback/rest';
import { Logger } from './logger';
import { v4 as uuidv4 } from 'uuid';

export class MySequence extends MiddlewareSequence {
  private logger = Logger.getInstance();

  async handle(context: RequestContext): Promise<void> {
    const startTime = Date.now();
    
    // Generate request ID if not present
    if (!context.request.headers['x-request-id']) {
      context.request.headers['x-request-id'] = uuidv4();
    }

    try {
      await super.handle(context);
      
      // Log successful request
      this.logger.logRequest(
        context.request, 
        context.response, 
        Date.now() - startTime
      );
    } catch (error) {
      // Log error with request context
      this.logger.logError(error, context.request, {
        duration: Date.now() - startTime
      });

      // Handle HTTP errors
      if (error instanceof HttpErrors.HttpError) {
        context.response.status(error.statusCode);
        context.response.send({
          error: {
            statusCode: error.statusCode,
            name: error.name,
            message: error.message,
          },
        });
        return;
      }

      // Handle other errors
      context.response.status(500);
      context.response.send({
        error: {
          statusCode: 500,
          name: 'InternalServerError',
          message: 'An internal server error occurred',
        },
      });
    }
  }
}
