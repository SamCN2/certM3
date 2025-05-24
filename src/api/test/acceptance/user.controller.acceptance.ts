import {Client, expect} from '@loopback/testlab';
import {Certm3ApiApplication} from '../../src';
import {setupApplication} from '../../src/__tests__/test-helper';

describe('UserController', () => {
  let app: Certm3ApiApplication;
  let client: Client;

  before('setupApplication', async () => {
    ({app, client} = await setupApplication());
  });

  after(async () => {
    await app.stop();
  });

  it('gets user by username', async () => {
    const res = await client
      .get('/users/username/testuser')
      .expect(200);
    expect(res.body).to.containEql({
      username: 'testuser',
      email: 'test@example.com',
    });
  });

  it('returns 404 for non-existent username', async () => {
    await client
      .get('/users/username/nonexistentuser')
      .expect(404);
  });
}); 