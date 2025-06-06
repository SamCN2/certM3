import {Client, expect} from '@loopback/testlab';
import {Certm3ApiApplication} from '../application';
import {setupApplication} from './test-helper';

describe('API Endpoints', () => {
  let app: Certm3ApiApplication;
  let client: Client;
  let testUserId: string;
  let testUsername: string;
  let testFailures: string[] = [];

  // Helper function to generate curl commands
  function generateCurlCommand(method: string, path: string, data?: any): string {
    const baseUrl = 'https://urp.ogt11.com/api';
    let command = `curl -X ${method} ${baseUrl}${path}`;
    if (data) {
      command += ` -H 'Content-Type: application/json' -d '${JSON.stringify(data)}'`;
    }
    return command;
  }

  // Helper function to handle test operations with continuation
  async function testOperation(
    operation: () => Promise<any>,
    description: string,
    curlCommand: string
  ) {
    try {
      await operation();
    } catch (error) {
      const failureMessage = `\nTest failed: ${description}\nTry: ${curlCommand}\nError: ${error.message}`;
      console.log(failureMessage);
      testFailures.push(failureMessage);
    }
  }

  before('setupApplication', async function() {
    this.timeout(10000);
    ({app, client} = await setupApplication());
  });

  after(async () => {
    await app.stop();
    if (testFailures.length > 0) {
      console.log('\nTest failures:');
      testFailures.forEach((failure, index) => {
        console.log(`\n${index + 1}:${failure}`);
      });
      throw new Error(`Test completed with ${testFailures.length} failures`);
    }
  });

  describe('Group Membership Flow', () => {
    it('completes the full group membership lifecycle', async () => {
      const randomNum = Math.floor(Math.random() * 999999);
      testUsername = `testuser${randomNum}`;

      // Create and verify test user
      const userData = {
        username: testUsername,
        email: `${testUsername}@test.com`,
        displayName: 'Test User',
      };

      await testOperation(
        async () => {
          const userRes = await client
            .post('/api/users')
            .send(userData)
            .expect(200);
          
          testUserId = userRes.body.id;
        },
        'Create user',
        generateCurlCommand('POST', '/api/users', userData)
      );

      await testOperation(
        async () => {
          const userCheckRes = await client
            .get(`/api/users/${testUserId}`)
            .expect(200);
          
          expect(userCheckRes.body.status).to.equal('active');
        },
        'Verify user is active',
        generateCurlCommand('GET', `/api/users/${testUserId}`)
      );

      // Create and verify test group
      const groupData = {
        name: testUsername,
        displayName: 'Test Group',
        description: 'A test group',
        status: 'active',
      };

      await testOperation(
        async () => {
          await client
            .post('/api/groups')
            .send(groupData)
            .expect(200);
        },
        'Create group',
        generateCurlCommand('POST', '/api/groups', groupData)
      );

      await testOperation(
        async () => {
          const groupCheckRes = await client
            .get(`/api/groups/${testUsername}`)
            .expect(200);
          
          expect(groupCheckRes.body.status).to.equal('active');
        },
        'Verify group is active',
        generateCurlCommand('GET', `/api/groups/${testUsername}`)
      );

      // Add user to groups
      const addMembersData = {
        userIds: [testUserId],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'test',
        updatedBy: 'test'
      };

      await testOperation(
        async () => {
          await client
            .post('/api/groups/users/members')
            .send(addMembersData)
            .expect(204);
        },
        'Add user to users group',
        generateCurlCommand('POST', '/api/groups/users/members', addMembersData)
      );

      await testOperation(
        async () => {
          await client
            .post(`/api/groups/${testUsername}/members`)
            .send(addMembersData)
            .expect(204);
        },
        'Add user to test group',
        generateCurlCommand('POST', `/api/groups/${testUsername}/members`, addMembersData)
      );

      // Verify group memberships
      await testOperation(
        async () => {
          const usersGroupRes = await client
            .get('/api/groups/users/members')
            .expect(200);
          
          expect(usersGroupRes.body).to.containEql({
            id: testUserId,
            username: testUsername,
            email: `${testUsername}@test.com`,
            displayName: 'Test User',
            status: 'active'
          });
        },
        'Verify user in users group',
        generateCurlCommand('GET', '/api/groups/users/members')
      );

      await testOperation(
        async () => {
          const testGroupRes = await client
            .get(`/api/groups/${testUsername}/members`)
            .expect(200);
          
          expect(testGroupRes.body).to.containEql({
            id: testUserId,
            username: testUsername,
            email: `${testUsername}@test.com`,
            displayName: 'Test User',
            status: 'active'
          });
        },
        'Verify user in test group',
        generateCurlCommand('GET', `/api/groups/${testUsername}/members`)
      );

      // Final verification before cleanup
      await testOperation(
        async () => {
          const activeUserRes = await client
            .get(`/api/users/${testUserId}`)
            .expect(200);
          
          expect(activeUserRes.body.status).to.equal('active');
        },
        'Verify user is active before cleanup',
        generateCurlCommand('GET', `/api/users/${testUserId}`)
      );

      await testOperation(
        async () => {
          const activeGroupRes = await client
            .get(`/api/groups/${testUsername}`)
            .expect(200);
          
          expect(activeGroupRes.body.status).to.equal('active');
        },
        'Verify group is active before cleanup',
        generateCurlCommand('GET', `/api/groups/${testUsername}`)
      );

      // Cleanup
      await testOperation(
        async () => {
          await client
            .del(`/api/groups/${testUsername}/members`)
            .send({userIds: [testUserId]})
            .expect(403);
        },
        'Verify group removal prevention for test group',
        generateCurlCommand('DELETE', `/api/groups/${testUsername}/members`, {userIds: [testUserId]})
      );

      await testOperation(
        async () => {
          await client
            .del('/api/groups/users/members')
            .send({userIds: [testUserId]})
            .expect(403);
        },
        'Verify group removal prevention for users group',
        generateCurlCommand('DELETE', '/api/groups/users/members', {userIds: [testUserId]})
      );

      await testOperation(
        async () => {
          await client
            .post(`/api/users/${testUserId}/deactivate`)
            .expect(204);
        },
        'Deactivate test user',
        generateCurlCommand('POST', `/api/users/${testUserId}/deactivate`)
      );

      await testOperation(
        async () => {
          await client
            .post(`/api/groups/${testUsername}/deactivate`)
            .expect(204);
        },
        'Deactivate test group',
        generateCurlCommand('POST', `/api/groups/${testUsername}/deactivate`)
      );

      // Post-cleanup verification
      await testOperation(
        async () => {
          const inactiveUserRes = await client
            .get(`/api/users/${testUserId}`)
            .expect(200);
          
          expect(inactiveUserRes.body.status).to.equal('inactive');
        },
        'Verify user is inactive after cleanup',
        generateCurlCommand('GET', `/api/users/${testUserId}`)
      );

      await testOperation(
        async () => {
          const inactiveGroupRes = await client
            .get(`/api/groups/${testUsername}`)
            .expect(200);
          
          expect(inactiveGroupRes.body.status).to.equal('inactive');
        },
        'Verify group is inactive after cleanup',
        generateCurlCommand('GET', `/api/groups/${testUsername}`)
      );

      await testOperation(
        async () => {
          const preservedTestGroupRes = await client
            .get(`/api/groups/${testUsername}/members`)
            .expect(200);
          
          expect(preservedTestGroupRes.body).to.containEql({
            id: testUserId,
            username: testUsername,
            email: `${testUsername}@test.com`,
            displayName: 'Test User',
            status: 'inactive'
          });
        },
        'Verify test group membership preservation',
        generateCurlCommand('GET', `/api/groups/${testUsername}/members`)
      );

      await testOperation(
        async () => {
          const preservedUsersGroupRes = await client
            .get('/api/groups/users/members')
            .expect(200);
          
          expect(preservedUsersGroupRes.body).to.containEql({
            id: testUserId,
            username: testUsername,
            email: `${testUsername}@test.com`,
            displayName: 'Test User',
            status: 'inactive'
          });
        },
        'Verify users group membership preservation',
        generateCurlCommand('GET', '/api/groups/users/members')
      );
    });
  });
}); 