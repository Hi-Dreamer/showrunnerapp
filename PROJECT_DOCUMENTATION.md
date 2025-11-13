# ShowRunner App - Project Documentation

## Overview
React Native (Expo) mobile application for managing shows in the Human Input system. This app serves as the showrunner interface, allowing users to create, edit, and manage shows from a mobile device.

## Project Structure

```
showrunnerapp/
├── src/
│   ├── actions/
│   │   ├── authActions.js      # Redux actions for authentication
│   │   └── showActions.js      # Redux actions for show management
│   ├── components/
│   │   ├── LoginScreen.js      # Login interface
│   │   ├── ShowsList.js        # Main shows list page
│   │   ├── ShowForm.js         # Multi-page form wrapper
│   │   ├── ShowFormPage1.js    # Basic show creation (name, code, venue, HI modules)
│   │   ├── ShowFormPage2.js    # Show details (dates, performers, TV settings)
│   │   ├── ShowFormPage3.js    # Messaging customization
│   │   ├── ShowFormPage4.js    # Slides management (list, reorder, edit)
│   │   └── ShowFormPage5.js    # Individual slide creation/editing
│   ├── constants/
│   │   ├── apiEndpoints.js     # API endpoint URLs
│   │   ├── showFields.js       # Show field name constants
│   │   └── slideFields.js      # Slide field name constants
│   ├── reducers/
│   │   ├── auth.js             # Authentication state reducer
│   │   └── show.js             # Show state reducer
│   ├── services/
│   │   ├── api.js              # API client (another-rest-client)
│   │   ├── auth.js             # Authentication service
│   │   ├── csrfTokenService.js # CSRF token management
│   │   └── multipartRequestService.js # File upload handling
│   ├── utils/
│   │   ├── dateUtils.js        # Date formatting utilities
│   │   ├── errorHandler.js     # Centralized error handling
│   │   └── slideDataCleaner.js # Slide data cleaning/preparation
│   └── store.js                # Redux store configuration
├── assets/
│   └── hi_logo.png             # App logo (teal "hi" logo on black background)
└── app.json                    # Expo configuration

```

## Key Technical Decisions

### Authentication
- **Session-based authentication** using Devise (Rails backend)
- CSRF token management via `CsrfTokenService`
- Session cookies handled with `credentials: 'include'`
- Token extraction from JSON responses or HTML fallback

### API Communication
- Uses `another-rest-client` for API calls
- Manual `fetch` requests for critical operations (create, update, delete) to ensure proper CSRF handling
- Multipart form data for file uploads (slide images)
- All requests include `Accept: application/json` header
- 30-second timeout for requests

### State Management
- Redux for global state (auth, shows)
- Local component state for form data and UI state
- Auto-save functionality for performers (saves immediately on add/remove)

### Form Flow
Multi-page form structure:
1. **Page 1**: Basic info (name, code, venue, HI modules)
2. **Page 2**: Details (dates, performers, TV settings) + navigation to Pages 3 & 4
3. **Page 3**: Messaging customization
4. **Page 4**: Slides list (with reordering)
5. **Page 5**: Individual slide creation/editing

### File Uploads
- Uses `expo-image-picker` for image selection
- No cropping (direct upload)
- Images handled via `MultipartRequestService`
- FormData construction via `ApiService.objectToFormData()`

## Configuration

### API Base URL
Located in `src/constants/apiEndpoints.js`:
```javascript
export const API_BASE_URL = 'http://192.168.1.84:3000';
```
**Important**: Update this IP address if the development machine's IP changes.

### Splash Screen & Logo
- Logo file: `assets/hi_logo.png`
- Splash screen background: Black (`#000000`)
- Logo appears on:
  - Splash screen (startup)
  - Login screen (top third)
  - Shows list (top right, 60x60px)
  - Show details page (top right, 48x48px)
  - Slides pages (top right, 48x48px)

## Important Implementation Details

### CSRF Token Handling
- Tokens extracted from show responses (`form_authenticity_token`)
- Fallback to HTML parsing from `/users/sign_in`
- Tokens refreshed before critical operations
- Stored in AsyncStorage via `CsrfTokenService`

### Error Handling
- Centralized via `ErrorHandler` utility
- Parses both JSON and HTML error responses
- User-friendly error messages
- Network errors handled gracefully

### Date Handling
- Uses `DateUtils` for consistent formatting
- Default dates: next hour (start) and 5 hours later (end)
- ISO 8601 format for API communication
- Localized display format

### Slide Management
- Slides saved individually via `add_custom_message` endpoint
- Removed slides cleaned up via `destroy_removed_messages`
- Ordinal position maintained for ordering
- Image uploads handled as multipart/form-data

### Auto-Save
- Performers auto-save when added/removed (Page 2)
- Prevents data loss when navigating between pages
- Includes all existing show data in update payload

## User Experience Features

### No Success Confirmations
- Success alerts removed for save operations that navigate back
- Error alerts still shown for failures
- Smooth navigation without interruption

### Logo Placement
- Consistent branding across all pages
- Top right positioning on detail pages
- Centered on login screen

### Button Layout (Slides Page)
- Three-column header layout:
  - Left: "Slides" title
  - Center: "+ Add New" button
  - Right: Logo

## Known Considerations

### Network Configuration
- Rails server must bind to `0.0.0.0` (not just localhost)
- Server accessible at `192.168.1.84:3000`
- CORS configured on Rails backend for mobile app

### Dependencies
- React Native with Expo
- Redux for state management
- `another-rest-client` for API calls
- `@react-native-community/datetimepicker` for date selection
- `expo-image-picker` for image selection
- `@react-native-async-storage/async-storage` for local storage

### Refactoring Completed
- Phase 1: CSRF token service, error handler, multipart service
- Phase 2: Slide data cleaner, constants organization
- Phase 3: Date utilities, show field constants
- Logging cleanup: Removed verbose debug logs, kept error/warning logs

## Development Notes

### Server Requirements
- Rails backend must be running and accessible
- Server startup script should bind to `0.0.0.0:3000`
- Session cookies must be enabled
- CSRF protection active (handled by app)

### Testing
- Test on iOS simulator or physical device
- Ensure network connectivity to Rails server
- Verify CSRF token refresh on session expiry

## Future Development Areas

1. **Run Show Interface**: Not yet implemented
2. **Real-time Updates**: Could integrate ActionCable for live updates
3. **Offline Support**: Consider caching for offline viewing
4. **Error Recovery**: Enhanced retry logic for failed requests
5. **Performance**: Optimize image loading and list rendering

## Code Style & Patterns

- Functional components with hooks
- Redux for global state
- Service layer for API interactions
- Utility functions for common operations
- Consistent error handling patterns
- Minimal console logging (errors/warnings only)

## File Naming Conventions

- Components: PascalCase (e.g., `ShowFormPage1.js`)
- Services: camelCase (e.g., `csrfTokenService.js`)
- Utilities: camelCase (e.g., `dateUtils.js`)
- Constants: camelCase (e.g., `apiEndpoints.js`)

---

**Last Updated**: Current session
**Status**: Core functionality complete, ready for additional features


