/**
 * Copyright 2025 ogt11.com, llc
 */

import {
  MiddlewareSequence,
  RequestContext,
  HttpErrors,
} from '@loopback/rest';

export class MySequence extends MiddlewareSequence {
  async handle(context: RequestContext): Promise<void> {
    try {
      await super.handle(context);
    } catch (error) {
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
