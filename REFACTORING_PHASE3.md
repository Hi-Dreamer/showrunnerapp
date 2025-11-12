# Refactoring Phase 3 - Show Data Management

## Overview
This phase focuses on eliminating duplication in show data construction and auto-save logic across form pages.

## 1. Show Data Builder 🔴 High Priority

### Current Issues
- Show data object construction duplicated in 5+ places:
  - `ShowFormPage1.js` - create show
  - `ShowFormPage2.js` - handleSave (3 places: addPerformer, removePerformer, handleSave)
  - `ShowFormPage3.js` - handleSave
- Repeated logic for:
  - Preserving existing show fields
  - Formatting dates
  - Handling null/empty values
  - Including messaging fields
- ~150+ lines of duplicated code

### Proposed Solution
Create a `ShowDataBuilder` utility:

```javascript
// utils/showDataBuilder.js
export class ShowDataBuilder {
  /**
   * Builds show data object for API submission
   * @param {Object} options - Configuration object
   * @param {Object} options.page1Data - Data from Page 1
   * @param {Object} options.loadedShow - Existing show data (for updates)
   * @param {Object} options.overrides - Fields to override (e.g., performer_ids, dates)
   * @returns {Object} Formatted show data object
   */
  static buildShowData({ page1Data, loadedShow, overrides = {} }) {
    // Base fields from page1Data
    // Preserve existing fields from loadedShow
    // Apply overrides
    // Format dates
    // Handle null/empty values
  }
  
  /**
   * Preserves all existing show fields that aren't being updated
   * @param {Object} loadedShow - Existing show data
   * @param {Object} updates - Fields being updated
   * @returns {Object} Complete show data with preserved fields
   */
  static preserveFields(loadedShow, updates) {
    // Copy all existing fields
    // Merge with updates
    // Ensure required fields are present
  }
}
```

**Benefits:**
- Single source of truth for show data construction
- Consistent field preservation logic
- Easier to maintain and test
- Reduces code duplication by ~150 lines

---

## 2. Auto-Save Service 🟡 Medium Priority

### Current Issues
- Auto-save logic duplicated in `addPerformer` and `removePerformer`
- ~90 lines of duplicated code
- Complex error handling and state management
- Manual show reload after save

### Proposed Solution
Create an `AutoSaveService`:

```javascript
// services/autoSaveService.js
export class AutoSaveService {
  /**
   * Auto-saves show data in the background
   * @param {Function} updateShow - Redux action to update show
   * @param {Function} loadShow - Redux action to load show
   * @param {number} showId - Show ID
   * @param {Object} showData - Data to save
   * @param {Function} onSuccess - Optional success callback
   * @param {Function} onError - Optional error callback
   * @returns {Promise<Object>} Updated show object
   */
  static async saveShow(updateShow, loadShow, showId, showData, onSuccess, onError) {
    // Save show
    // Reload show
    // Handle errors
    // Call callbacks
  }
}
```

**Benefits:**
- Reusable auto-save pattern
- Consistent error handling
- Automatic show reload
- Can be used for other auto-save scenarios

---

## 3. Date Formatting Utility 🟢 Low Priority

### Current Issues
- `formatDateForAPI` function duplicated in:
  - `ShowFormPage2.js`
  - `ShowFormPage3.js`
  - `ShowFormPage1.js` (as `getNextHour().toISOString()`)

### Proposed Solution
Extract to a utility:

```javascript
// utils/dateUtils.js
export class DateUtils {
  static formatForAPI(date) {
    if (!date) return null;
    return date instanceof Date ? date.toISOString() : date;
  }
  
  static parseFromAPI(dateString) {
    if (!dateString) return null;
    return new Date(dateString);
  }
  
  static getNextHour() {
    const date = new Date();
    date.setHours(date.getHours() + 1);
    date.setMinutes(0);
    date.setSeconds(0);
    date.setMilliseconds(0);
    return date;
  }
  
  static getNextEndHour(startDate) {
    const date = new Date(startDate || DateUtils.getNextHour());
    date.setHours(date.getHours() + 5);
    return date;
  }
}
```

**Benefits:**
- Consistent date handling
- Reusable date utilities
- Easier to test

---

## 4. Show Field Constants 🟢 Low Priority

### Current Issues
- Messaging field names hardcoded in multiple places
- Risk of typos when copying field names
- No single source of truth for field names

### Proposed Solution
Create constants:

