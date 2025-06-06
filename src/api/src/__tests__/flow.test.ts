import request from 'supertest';
import { expect } from '@loopback/testlab';

const api = request('https://urp.ogt11.com/api');

// Helper function to generate curl command
function generateCurlCommand(method: string, path: string, body?: any): string {
  const curlCommand = `curl -X ${method} 'https://urp.ogt11.com/api${path}' \\
  -H 'Content-Type: application/json' \\
  ${body ? `-d '${JSON.stringify(body)}'` : ''}`;
  return curlCommand;
}

describe('Complete Flow Test', () => {
  // Test data
  const testUser = {
    username: `testuser${Date.now()}`,
    email: `testuser${Date.now()}@testemail.com`,
    displayName: 'Test User'
  };

  let requestId: string;
  let userId: string;
  let certificateId: string;

  // Step 1: Check username availability
  it('should check username availability', async () => {
    try {
      const response = await api
        .get(`/request/check-username/${testUser.username}`)
        .expect(404); // 404 means username is available

      expect(response.body).to.have.property('error');
      expect(response.body.error).to.have.property('message', 'Username is available');
    } catch (error) {
      console.log('\nTo debug this step, run:');
      console.log(generateCurlCommand('GET', `/request/check-username/${testUser.username}`));
      throw error;
    }
  });

  // Step 2: Submit account request
  it('should create a new request', async () => {
    try {
      const response = await api
        .post('/requests')
        .send(testUser)
        .expect(200);

      expect(response.body).to.have.property('id');
      expect(response.body).to.have.property('challenge');
      expect(response.body.status).to.equal('pending');

      requestId = response.body.id;
    } catch (error) {
      console.log('\nTo debug this step, run:');
      console.log(generateCurlCommand('POST', '/requests', testUser));
      throw error;
    }
  });

  // Step 3: Validate the request
  it('should validate the request', async () => {
    try {
      // First get the request to get the challenge
      const getResponse = await api
        .get(`/requests/${requestId}`)
        .expect(200);

      const challenge = getResponse.body.challenge;

      // Now validate with the challenge
      const validateResponse = await api
        .post(`/requests/${requestId}/validate`)
        .send({ challenge });

      // Log the full response for debugging
      console.log('Validation response:', {
        status: validateResponse.status,
        body: validateResponse.body,
        headers: validateResponse.headers
      });

      // Assert the expected status and response
      expect(validateResponse.status).to.equal(200);
      expect(validateResponse.body).to.have.property('userId');
      userId = validateResponse.body.userId;

      // Get the request to verify it's approved
      const requestResponse = await api
        .get(`/requests/${requestId}`)
        .expect(200);

      expect(requestResponse.body.status).to.equal('approved');
    } catch (error) {
      console.log('\nTo debug this step, run:');
      console.log(generateCurlCommand('GET', `/requests/${requestId}`));
      console.log('\nThen run:');
      console.log(generateCurlCommand('POST', `/requests/${requestId}/validate`, { challenge: 'CHALLENGE_TOKEN' }));
      throw error;
    }
  });

  // Step 4: Create the user
  it('should create the user', async () => {
    try {
      // First try to create the user
      //const response = await api
      await api
        .post('/users')
        .send(testUser)
        .expect(409); // User already exists

      // If user exists, get them by username
      const getResponse = await api
        .get(`/users/username/${testUser.username}`)
        .expect(200);

      expect(getResponse.body).to.have.property('id');
      expect(getResponse.body).to.have.property('username', testUser.username);
      expect(getResponse.body).to.have.property('email', testUser.email);
      expect(getResponse.body).to.have.property('displayName', testUser.displayName);
      userId = getResponse.body.id;
    } catch (error) {
      console.log('\nTo debug this step, run:');
      console.log(generateCurlCommand('POST', '/users', testUser));
      throw error;
    }
  });

  // Step 4.5: Get user by username
  it('should get the user by username', async () => {
    try {
      const response = await api
        .get(`/users/username/${testUser.username}`)
        .expect(200);

      expect(response.body).to.have.property('id');
      expect(response.body).to.have.property('username', testUser.username);
      expect(response.body).to.have.property('email', testUser.email);
      expect(response.body).to.have.property('displayName', testUser.displayName);
      userId = response.body.id; // update userId for later steps
    } catch (error) {
      console.log('\nTo debug this step, run:');
      console.log(generateCurlCommand('GET', `/users/username/${testUser.username}`));
      throw error;
    }
  });

  // Step 5: Add user to group
  it('should add user to users group', async () => {
    try {
      await api
        .post('/groups/users/members')
        .send({
          userIds: [userId],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        .expect(204); // 204 No Content is the correct response for successful group membership addition
    } catch (error) {
      console.log('\nTo debug this step, run:');
      console.log(generateCurlCommand('POST', '/groups/users/members', {
        userIds: [userId],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));
      throw error;
    }
  });

  // Step 6: Create certificate
  it('should create a certificate', async () => {
    try {
      // Certificate signing is not part of the API spec, so we skip that step
      // and directly create the certificate record
      const createResponse = await api
        .post('/certificates')
        .send({
          codeVersion: '1.0.0',
          username: testUser.username,
          userId: userId,
          commonName: testUser.displayName,
          email: testUser.email,
          fingerprint: 'test-fingerprint', // In real usage, this would be derived from the certificate
          notBefore: new Date().toISOString(),
          notAfter: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        })
        .expect(200);

      expect(createResponse.body).to.have.property('serialNumber');
      certificateId = createResponse.body.serialNumber;
    } catch (error) {
      console.log('\nTo debug this step, run:');
      console.log(generateCurlCommand('POST', '/certificates', {
        codeVersion: '1.0.0',
        username: testUser.username,
        userId: userId,
        commonName: testUser.displayName,
        email: testUser.email,
        fingerprint: 'test-fingerprint',
        notBefore: new Date().toISOString(),
        notAfter: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      }));
      throw error;
    }
  });

  // Step 7: Verify certificate exists
  it('should verify certificate exists', async () => {
    try {
      const response = await api
        .get(`/certificates/${certificateId}`)
        .expect(200);

      expect(response.body).to.have.property('serialNumber', certificateId);
      expect(response.body).to.have.property('username', testUser.username);
      expect(response.body).to.have.property('userId', userId);
    } catch (error) {
      console.log('\nTo debug this step, run:');
      console.log(generateCurlCommand('GET', `/certificates/${certificateId}`));
      throw error;
    }
  });

  // Step 8: List user's certificates
  it('should list user certificates', async () => {
    try {
      const response = await api
        .get(`/users/${userId}/certificates`)
        .expect(200);

      expect(Array.isArray(response.body)).to.be.true;
      expect(response.body.length).to.be.greaterThan(0);
      expect(response.body[0]).to.have.property('serialNumber', certificateId);
    } catch (error) {
      console.log('\nTo debug this step, run:');
      console.log(generateCurlCommand('GET', `/users/${userId}/certificates`));
      throw error;
    }
  });
}); 
