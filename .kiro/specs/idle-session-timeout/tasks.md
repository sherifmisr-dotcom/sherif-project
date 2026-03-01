# Implementation Plan: Idle Session Timeout

## Overview

This implementation plan breaks down the Idle Session Timeout feature into discrete, testable coding tasks. The approach follows a bottom-up strategy: build utility functions first, then the core hook, then the UI component, and finally integrate everything together. Each task includes property-based tests to ensure correctness.

The implementation uses TypeScript with React hooks and focuses on code quality, type safety, and comprehensive testing.

## Tasks

- [x] 1. Set up project structure and utilities
  - Create directory structure for hooks, components, utils, and tests
  - Set up TypeScript types and interfaces
  - Install testing dependencies (vitest, @testing-library/react, fast-check)
  - _Requirements: 14.1, 16.1, 16.2_

- [-] 2. Implement localStorage utility functions
  - [x] 2.1 Create localStorage helper functions with error handling
    - Implement `safeGetLastActivity()` with validation
    - Implement `safeSetLastActivity()` with try-catch
    - Implement `clearLastActivity()` for cleanup
    - Handle localStorage unavailable, quota exceeded, and invalid data
    - _Requirements: 9.1, 9.2, 9.5, 14.1_
  
  - [ ]* 2.2 Write property test for localStorage persistence
    - **Property 11: Activity Persists to localStorage**
    - **Validates: Requirements 9.1**
  
  - [ ]* 2.3 Write unit tests for localStorage error handling
    - Test localStorage unavailable scenario
    - Test invalid data handling
    - Test quota exceeded scenario
    - _Requirements: 9.1, 9.2_

- [x] 3. Implement throttle utility function
  - [x] 3.1 Create throttle function for activity events
    - Implement throttle with configurable delay
    - Ensure first call executes immediately
    - Subsequent calls within throttle window are ignored
    - _Requirements: 11.1, 11.2_
  
  - [ ]* 3.2 Write property test for throttle behavior
    - **Property 14: Activity Updates Are Throttled**
    - **Validates: Requirements 11.1, 11.2**

- [x] 4. Implement core useIdleTimeout hook
  - [x] 4.1 Create hook interface and basic structure
    - Define `UseIdleTimeoutOptions` interface
    - Define `UseIdleTimeoutReturn` interface
    - Set up state variables (showModal, remainingSeconds)
    - Set up refs (lastActivityRef, checkIntervalRef, countdownIntervalRef, isModalOpenRef)
    - _Requirements: 13.1, 13.2, 13.4, 14.1_
  
  - [x] 4.2 Implement activity tracking logic
    - Create throttled `handleActivity` function
    - Attach event listeners for mouse, keyboard, scroll, touch
    - Update lastActivityRef and localStorage on activity
    - Ignore activity when modal is open
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 10.1_
  
  - [ ]* 4.3 Write property test for activity tracking
    - **Property 1: Activity Tracking Updates Last Activity Time**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4**
  
  - [ ]* 4.4 Write property test for activity ignored during modal
    - **Property 13: Activity During Modal Does Not Reset Timer**
    - **Validates: Requirements 10.1**

- [-] 5. Implement idle status checking logic
  - [x] 5.1 Create checkIdleStatus function
    - Calculate idle duration using Date.now()
    - Show modal when idle >= (idleMs - warnMs)
    - Trigger logout when idle >= idleMs
    - Handle negative idle duration (clock went backwards)
    - _Requirements: 3.1, 6.1, 8.2, 8.3, 14.1_
  
  - [ ]* 5.2 Write property test for modal timing
    - **Property 3: Modal Appears at Warning Threshold**
    - **Validates: Requirements 3.1**
  
  - [ ]* 5.3 Write property test for auto-logout timing
    - **Property 7: Auto-Logout After Full Idle Period**
    - **Validates: Requirements 6.1, 6.4**
  
  - [ ]* 5.4 Write property test for timer accuracy
    - **Property 15: Timer Accuracy Despite Throttling**
    - **Validates: Requirements 11.3, 14.1**

- [x] 6. Implement modal countdown logic
  - [x] 6.1 Create countdown interval management
    - Start countdown when modal opens
    - Decrement remainingSeconds every second
    - Clear interval when modal closes
    - _Requirements: 3.5_
  
  - [ ]* 6.2 Write property test for countdown
    - **Property 4: Countdown Decrements During Modal**
    - **Validates: Requirements 3.5**

- [x] 7. Implement user action handlers
  - [x] 7.1 Create handleContinue function
    - Close modal
    - Reset lastActivityAt to current time
    - Update localStorage
    - Resume activity tracking
    - _Requirements: 4.1, 4.2, 4.3, 10.4_
  
  - [x] 7.2 Create handleLogout function
    - Call onLogout callback with error handling
    - Close modal
    - Clear localStorage
    - _Requirements: 5.1, 5.4_
  
  - [ ]* 7.3 Write property test for continue button
    - **Property 5: Continue Button Resets Timer and Closes Modal**
    - **Validates: Requirements 4.1, 4.2, 4.3, 10.4**
  
  - [ ]* 7.4 Write property test for logout button
    - **Property 6: Logout Button Triggers Logout Callback**
    - **Validates: Requirements 5.1, 5.4**

