# PR Description: UI/UX Improvements and Code Refactoring

## Overview
This PR implements significant UI/UX improvements across the ShowRunner app, including visual enhancements, font integration, and comprehensive code refactoring to improve maintainability and consistency.

## Visual & UI Changes

### Login Screen
- **Background Image**: Added `background_image.png` as full-screen background with semi-transparent overlay
- **Input Fields**: 
  - Changed to black background (#000000) with white text
  - Light gray placeholder text (#CCCCCC) for better visibility
- **Logo**: Increased size by 30% (from 250x150 to 325x195 pixels)
- **Layout**: Moved logo and title to top third of screen for better visual hierarchy
- **Subtitle**: 
  - Changed text to "Please login to manage & run your shows."
  - Moved to position above email input field
  - Changed color to teal (#00abb7)

### Typography
- **Bitink Font Integration**: 
  - Added Bitink font from `assets/Fonts/Bitink/Bitink.ttf`
  - Applied to all page titles:
    - Login screen "ShowRunner App" title
    - Active Shows / Old Shows titles
    - Show Details page title
    - Create New Show title
    - Copy Show page title
    - Show Elements page title

### Color Scheme Updates
- **Teal Color (#00abb7)**: Standardized across the app for:
  - Subtitle text on login screen
  - Swipe instructions on Active/Old Shows pages
  - Create New Show subtitle
  - Show Elements subtitle
  - "Select at least one feature" text
  - Edit buttons
  - Add buttons (Slides and Performers pages)
  - Action buttons (Messaging Customization, Add/Edit Slides)

### Shows List Pages
- **Swipe Instructions**: 
  - Added teal italic text under page titles
  - "Swipe Left For Old Shows" on Active Shows page
  - "Swipe Right for Active Shows" on Old Shows page
- **Title Font**: Applied Bitink font to "Active Shows" and "Old Shows" titles

### Show Elements Page (ShowFormPage1)
- **Header**: Now uses PageHeader component with logo (when editing)
- **Title**: "Create New Show" (new shows) / "Show Elements" (editing)
- **Subtitle**: 
  - New shows: "You'll need a Show Name and at least 1 Feature to continue." (teal)
  - Editing: "Change what you want, you'll still need a Show Name & 1 Feature to Save." (teal)
- **Text Updates**:
  - "Show Code For App Entry" → "Show Code For Audience Entry"
  - "Venue (for geolocated app entry)" → "Venue Name for Geolocated Audience Entry"
  - "Select at least one feature for your show." now in teal color

### Show Details Page (ShowFormPage2)
- **Button Colors**:
  - Save/Exit button: Remains blue (#007AFF)
  - Edit button: Changed to teal (#00abb7)
  - Action buttons (Messaging Customization, Add/Edit Slides): Changed to teal (#00abb7)

### Slides Page (ShowFormPage4)
- **Add Button**: 
  - Moved from header to footer (above Save & Done button)
  - Changed color to teal (#00abb7)

### Performers Page (ShowFormPage6)
- **Add Button**: 
  - Moved from header to footer (above Save & Done button)
  - Changed color to teal (#00abb7)

### Copy Edit Page
- **Layout Fix**: Adjusted title/logo layout to prevent logo cutoff with long show names
  - Title text now wraps to multiple lines
  - Logo remains right-justified and visible

## Code Refactoring

### New Files Created

#### 1. `src/constants/theme.js`
Centralized theme constants for:
- Colors (TEAL, PRIMARY_BLUE, SUCCESS_GREEN, etc.)
- Fonts (BITINK, DEFAULT)
- Logo sizes (SMALL, MEDIUM, LARGE)
- Font sizes (TITLE_LARGE, TITLE_MEDIUM, TITLE_SMALL, etc.)

**Benefits**: Single source of truth for design tokens, easier maintenance

#### 2. `src/components/PageHeader.js`
Reusable header component with:
- Title and optional subtitle
- Configurable logo display
- Flexible sizing options
- Consistent layout across pages

**Props**:
- `title` (string, required)
- `subtitle` (string, optional)
- `subtitleColor` (string, defaults to teal)
- `subtitleItalic` (boolean, defaults to false)
- `showLogo` (boolean, defaults to true)
- `logoSize` (string: 'small', 'medium', 'large', defaults to 'medium')
- `titleFontSize` (string: 'large', 'medium', 'small', defaults to 'medium')

**Used in**:
- ShowFormPage1
- ShowFormPage2
- CopyEditPage
- ShowsList

#### 3. `src/utils/performerUtils.js`
Utility function for ordering performers:
- `orderPerformersByShowOrder(performers, show)`: Orders performers array to match show.performer_ids order

**Benefits**: Eliminates duplicate ordering logic, ensures consistent performer order

### Files Refactored

#### Updated Components to Use Theme Constants
- `LoginScreen.js`: Uses COLORS, FONTS, LOGO_SIZES, FONT_SIZES
- `ShowFormPage1.js`: Uses PageHeader and COLORS
- `ShowFormPage2.js`: Uses PageHeader and COLORS
- `CopyEditPage.js`: Uses PageHeader
- `ShowsList.js`: Uses PageHeader and COLORS

#### Updated Components to Use Performer Ordering Utility
- `RunShow/PerformingModule.js`: Uses `orderPerformersByShowOrder()` utility
- `RunShow/VotingModule.js`: Uses `orderPerformersByShowOrder()` utility

**Impact**: Removed ~50 lines of duplicate code

## Bug Fixes

### Performer Ordering
- **Issue**: Performers were sorted alphabetically by ID instead of respecting the order set in show edit screens
- **Fix**: Implemented ordering based on `show.performer_ids` array
- **Impact**: "Next" and "Host" buttons now work correctly in Run Show performers module

## Technical Details

### Font Loading
- Font loaded in `App.js` using `useFonts` hook from `expo-font`
- Font family name: `'Bitink'`
- Font file location: `assets/Fonts/Bitink/Bitink.ttf`

### Theme Constants Structure
```javascript
export const COLORS = {
  TEAL: '#00abb7',
  PRIMARY_BLUE: '#007AFF',
  // ... more colors
};

export const FONTS = {
  BITINK: 'Bitink',
  DEFAULT: undefined,
};

export const LOGO_SIZES = {
  SMALL: { width: 48, height: 48 },
  MEDIUM: { width: 60, height: 60 },
  LARGE: { width: 325, height: 195, maxWidth: 390, maxHeight: 390 },
};
```

## Files Changed

### New Files
- `src/constants/theme.js`
- `src/components/PageHeader.js`
- `src/utils/performerUtils.js`
- `docs/PR_DESCRIPTION.md`

### Modified Files
- `App.js` (font loading)
- `src/components/LoginScreen.js`
- `src/components/ShowFormPage1.js`
- `src/components/ShowFormPage2.js`
- `src/components/CopyEditPage.js`
- `src/components/ShowsList.js`
- `src/components/RunShow/PerformingModule.js`
- `src/components/RunShow/VotingModule.js`

## Testing Recommendations

1. **Login Screen**:
   - Verify background image displays correctly
   - Check input field visibility with black background
   - Confirm logo size and position in top third
   - Verify subtitle position and color

2. **Shows List**:
   - Test swipe functionality between Active and Old Shows
   - Verify swipe instruction text appears in teal italic
   - Check Bitink font on titles

3. **Show Forms**:
   - Verify PageHeader component displays correctly on all pages
   - Check logo visibility and positioning
   - Test button colors (teal for Edit/Add, blue for Save/Exit)
   - Verify Add buttons moved to bottom on Slides and Performers pages

4. **Run Show**:
   - Test performer ordering in Performing module
   - Verify "Next" and "Host" buttons follow correct order
   - Test performer ordering in Voting module

5. **Copy Edit Page**:
   - Test with long show names to ensure logo doesn't get cut off
   - Verify text wrapping works correctly

## Breaking Changes
None - all changes are backward compatible.

## Migration Notes
No migration required. All changes are UI/UX improvements and code refactoring that maintain existing functionality.

## Screenshots/Visual Changes
- Login screen with background image and updated styling
- Consistent header layout across all form pages
- Teal accent color for action buttons
- Improved visual hierarchy with Bitink font

## Related Issues
- Performer ordering bug fix
- Logo cutoff issue on Copy Edit page
- Inconsistent button colors across pages