```javascript
// constants/showFields.js
export const SHOW_FIELDS = {
  // Basic fields
  NAME: 'name',
  CODE: 'code',
  VENUE_ID: 'venue_id',
  SHOW_DATETIME: 'show_datetime',
  SHOW_END_DATETIME: 'show_end_datetime',
  TV_THEME: 'tv_theme',
  TV_SCORE_VISIBLE: 'tv_score_visible',
  PERFORMER_IDS: 'performer_ids',
  
  // Messaging fields
  TEXT_PERFORMING_TV: 'text_performing_tv',
  TEXT_PERFORMING_MOBILE: 'text_performing_mobile',
  TEXT_VOTING_PROMPT_TV: 'text_voting_prompt_tv',
  TEXT_VOTING_PROMPT_MOBILE: 'text_voting_prompt_mobile',
  TEXT_VOTING_DONE_MOBILE: 'text_voting_done_mobile',
  TEXT_VOTING_WINNER_TV: 'text_voting_winner_tv',
  TEXT_VOTING_WINNER_MOBILE: 'text_voting_winner_mobile',
  TEXT_DRAW_GET_READY_TV: 'text_draw_get_ready_tv',
  TEXT_DRAW_GET_READY_MOBILE: 'text_draw_get_ready_mobile',
};

export const MESSAGING_FIELDS = [
  SHOW_FIELDS.TEXT_PERFORMING_TV,
  SHOW_FIELDS.TEXT_PERFORMING_MOBILE,
  SHOW_FIELDS.TEXT_VOTING_PROMPT_TV,
  SHOW_FIELDS.TEXT_VOTING_PROMPT_MOBILE,
  SHOW_FIELDS.TEXT_VOTING_DONE_MOBILE,
  SHOW_FIELDS.TEXT_VOTING_WINNER_TV,
  SHOW_FIELDS.TEXT_VOTING_WINNER_MOBILE,
  SHOW_FIELDS.TEXT_DRAW_GET_READY_TV,
  SHOW_FIELDS.TEXT_DRAW_GET_READY_MOBILE,
];
```

**Benefits:**
- Type safety (autocomplete)
- Prevents typos
- Single source of truth
- Easier refactoring

---

## 5. Show Form Hooks (Deferred) 🔵 Future

### Current Issues
- `ShowForm.js` still manages complex state
- Navigation logic mixed with data management
- Could benefit from custom hooks

### Proposed Solution
Extract to hooks (defer to Phase 4):

```javascript
// hooks/useShowFormData.js - Show data management
// hooks/useShowFormNavigation.js - Page navigation
// hooks/useShowAutoSave.js - Auto-save functionality
```

---

## Implementation Priority

### Phase 3A (Quick Wins - Can do immediately):
1. ✅ Date Formatting Utility (#3)
2. ✅ Show Field Constants (#4)

### Phase 3B (High Impact):
1. ✅ Show Data Builder (#1)
2. ✅ Auto-Save Service (#2)

### Phase 3C (Future):
1. Show Form Hooks (#5)

---

## Code Reduction Estimate

- **Show Data Builder**: ~150 lines removed
- **Auto-Save Service**: ~90 lines removed
- **Date Utils**: ~30 lines removed
- **Total**: ~270 lines of duplication eliminated

---

## Testing Checklist

After Phase 3, test:

1. **Show Creation**
   - [ ] Create show from Page 1
   - [ ] Verify all fields are saved correctly

2. **Show Updates**
   - [ ] Update show from Page 2
   - [ ] Update messaging from Page 3
   - [ ] Verify all fields are preserved

3. **Auto-Save**
   - [ ] Add performer → verify auto-save
   - [ ] Remove performer → verify auto-save
   - [ ] Verify performers preserved when navigating to other pages

4. **Field Preservation**
   - [ ] Update one field → verify others preserved
   - [ ] Update multiple fields → verify all saved correctly

---

## Migration Strategy

1. **Step 1**: Create utilities (DateUtils, Constants)
2. **Step 2**: Create ShowDataBuilder
3. **Step 3**: Refactor one page at a time:
   - Start with ShowFormPage3 (simplest)
   - Then ShowFormPage2
   - Finally ShowFormPage1
4. **Step 4**: Create AutoSaveService
5. **Step 5**: Refactor auto-save functions

---

## Notes

- Keep refactoring incremental
- Test after each component refactor
- Maintain backward compatibility
- Document any breaking changes