- [x] 8. Implement visibility change handling
  - [x] 8.1 Create handleVisibilityChange function
    - Listen to visibilitychange and focus events
    - Check idle status without resetting timer
    - Show modal or logout based on idle duration
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  
  - [ ]* 8.2 Write property test for visibility change
    - **Property 10: Visibility Change Checks Idle Status Without Resetting**
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.4**

- [x] 9. Implement authentication state management
  - [x] 9.1 Create initialization and cleanup logic
    - Initialize tracking when isAuthenticated becomes true
    - Clean up intervals and listeners when isAuthenticated becomes false
    - Restore state from localStorage on mount
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 9.2, 9.3, 9.4, 9.5_
  
  - [ ]* 9.2 Write property test for unauthenticated state
    - **Property 2: No Activity Tracking When Unauthenticated**
    - **Validates: Requirements 1.5, 7.1, 7.2**
  
  - [ ]* 9.3 Write property test for authentication cleanup
    - **Property 8: Authentication State Change Triggers Cleanup**
    - **Validates: Requirements 7.4, 9.5**
  
  - [ ]* 9.4 Write property test for authentication initialization
    - **Property 9: Authentication State Change Starts Tracking**
    - **Validates: Requirements 7.3**
  
  - [ ]* 9.5 Write property test for state restoration
    - **Property 12: State Restoration from localStorage on Mount**
    - **Validates: Requirements 9.2, 9.3, 9.4**

- [x] 10. Checkpoint - Ensure hook tests pass
  - Run all hook tests (unit and property tests)
  - Verify all 17 correctness properties pass
  - Fix any issues before proceeding to UI
  - Ask the user if questions arise

- [x] 11. Implement IdleTimeoutModal component
  - [x] 11.1 Create modal component structure
    - Define `IdleTimeoutModalProps` interface
    - Implement modal overlay and content
    - Add conditional rendering based on isOpen
    - _Requirements: 3.2, 3.3, 3.4, 15.1, 15.2_
  
  - [x] 11.2 Add modal content and styling
    - Display Arabic warning text with countdown
    - Add Continue button (استمرار)
    - Add Logout button (إنهاء الجلسة)
    - Style with CSS modules for RTL support
    - _Requirements: 3.2, 3.3, 3.4_
  
  - [x] 11.3 Add accessibility features
    - Add ARIA attributes (role="dialog", aria-modal="true")
    - Implement Escape key handler
    - Auto-focus Continue button
    - Add keyboard navigation support
    - _Requirements: 3.3, 3.4_
  
  - [ ]* 11.4 Write unit tests for modal component
    - Test modal displays correct Arabic text
    - Test Continue button renders and works
    - Test Logout button renders and works
    - Test Escape key closes modal
    - Test modal doesn't render when isOpen is false
    - _Requirements: 3.2, 3.3, 3.4_
  
  - [ ]* 11.5 Write property test for single modal guarantee
    - **Property 16: Single Modal Guarantee**
    - **Validates: Requirements 15.1, 15.2**
  
  - [ ]* 11.6 Write property test for modal reshow capability
    - **Property 17: Modal Can Be Reshown After Closing**
    - **Validates: Requirements 15.3**

- [x] 12. Create integration example
  - [x] 12.1 Create example App integration
    - Show how to use useIdleTimeout in App.tsx or AuthProvider
    - Connect to authentication context
    - Wire up onLogout callback
    - Render IdleTimeoutModal with hook state
    - _Requirements: 7.3, 7.4, 13.1, 13.2, 13.4_
  
  - [x] 12.2 Add API interceptor example (optional)
    - Show how to handle 401/419 responses
    - Display "انتهت الجلسة" message
    - Trigger logout and redirect
    - _Requirements: 12.1, 12.2, 12.3_

- [x] 13. Write integration tests
  - [x]* 13.1 Write end-to-end integration test
    - Test full flow: activity → idle → modal → continue
    - Test full flow: activity → idle → modal → logout
    - Test full flow: activity → idle → auto-logout
    - Test page reload with expired session
    - Test visibility change with expired session
    - _Requirements: All requirements_

- [x] 14. Final checkpoint - Ensure all tests pass
  - Run all tests (unit, property, integration)
  - Verify 100% property coverage (17 properties)
  - Check TypeScript compilation with strict mode
  - Review code quality and error handling
  - Ask the user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each property test should run minimum 100 iterations
- All tests should use vitest with fake timers for time manipulation
- Property tests use fast-check for input generation
- Focus on type safety: no `any` types, explicit return types
- All localStorage operations wrapped in try-catch
- Clean up intervals and event listeners in useEffect cleanup
- Handle edge cases: clock changes, rapid auth changes, component unmount
