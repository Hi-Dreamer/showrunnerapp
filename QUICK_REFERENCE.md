# ShowRunner App - Quick Reference

## Essential Files

### Entry Points
- `App.js` - Main app component
- `src/store.js` - Redux store setup

### Authentication
- `src/components/LoginScreen.js` - Login UI
- `src/services/auth.js` - Login/logout logic
- `src/actions/authActions.js` - Redux auth actions

### Show Management
- `src/components/ShowsList.js` - Main shows list
- `src/components/ShowForm.js` - Form wrapper (manages 5 pages)
- `src/actions/showActions.js` - Show CRUD operations

### Form Pages
1. `ShowFormPage1.js` - Basic info (name, code, venue, modules)
2. `ShowFormPage2.js` - Details (dates, performers, TV settings)
3. `ShowFormPage3.js` - Messaging customization
4. `ShowFormPage4.js` - Slides list & management
5. `ShowFormPage5.js` - Individual slide editor

### Services
- `src/services/api.js` - API client setup
- `src/services/csrfTokenService.js` - CSRF token management
- `src/services/multipartRequestService.js` - File uploads

### Utilities
- `src/utils/errorHandler.js` - Error parsing & formatting
- `src/utils/dateUtils.js` - Date formatting
- `src/utils/slideDataCleaner.js` - Slide data preparation

### Configuration
- `src/constants/apiEndpoints.js` - API URLs (update IP here!)
- `app.json` - Expo config (splash, icon, etc.)

## Key Constants

### API Base URL
```javascript
// src/constants/apiEndpoints.js
export const API_BASE_URL = 'http://192.168.1.84:3000';
```

### Logo File
- Location: `assets/hi_logo.png`
- Used in: splash, login, shows list, all detail pages

## Common Tasks

### Update API URL
Edit `src/constants/apiEndpoints.js` - change `API_BASE_URL`

### Add New API Endpoint
1. Add to `src/constants/apiEndpoints.js`
2. Use in action/service via `API_ENDPOINTS.YOUR_ENDPOINT`

### Handle File Upload
Use `MultipartRequestService.saveSlide()` or similar methods

### Add New Form Field
1. Add to appropriate `ShowFormPage*.js`
2. Include in `updateShow` payload
3. Ensure field name matches Rails expectations

### Debug API Issues
- Check `src/services/api.js` interceptors
- Verify CSRF token in `CsrfTokenService`
- Check error messages via `ErrorHandler`

## Navigation Flow

```
LoginScreen
  ↓ (login)
ShowsList
  ↓ (create/edit)
ShowForm
  ├─ Page 1: Basic Info
  ├─ Page 2: Details → Page 3 (Messaging) or Page 4 (Slides)
  ├─ Page 3: Messaging Customization
  ├─ Page 4: Slides List → Page 5 (Edit Slide)
  └─ Page 5: Slide Editor
```

## Important Patterns

### Saving Data
- Use `dispatch(updateShow())` or `dispatch(createShow())`
- Include all required fields in payload
- Handle CSRF token via `CsrfTokenService.ensureFreshToken()`

### Error Handling
```javascript
try {
  // operation
} catch (error) {
  const errorMessage = await ErrorHandler.handleError(error, 'context');
  Alert.alert('Error', errorMessage);
}
```

### Date Formatting
```javascript
import { DateUtils } from '../utils/dateUtils';

// For API
const apiDate = DateUtils.formatForAPI(date);

// For display
const displayDate = DateUtils.formatForDisplay(date);
```

## Troubleshooting

### "Network request failed"
- Check Rails server is running
- Verify IP address in `apiEndpoints.js`
- Ensure server binds to `0.0.0.0:3000`

### "CSRF token authenticity"
- Token may be expired - app should auto-refresh
- Check `CsrfTokenService.refreshToken()` is working
- Verify session cookies are being sent

### Images not uploading
- Check `MultipartRequestService` is using FormData correctly
- Verify image file object has `{ uri, type, name }` structure
- Ensure CSRF token included in FormData

### Shows not loading
- Check `loadShows()` action
- Verify API endpoint returns JSON
- Check Redux state in dev tools

## Development Commands

```bash
# Start Expo
npm start

# iOS Simulator
npm run ios

# Android
npm run android

# Clear cache
npm start -- --clear
```

## Next Steps for New Features

1. **Run Show Interface**: Create new component for show execution
2. **Real-time Updates**: Integrate ActionCable WebSocket
3. **Offline Mode**: Add caching layer
4. **Push Notifications**: For show alerts/reminders
5. **Analytics**: Track show performance

---

**Tip**: When starting a new session, read `PROJECT_DOCUMENTATION.md` for full context!

