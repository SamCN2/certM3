## Email Validation URL Format
The backend needs to generate email validation links in the format:
```
https://[domain]/index.html?requestId=[id]&challengeToken=[token]
```
This will allow the frontend to:
1. Detect when a user arrives via email link
2. Pre-fill the validation form
3. Maintain state through the validation process 