# ShowRunnerApp Refactoring Opportunities

## Overview
This document outlines refactoring opportunities to improve code maintainability, reduce duplication, and enhance testability.

## 1. CSRF Token Management 🔴 High Priority

### Current Issues
- CSRF token logic scattered across multiple files:
  - `services/api.js` - token storage, refresh logic
  - `services/auth.js` - token extraction from HTML
  - `actions/showActions.js` - token refresh before requests
  - `components/ShowForm.js` - manual token refresh for multipart requests
- Duplicated token refresh logic
- Inconsistent token handling between JSON and multipart requests

### Proposed Solution
Create a centralized `CsrfTokenService`:

```javascript
// services/csrfTokenService.js
class CsrfTokenService {
  async getToken() { }
  async refreshToken() { }
  async ensureFreshToken() { } // Auto-refresh if needed
  async addToFormData(formData) { }
  getHeaders() { }
}
```

**Benefits:**
- Single source of truth for CSRF token management
- Consistent token handling across all request types
- Easier to test and maintain
- Automatic token refresh when needed

---

## 2. Error Handling 🔴 High Priority

### Current Issues
- Duplicated error parsing logic in:
  - `actions/showActions.js` (createShow, updateShow)
  - `components/ShowForm.js` (handlePage4SaveSlides)
- HTML error parsing duplicated
- Inconsistent error message extraction

### Proposed Solution
Create a centralized error handler:

```javascript
// utils/errorHandler.js
export class ErrorHandler {
  static async parseErrorResponse(response) { }
  static extractErrorMessage(error) { }
  static parseHtmlError(html) { }
  static formatUserMessage(error) { }
}
```

**Benefits:**
- Consistent error handling across the app
- Better user-facing error messages
- Easier to update error parsing logic

---

## 3. FormData Construction for Multipart Requests 🟡 Medium Priority

### Current Issues
- Manual FormData construction in `ShowForm.js` (handlePage4SaveSlides)
- Complex slide data cleaning logic embedded in component
- Duplicated FormData construction for `destroy_removed_messages`

### Proposed Solution
Create a `MultipartRequestService`:

```javascript
// services/multipartRequestService.js
class MultipartRequestService {
  async saveSlide(showId, slideData, ordinal) { }
  async destroyRemovedMessages(showId, messageIds) { }
  buildFormData(payload) { }
  cleanSlideData(slide) { } // Extract slide cleaning logic
}
```

**Benefits:**
- Reusable multipart request logic
- Cleaner component code
- Easier to test request construction
- Consistent request format

---

## 4. Slide Data Cleaning Logic 🟡 Medium Priority

### Current Issues
- Large block of slide cleaning logic in `ShowForm.js` (lines 143-219)
- Complex conditional logic for updates vs creates
- Field whitelisting logic embedded in component

### Proposed Solution
Extract to a utility:

```javascript
// utils/slideDataCleaner.js
export class SlideDataCleaner {
  static cleanForCreate(slide) { }
  static cleanForUpdate(slide) { }
  static whitelistFields(slide) { }
  static cleanValue(value) { }
}
```

**Benefits:**
- Reusable cleaning logic
- Easier to test
- Clearer component code
- Can be used by other components

---

## 5. ShowForm Component Size 🟡 Medium Priority

### Current Issues
- `ShowForm.js` is 508 lines - too large
- Manages complex state (5 pages, slides, editing state)
- Mixes navigation logic, data transformation, and API calls

### Proposed Solution
Extract custom hooks:

```javascript
// hooks/useShowForm.js - Main form state management
// hooks/useShowFormNavigation.js - Page navigation logic
// hooks/useSlidesManagement.js - Slide CRUD operations
// hooks/useShowData.js - Show loading and transformation
```

**Benefits:**
- Smaller, focused components
- Reusable hooks
- Easier to test individual concerns
- Better separation of concerns

---

## 6. API Request Patterns 🟢 Low Priority

### Current Issues
- Mix of `another-rest-client` and direct `fetch` calls
- Inconsistent error handling between the two
- Some requests bypass the API service entirely

### Proposed Solution
Standardize on one approach or create a unified API layer:

```javascript
// services/unifiedApiService.js
class UnifiedApiService {
  // Wraps both another-rest-client and fetch
  async request(method, endpoint, data, options) { }
  async multipartRequest(endpoint, formData) { }
  async jsonRequest(endpoint, data) { }
}
```

**Benefits:**
- Consistent API interface
- Centralized error handling
- Easier to add features (retry, caching, etc.)

---

## 7. Constants and Configuration 🟢 Low Priority

### Current Issues
- Hardcoded field lists (e.g., `allowedFields` in ShowForm)
- Magic strings scattered throughout
- API base URL in multiple places

### Proposed Solution
Create constants files:

```javascript
// constants/slideFields.js
export const SLIDE_ALLOWED_FIELDS = [...];
export const SLIDE_REQUIRED_FIELDS = [...];

// constants/apiEndpoints.js
export const API_ENDPOINTS = {
  SHOWS: '/shows',
  ADD_CUSTOM_MESSAGE: (id) => `/shows/${id}/add_custom_message`,
  // ...
};
```

**Benefits:**
- Single source of truth
- Easier to update
- Better IDE autocomplete
- Type safety potential

---

## 8. Type Safety (Future) 🔵 Future Enhancement

### Current Issues
- No TypeScript or PropTypes
- Easy to pass wrong data types
- No compile-time error checking

### Proposed Solution
- Add PropTypes to all components
- Consider migrating to TypeScript
- Add JSDoc comments for better IDE support

---

## Implementation Priority

1. **Phase 1 (High Impact, Low Risk):**
   - CSRF Token Service (#1)
   - Error Handler (#2)
   - Constants (#7)

2. **Phase 2 (Medium Impact, Medium Risk):**
   - Multipart Request Service (#3)
   - Slide Data Cleaner (#4)
   - ShowForm Hooks (#5)

3. **Phase 3 (Lower Priority):**
   - Unified API Service (#6)
   - Type Safety (#8)

---

## Quick Wins (Can be done immediately)

1. Extract `cleanValue` helper to a utility file
2. Extract `allowedFields` to constants
3. Create a simple error parsing utility
4. Extract slide cleaning logic to a separate function (even if in same file)

---

## Testing Strategy

After refactoring, add tests for:
- CSRF token service
- Error handler
- Slide data cleaner
- Multipart request service
- Form navigation hooks

---

## Notes

- Keep refactoring incremental - one area at a time
- Maintain backward compatibility during refactoring
- Add tests before/after refactoring
- Document any breaking changes

