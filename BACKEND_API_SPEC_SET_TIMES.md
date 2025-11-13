# Backend API Specification: Set Times with Total Accumulated Time

## Overview
The frontend needs to display both the current session time and the total accumulated time across all performance sessions for each performer. Currently, the `set_times` endpoint only returns the current session time.

## Current API Response Format

**Endpoint:** `GET /shows/:id/set_times`

**Current Response:**
```json
[
  {
    "performer_id": 1,
    "set_time": "05:23",
    "set_start": "2024-01-15T10:30:00Z"
  },
  {
    "performer_id": 2,
    "set_time": "02:15",
    "set_start": "2024-01-15T10:35:00Z"
  }
]
```

## Required API Response Format

**Endpoint:** `GET /shows/:id/set_times`

**Updated Response (add `total_time` field):**
```json
[
  {
    "performer_id": 1,
    "set_time": "05:23",
    "set_start": "2024-01-15T10:30:00Z",
    "total_time": "12:45"
  },
  {
    "performer_id": 2,
    "set_time": "02:15",
    "set_start": "2024-01-15T10:35:00Z",
    "total_time": "02:15"
  }
]
```

## Field Specifications

### `total_time` (NEW - Required)
- **Type:** String
- **Format:** "MM:SS" (same format as `set_time`)
- **Description:** The total accumulated time across ALL performance sessions for this performer in this show
- **Calculation Logic:**
  - When a performer starts their FIRST performance session: `total_time = set_time` (both start at 00:00)
  - When a performer starts a SUBSEQUENT performance session: `total_time = previous_total_time + current_set_time`
  - The `total_time` should be updated in real-time as the current session progresses
  - When a performance session ends (performer switches away or show state changes), the final `set_time` should be added to `total_time` and persisted

### `set_time` (EXISTING - Keep as is)
- **Type:** String
- **Format:** "MM:SS"
- **Description:** The elapsed time for the CURRENT performance session only
- **Behavior:** Resets to "00:00" when a new performance session starts

### `set_start` (EXISTING - Keep as is)
- **Type:** ISO 8601 DateTime String
- **Description:** Timestamp when the current performance session started
- **Behavior:** Updated to current time when a new performance session starts

## Example Scenarios

### Scenario 1: First Performance Session
1. Performer 1 starts performing at 10:00:00
2. After 5 minutes 23 seconds:
   - `set_time`: "05:23"
   - `total_time`: "05:23" (first session, so equals set_time)
   - `set_start`: "2024-01-15T10:00:00Z"

### Scenario 2: Second Performance Session (Same Performer)
1. Performer 1 stops performing (switches to another module)
2. Previous session's `set_time` (e.g., "05:23") is added to `total_time` and persisted
3. Performer 1 starts performing again at 10:30:00
4. After 3 minutes 15 seconds:
   - `set_time`: "03:15" (reset for new session)
   - `total_time`: "08:38" (previous 05:23 + current 03:15)
   - `set_start`: "2024-01-15T10:30:00Z" (new timestamp)

### Scenario 3: Multiple Sessions
1. Session 1: 05:23 → `total_time` = "05:23"
2. Session 2: 03:15 → `total_time` = "08:38" (05:23 + 03:15)
3. Session 3: 02:45 → `total_time` = "11:23" (08:38 + 02:45)

## ActionCable Updates

**Channel:** `ShowRunnerChannel`

**Message Format:** When `set_times` is broadcast via ActionCable, include the `total_time` field:

```json
{
  "set_times": [
    {
      "performer_id": 1,
      "set_time": "05:23",
      "set_start": "2024-01-15T10:30:00Z",
      "total_time": "12:45"
    }
  ]
}
```

## Database Considerations

The backend should:
1. Store `total_time` per performer per show (likely in a `show_performers` join table or similar)
2. Update `total_time` when a performance session ends (not just when queried)
3. Ensure `total_time` persists across show runs and app restarts
4. Reset `total_time` only when explicitly requested (e.g., show reset, new show)

## Frontend Usage

The frontend will:
- Display `set_time` as "Set Time: MM:SS" (current session, updates in real-time)
- Display `total_time` as "Total: MM:SS" (accumulated across all sessions)
- Calculate real-time total as: `total_time + current_elapsed_time` while performing
- Use the `total_time` field from the API response

## Questions for Backend Team

1. What database table/column will store `total_time`?
2. When exactly is `total_time` updated? (end of session, real-time, on query?)
3. Should `total_time` reset when a show is reset, or persist?
4. Are there any edge cases we should handle? (e.g., performer removed/re-added to show)


