import { Client } from '@loopback/testlab';
import { Certm3ApiApplication } from '../application';
import { setupApplication } from '../__tests__/test-helper';

async function testAddMember() {
  const { app, client } = await setupApplication();
  try {
    // Query for a user ID that is not in any group
    const response = await client.get('/api/users').expect(200);
    const users = response.body;
    const userNotInGroup = users.find((user: any) => !user.groups || user.groups.length === 0);

    if (!userNotInGroup) {
      console.log('No users found that are not in any group.');
      return;
    }

    const userId = userNotInGroup.id;
    console.log(`Attempting to add user ${userId} to the 'users' group...`);

    // Attempt to add the user to the 'users' group
    await client
      .post(`/api/groups/users/members`)
      .send({ userIds: [userId] })
      .expect(204);

    console.log(`User ${userId} successfully added to the 'users' group.`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await app.stop();
  }
}

testAddMember().catch(console.error); 