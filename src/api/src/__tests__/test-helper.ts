import {Client} from '@loopback/testlab';
import {Certm3ApiApplication} from '../application';
import supertest from 'supertest';

export async function setupApplication(): Promise<AppWithClient> {
  // Create a client that points to the production URL
  const client = supertest('https://urp.ogt11.com');
  
  // We still need an app instance for cleanup, but it won't be used for requests
  const app = new Certm3ApiApplication();
  await app.boot();

  return {app, client};
}

export interface AppWithClient {
  app: Certm3ApiApplication;
  client: Client;
} 