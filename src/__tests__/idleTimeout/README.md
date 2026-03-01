# Idle Timeout Tests

This directory contains all tests for the idle session timeout feature.

## Test Structure

- **Unit Tests**: Test specific examples, edge cases, and error conditions
- **Property Tests**: Test universal properties across all inputs using fast-check

## Test Files (to be created in later tasks)

- `localStorage.utils.test.ts` - Tests for localStorage utility functions
- `throttle.utils.test.ts` - Tests for throttle utility function
- `useIdleTimeout.test.ts` - Unit tests for the main hook
- `useIdleTimeout.property.test.ts` - Property-based tests for the hook
- `IdleTimeoutModal.test.tsx` - Tests for the modal component
- `integration.test.tsx` - End-to-end integration tests

## Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

## Property-Based Testing

This feature uses fast-check for property-based testing. Each correctness property from the design document is implemented as a property test with minimum 100 iterations.

### Property Test Format

```typescript
import fc from 'fast-check';

describe('Feature: idle-session-timeout', () => {
  it('Property X: Description', () => {
    fc.assert(
      fc.property(
        // generators
        (inputs) => {
          // test implementation
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

## Test Coverage Goals

- Line Coverage: > 90%
- Branch Coverage: > 85%
- Property Coverage: 100% (all 17 properties tested)
