// Validate email
const validateResponse = await fetch(`${baseUrl}/app/validate-email`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    requestId: requestId,
    challengeToken: challengeToken,
  }),
});

expect(validateResponse.status).toBe(200);
const validateData = await validateResponse.json();
expect(validateData).toHaveProperty('jwt');
const jwt = validateData.jwt;

// Get user groups
const groupsResponse = await fetch(`${baseUrl}/app/groups/${username}`, {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
  },
});

expect(groupsResponse.status).toBe(200);
const groups = await groupsResponse.json();
expect(Array.isArray(groups)).toBe(true);
expect(groups).toContain(username);
expect(groups).toContain('users');

// Submit CSR 