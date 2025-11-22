# Testing Documentation

## Test Strategy

This project uses **Vitest** and **React Testing Library** for testing, focusing on critical business logic and API integration.

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm test -- --coverage
```

## Test Coverage

### API Layer (`src/test/api.test.ts`)
Tests for all document API functions with comprehensive coverage:

- **fetchVersions**: Fetching version lists, error handling
- **fetchVersion**: Fetching specific versions, 404 handling
- **createVersion**: Creating new versions, validation
- **updateVersion**: Updating content, error states
- **Network resilience**: Timeout and error handling

### Why These Tests Matter

1. **API functions are pure** - Easy to test, high reliability
2. **Critical business logic** - Version management is core functionality
3. **Error handling** - Ensures graceful failures
4. **Integration confidence** - Validates backend contract

## Test Philosophy

- **Strategic, not exhaustive**: Focus on high-value, high-risk areas
- **Maintainable**: Tests should be easy to understand and update
- **Fast**: Unit tests run in milliseconds
- **Reliable**: No flaky tests, deterministic results

## What's NOT Tested (And Why)

- **Styling/CSS**: Visual testing is manual or with Storybook
- **React Query internals**: Library is well-tested by TanStack
- **TipTap editor**: Third-party component with own tests
- **Simple renders**: Over-testing UI adds maintenance burden

## Future Test Additions

If time permits, consider:
- Integration tests for version switching workflow
- Custom dropdown component behavior
- React Query cache invalidation logic
- End-to-end tests with Playwright

## Coverage Goals

- **API Layer**: 100% coverage (achieved)
- **Business Logic**: 80%+ coverage
- **UI Components**: 60%+ coverage (strategic)
- **Overall**: 70%+ meaningful coverage

## Notes

Tests run in Node environment with jsdom for DOM APIs. All network calls are mocked for speed and reliability.

