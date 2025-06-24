# Routing Path Changes - Lessons Learned

## The Incident
During an attempt to change route prefixes from `/app` to `/mw`, we discovered that changing the route registrations in `main.go` had no effect on the actual server behavior. This led to several hours of investigation and confusion.

## What We Found
1. Route paths are referenced in multiple places:
   - Route registration in `main.go`
   - Path checks in middleware
   - Nginx configuration
   - Frontend code
   - Documentation
   - Test files

2. The actual routing behavior is more complex than initially assumed:
   - Nginx handles path translation
   - Middleware has its own path checks
   - The system appears to be more flexible with paths than the code suggests

## Key Lessons
1. **Document First**: Before making path changes, document all places where paths are referenced
2. **Single Change**: Make one change at a time and observe effects
3. **Test Thoroughly**: Test changes in isolation before committing
4. **Look for Red Flags**: When a change has no effect, investigate why before proceeding
5. **Consider Dependencies**: Path changes often affect multiple components

## Best Practices for Future Path Changes
1. Create a comprehensive list of all path references
2. Document the current behavior
3. Make changes in a test environment first
4. Test each component affected by the change
5. Have a clear rollback plan
6. Consider the impact on:
   - Frontend code
   - Backend code
   - Nginx configuration
   - Documentation
   - Tests
   - API specifications

## Why This Matters
Path changes can have far-reaching effects and are often more complex than they appear. A small change in one place might require coordinated changes in multiple components. Taking the time to understand the full scope of changes before making them can save significant time and prevent production issues.

## Related Files
- `src/mw/cmd/certm3-app/main.go`
- `src/mw/internal/app/middleware.go`
- `nginx/certm3.conf`
- `src/mw/test/middleware.test.js`
- Various frontend files and documentation 