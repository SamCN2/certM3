const axios = require('axios');
const { expect } = require('chai');

const API_BASE_URL = process.env.API_URL || 'https://urp.ogt11.com/api';
const TEST_GROUP_NAME = `test-group-${Date.now()}`;
const TEST_GROUP_DISPLAY_NAME = 'Test Group';

describe('Group Management Tests', () => {
  it('should create a group', async () => {
    console.log('Creating test group:', {
      name: TEST_GROUP_NAME,
      displayName: TEST_GROUP_DISPLAY_NAME
    });

    const response = await axios.post(`${API_BASE_URL}/groups`, {
      name: TEST_GROUP_NAME,
      displayName: TEST_GROUP_DISPLAY_NAME
    });

    console.log('Group creation response:', response.data);

    expect(response.status).to.equal(200);
    expect(response.data).to.have.property('name', TEST_GROUP_NAME);
    expect(response.data).to.have.property('displayName', TEST_GROUP_DISPLAY_NAME);
  });

  it('should get the created group', async () => {
    console.log('Getting test group:', TEST_GROUP_NAME);

    const response = await axios.get(`${API_BASE_URL}/groups/${TEST_GROUP_NAME}`);

    console.log('Group get response:', response.data);

    expect(response.status).to.equal(200);
    expect(response.data).to.have.property('name', TEST_GROUP_NAME);
    expect(response.data).to.have.property('displayName', TEST_GROUP_DISPLAY_NAME);
  });

  it('should deactivate the group', async () => {
    console.log('Deactivating test group:', TEST_GROUP_NAME);

    const response = await axios.post(`${API_BASE_URL}/groups/${TEST_GROUP_NAME}/deactivate`);

    console.log('Group deactivation response:', response.status);

    expect(response.status).to.equal(204);
  });

  it('should confirm group is inactive', async () => {
    console.log('Confirming group is inactive:', TEST_GROUP_NAME);

    const response = await axios.get(`${API_BASE_URL}/groups/${TEST_GROUP_NAME}`);
    console.log('Group status response:', response.data);

    expect(response.status).to.equal(200);
    expect(response.data).to.have.property('status', 'inactive');
  });
}); 