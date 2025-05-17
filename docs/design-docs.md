# Design Documentation for GET /api/users/{userId}/groups

## Overview
This endpoint retrieves the groups that a user is a member of, returning lightweight groupid, groupname tuples.

## Purpose
The purpose of this endpoint is to provide a quick way to retrieve the groups associated with a specific user without needing to make repeated calls to get group details.

## Response Format
The response will be an array of group names (strings).

## Implementation Notes
- The endpoint should be implemented in the `UserController`.
- It will query the `user_groups` table to find all group names for the specified user.
- The response will be constructed to include only the group names. 