# Run Show Interface - Control Points Documentation

## Overview
This document details all control points, modules, and functionality available in the "Run Show" interface. This information will be used to implement the mobile app version of the show runner interface.

## Entry Point
- **Route**: `GET /shows/:id/run` → `home#run_show`
- **Component**: `app/javascript/components/RunShow.js`
- **Main Dashboard**: `app/javascript/containers/RunShow/ShowRunnerDashboard.js`

## Architecture

### Real-Time Communication
- **ActionCable Channels**:
  - `ShowRunnerChannel` - Receives show state updates, vote counts, draw winners, buzzer updates
  - `ChannelChannel` - Receives channel takeover updates

### State Management
- **Redux Stores**:
  - `state.show` - Show state, active performer, active message, draw/buzzer state
  - `state.run_show` - Run show UI state (selected performers, voting type, channel takeover)
  - `state.performer` - Performer list
  - `state.voting` - Voting/pick state

### API Client
- Uses `another-rest-client` with CSRF token handling
- Base URL: Current window location (protocol + hostname + port)

---

## Module Tabs

The dashboard displays tabs based on enabled HI modules. Available tabs:

1. **Channels** - Channel takeover control (if user/venue has channels)
2. **Slides** (Messaging) - Custom message/slide display control
3. **Performing** - Performer performance timer control
4. **Voting** - Voting control (Voting or Extended Voting module)
5. **Draw** - Random draw control (Draw module)
6. **Buzzer** - Game buzzer control (Draw module)

---

## Module 1: Channels (Channel Takeover)

### Location
- Component: `app/javascript/containers/RunShow/Channels.js`
- Tab: Only shown if user has channels OR venue has channels (and not Extended Voting)

### Control Points

#### Channel Selection
- **User Channels Dropdown**: Select from user's personal channels
- **Venue Channels Dropdown**: Select from venue's channels
- **Toggle Switch**: Switch between "YOUR CHANNELS" and "VENUE CHANNELS" (if both available)

#### Actions
1. **Take Channel** (User Channels)
   - Endpoint: `GET /channels/:id/show_takeover?show_id=:show_id`
   - Action: Takes control of selected user channel
   - Subscribes to `ChannelChannel` for updates

2. **Take Channel** (Venue Channels)
   - Endpoint: `GET /channels/:id/show_takeover?show_id=:show_id`
   - Action: Takes control of selected venue channel
   - Subscribes to `ChannelChannel` for updates

3. **Release Channel** (Showrunner)
   - Endpoint: `GET /channels/:id/kill_all_takeovers?show_id=:show_id`
   - Action: Releases all channel takeovers

4. **Kill Performer Control** (Showrunner)
   - Endpoint: `GET /channels/:id/kill_show_takeover?show_id=:show_id`
   - Action: Kills performer's takeover, keeps showrunner control

5. **Release Channel** (Performer)
   - Endpoint: `GET /channels/:id/kill_show_takeover?show_id=:show_id`
   - Action: Releases performer's own takeover

### State Display
- Shows currently controlled channel name
- Shows performer guest controlling (if applicable)

### Real-Time Updates
- Receives `takeover_show_id` and `takeover_label` via ChannelChannel
- Receives `kill_all_takeovers` and `kill_takeover` signals

---

## Module 2: Slides (Messaging)

### Location
- Component: `app/javascript/containers/RunShow/Messaging.js`
- Tab: Shown if "Messaging" HI module is enabled

### Control Points

#### Slide Selection
- **Slide Dropdown**: Select from available custom messages/slides
- Shows slide name for each option

#### Actions
1. **DISPLAY SLIDE** / **CHANGE SLIDE**
   - Endpoint: `POST /shows/:id/set_state`
   - Parameters:
     - `state: 'messaging'`
     - `extra_params.custom_message_id: <slide_id>` (or `'cycle'` for cycling)
   - Action: Displays selected slide on TVs and mobile devices
   - Button text changes to "CHANGE SLIDE" when already in messaging state

2. **Cycle Slides** (Showrunner only)
   - Endpoint: `POST /shows/:id/set_state`
   - Parameters:
     - `state: 'messaging'`
     - `extra_params.custom_message_id: 'cycle'`
     - `extra_params.custom_message_frequency_minutes: <minutes>`
     - `extra_params.custom_message_frequency_seconds: <seconds>`
   - Inputs: Minutes and seconds fields for cycle interval
   - Minimum: 10 seconds total
   - Action: Automatically cycles through slides at specified interval
   - Shows "(cycling)" indicator when active

### State Display
- Current active slide name (if in messaging state)
- Cycling indicator

### Validation
- Requires at least one custom message to be defined
- Cycle time must be at least 10 seconds

---

## Module 3: Performing

### Location
- Component: `app/javascript/containers/RunShow/Performing.js`
- Tab: Shown if "Performing" HI module is enabled

### Control Points

#### Performer Selection
- **Performer Dropdown**: Select from show's performers

#### Actions
1. **START PERFORMANCE** / **CHANGE PERFORMER**
   - Endpoint: `POST /shows/:id/set_state`
   - Parameters:
     - `state: 'performing'`
     - `extra_params.performer_id: <performer_id>`
   - Action: Starts performance timer for selected performer
   - Button text changes to "CHANGE PERFORMER" when already performing
   - Automatically records `set_start` timestamp

### State Display
- Current performer name (when performing)
- Live timer showing elapsed time (mm:ss format)
- Updates every 200ms when in performing state

### Timer Logic
- Starts when state changes to 'performing'
- Calculates elapsed time: `current_time - server_time_diff - set_start`
- Stops when state changes away from 'performing'
- Records `set_end` timestamp when leaving performing state

### Validation
- Requires at least one performer to be defined

---

## Module 4: Voting

### Location
- Component: `app/javascript/containers/RunShow/Voting.js`
- Tab: Shown if "Voting" or "Extended Voting" HI module is enabled
- Extended Voting: Automatically uses "pick" voting type (cannot toggle)

### Control Points

#### Voting Type Toggle (Standard Voting only)
- **Switch**: Toggle between "STAR RATING" and "PICK"
- Action: Updates `voting_type` in run show state
- Colors: Green (#bee0bd) for PICK, Blue (#b6b9d9) for STAR RATING

#### Picking Type Toggle (Pick Voting only)
- **Switch**: Toggle between "LOCK-IN" and "FLUID"
- Values: `0` = lock_in, `1` = fluid
- Action: Saves `picking_type` to backend immediately (even when not in voting state for Extended Voting)
- Confirmation: Required when switching to LOCK-IN mode
- Endpoint: `POST /shows/:id/set_state` with current state + `extra_params.picking_type`

#### Performer Selection (Star Rating only)
- **Performer Dropdown**: Select performer to vote for
- Only shown when `voting_type === 'star_rating'`

#### Performer Selection (Pick Voting)
- **Performer Switches**: Toggle performers in/out of voting pool
- Each performer has a switch to include/exclude from pick voting
- Shows pick count for each selected performer
- Updates `pick_voting_performer_ids` array

#### Actions

1. **START VOTING FOR PERFORMER** / **START PICKING** / **CHANGE PERFORMER BEING VOTED ON** / **CHANGE PICKS**
   - Endpoint: `POST /shows/:id/set_state`
   - Parameters (Star Rating):
     - `state: 'voting'`
     - `extra_params.voting_type: 'star_rating'`
     - `extra_params.performer_id: <performer_id>`
   - Parameters (Pick):
     - `state: 'voting'`
     - `extra_params.voting_type: 'pick'`
     - `extra_params.voting_pick_options: [<performer_ids>]`
     - `extra_params.picking_type: <0 or 1>`
   - Action: Starts voting for selected performer(s)
   - Button text varies based on state and voting type

2. **ANNOUNCE WINNER**
   - Endpoint: `POST /shows/:id/set_state`
   - Parameters:
     - `state: 'winner'`
     - `extra_params.performer_id: <performer_id>` (for star rating, if showrunner selects)
     - `extra_params.voting_type: <'star_rating' or 'pick'>`
   - Action: Announces winner
   - Winner determination:
     - Star Rating + Highest Score Wins: Automatic (highest average score)
     - Star Rating + Showrunner Selects: Uses provided `performer_id`
     - Pick: Automatic (performer with most picks)

3. **RESET PICKS** (Pick Voting only)
   - Endpoint: `POST /shows/:id/reset_picks`
   - Confirmation: Required ("Resetting picks will permanently clear all current votes...")
   - Action: Clears all pick votes
   - Broadcasts updated pick counts via ActionCable

4. **SHOW ALL VOTES** (Star Rating only)
   - Action: Switches to `AllVotes` component view
   - Shows all performers with votes, scores, and set times

### State Display

#### Star Rating Mode
- Current performer being voted on
- Vote count for current performer
- Average score for current performer
- Set time for current performer
- Winner name (when in winner state)

#### Pick Mode
- Total picks count
- Individual pick counts for each selected performer
- Winner name (when in winner state)

### AllVotes View
- Component: `app/javascript/containers/RunShow/AllVotes.js`
- Displays all performers sorted by score (descending)
- Shows: Name, Votes, Score, Set Time
- Action: "HIDE ALL VOTES" button to return to main voting view

### Validation
- Requires at least one performer to be defined
- Extended Voting shows automatically use pick voting type

---

## Module 5: Draw (Random Draw)

### Location
- Component: `app/javascript/containers/RunShow/Draw.js`
- Tab: Shown if "Draw" HI module is enabled

### Control Points

#### Draw Type Toggle
- **Switch**: Toggle between "ALL" and "OPT-IN"
- Values: `'from_all'` or `'from_opt_in'`
- Colors: Green (#bee0bd) for OPT-IN, Blue (#b6b9d9) for ALL

#### Actions

1. **GET READY** / **PROMPT OPT-IN**
   - Endpoint: `POST /shows/:id/set_state`
   - Parameters:
     - `state: 'draw'`
     - `extra_params.draw_state: 'get_ready_all'` or `'get_ready_opt_in'`
   - Action: Prepares draw (clears previous draw state)
   - Disabled when: All voters have already won (num_winners === num_voters)
   - Button text: "PROMPT OPT-IN" for opt-in mode, "GET READY" for all mode

2. **PICK FROM ALL** / **PICK FROM OPT-IN**
   - Endpoint: `POST /shows/:id/set_state`
   - Parameters:
     - `state: 'draw'`
     - `extra_params.draw_state: 'pick_all'` or `'pick_opt_in'`
   - Action: Randomly selects one winner from eligible voters
   - For opt-in: Only selects from voters who opted in, then clears all opt-ins
   - Disabled when:
     - All mode: All voters have won (num_winners === num_voters)
     - Opt-in mode: No opt-ins available (num_opt_in === 0)

3. **RESET DRAWS**
   - Endpoint: `POST /shows/:id/set_state`
   - Parameters:
     - `state: 'draw'`
     - `extra_params.draw_state: 'reset_all'` or `'reset_opt_in'`
   - Confirmation: Required ("Are you sure you want to reset the draws...")
   - Action: Clears all draw times and opt-ins, resets to get_ready state

4. **SHOW ALL DRAWS**
   - Action: Switches to `AllDraws` component view
   - Shows all draw winners in order

### State Display
- Draw count: Number of winners drawn
- Opt-in count: Number of voters who opted in (opt-in mode only)
- Current winner: Last 4 digits of winner's device ID

### AllDraws View
- Component: `app/javascript/containers/RunShow/AllDraws.js`
- Displays all draw winners in reverse order (most recent first)
- Shows for each winner:
  - Position number (#1 = current winner)
  - Device ID (last 4 digits)
  - Draw time (formatted)
  - Draw type (OPT-IN or ALL)
- Action: "HIDE ALL DRAWS" button to return to main draw view

### Draw States
- `get_ready_all` - Ready to pick from all voters
- `get_ready_opt_in` - Ready to pick from opt-ins (prompting opt-in)
- `pick_all` - Picking from all voters
- `pick_opt_in` - Picking from opt-ins
- `reset_all` - Resetting all draws
- `reset_opt_in` - Resetting opt-in draws

---

## Module 6: Buzzer (Game Buzzer)

### Location
- Component: `app/javascript/containers/RunShow/Buzzer.js`
- Tab: Shown if "Draw" HI module is enabled (buzzer is part of draw module)

### Control Points

#### Actions

1. **GET READY**
   - Endpoint: `POST /shows/:id/set_state`
   - Parameters:
     - `state: 'buzzer'`
     - `extra_params.buzzer_state: 'get_ready'`
   - Action: Resets all buzzer times, sets count to 0
   - Always enabled

2. **GO**
   - Endpoint: `POST /shows/:id/set_state`
   - Parameters:
     - `state: 'buzzer'`
     - `extra_params.buzzer_state: 'go'`
   - Action: Starts accepting buzz-ins
   - Disabled when: Not in 'get_ready' state

3. **NEXT**
   - Endpoint: `POST /shows/:id/set_state`
   - Parameters:
     - `state: 'buzzer'`
     - `extra_params.buzzer_state: 'next'`
   - Action: Advances to next buzzer (increments buzzer_count)
   - Disabled when:
     - In 'get_ready' or 'correct' state
     - No more buzzers available (count >= winners length)

4. **CORRECT**
   - Endpoint: `POST /shows/:id/set_state`
   - Parameters:
     - `state: 'buzzer'`
     - `extra_params.buzzer_state: 'correct'`
   - Action: Marks current buzzer as correct
   - Disabled when:
     - In 'get_ready' or 'correct' state
     - No buzzers available (winners length === 0)

### State Display
- Buzz-in count: Total number of buzz-ins
- Current buzzer: Shows nickname or last 4 digits of device ID
- Current buzzer number: Position in sequence (#1, #2, etc.)
- State indicator: "Correct" or "Current Buzzer"

### Buzzer States
- `get_ready` - Ready to start
- `go` - Accepting buzz-ins
- `next` - Advance to next buzzer
- `correct` - Current buzzer is correct

### State Transitions
- Leaving buzzer state automatically resets to 'get_ready' and clears all buzzer times

---

## Status Bar

### Location
- Component: `app/javascript/containers/RunShow/StatusBar.js`
- Always visible at top of run show interface

### Display Logic
Shows current show state as text:

- **Messaging**: "Showing [slide name]"
- **Performing**: "Now Performing - [performer name] - [timer mm:ss]"
- **Voting (Star Rating)**: "Now Voting for [performer name]"
- **Voting (Pick)**: "Now Picking From [X] Performers"
- **Winner**: "The Winner is [performer name]!"
- **Draw**: "Random Draw - [state] - [last 4 digits]" (if winner exists)
- **Buzzer**: "Game Buzzer - [state]"
- **Default**: "Your Show is Ready to Start! Pick a Mode."

---

## Footer

### Location
- Component: `app/javascript/containers/RunShow/Footer.js`
- Always visible at bottom of run show interface

### Display
- **Audience Members**: Shows count and capacity (e.g., "Audience Members: 25/50")
- **Reset Show Link**: Only shown if:
  - Show has voters (count > 0)
  - Show datetime is in the future
  - Show date is not locked
  - User is showrunner/admin/licensee/licensor

### Actions

1. **Reset Show**
   - Endpoint: `GET /shows/:id/reset_show`
   - Confirmation: Required ("This will reset all audience members...")
   - Validation: Only allowed if show datetime is in future
   - Action: Resets all audience members and votes
   - Returns: `{success: true/false}`

---

## Core API Endpoints

### Show State Management
- **POST /shows/:id/set_state**
  - Changes show state and module-specific parameters
  - Parameters:
    - `state`: One of: 'messaging', 'performing', 'voting', 'winner', 'draw', 'buzzer'
    - `extra_params`: Object with module-specific parameters (see below)
  - CSRF: Skipped (configured in controller)
  - Returns: `{success: true}`

### Extra Parameters by State

#### Messaging
```javascript
{
  custom_message_id: <slide_id> | 'cycle',
  custom_message_frequency_minutes: <string>,
  custom_message_frequency_seconds: <string>
}
```

#### Performing / Voting (Star Rating) / Winner
```javascript
{
  performer_id: <performer_id>
}
```

#### Voting (Pick)
```javascript
{
  voting_type: 'pick',
  voting_pick_options: [<performer_id>, ...],
  picking_type: 0 | 1  // 0 = lock_in, 1 = fluid
}
```

#### Draw
```javascript
{
  draw_state: 'get_ready_all' | 'get_ready_opt_in' | 'pick_all' | 'pick_opt_in' | 'reset_all' | 'reset_opt_in'
}
```

#### Buzzer
```javascript
{
  buzzer_state: 'get_ready' | 'go' | 'next' | 'correct'
}
```

#### Extended Voting (Picking Type Only)
```javascript
{
  picking_type: 0 | 1  // Can be saved even when not in 'voting' state
}
```

### Other Endpoints

- **POST /shows/:id/reset_picks**
  - Clears all pick votes
  - Returns: `{success: true}`

- **GET /shows/:id/set_times**
  - Returns array of set times for each performer
  - Format: `[{performer_id: X, set_time: "mm:ss"}, ...]`

- **GET /channels/:id/show_takeover?show_id=:show_id**
  - Takes control of channel for show
  - Returns: `200 OK` or `400` with error message

- **GET /channels/:id/kill_show_takeover?show_id=:show_id**
  - Kills show takeover (performer or all)
  - Returns: `200 OK`

- **GET /channels/:id/kill_all_takeovers?show_id=:show_id**
  - Kills all takeovers on channel
  - Returns: `200 OK`

---

## Real-Time Updates (ActionCable)

### ShowRunnerChannel
Subscribes to: `ShowRunnerChannel` with `show_id`

Receives:
- `contest.show_state` - Show state changes
- `contest.active_performer_id` - Active performer changes
- `contest.active_performer_name` - Active performer name
- `contest.active_custom_message_id` - Active slide changes
- `contest.active_custom_message_name` - Active slide name
- `contest.custom_messages_cycling` - Cycling status
- `contest.draw_state` - Draw state changes
- `contest.draw_winners` - Draw winners array
- `contest.buzzer_state` - Buzzer state changes
- `contest.buzzer_winners` - Buzzer winners array
- `contest.buzzer_count` - Current buzzer count
- `contest.opt_in_count` - Opt-in count
- `contest.voting_type` - Voting type changes
- `contest.voting_pick_options` - Pick voting performer IDs
- `show_votes` - Vote counts by performer
- `show_picks` - Pick counts by performer
- `show_voter_count` - Total voter count
- `set_times` - Set time updates
- `show_performers` - Performer list updates

### ChannelChannel
Subscribes to: `ChannelChannel` with `channel_id` (when channel is taken over)

Receives:
- `takeover_show_id` - Show taking over channel
- `takeover_label` - Label for takeover (performer name)
- `kill_all_takeovers` - Signal to kill all takeovers
- `kill_takeover` - Signal to kill specific takeover

---

## Data Flow

### Initial Load
1. Load show data (`GET /shows/:id`)
2. Load performers (`GET /performers?show_id=:id`)
3. Load votes (`GET /votes?show_id=:id`)
4. Load picks (`GET /picks?show_id=:id`)
5. Load set times (`GET /shows/:id/set_times`)
6. Load user channels (`GET /users/me`)
7. Load venue channels (`GET /venues/:id`) if show has venue
8. Subscribe to ShowRunnerChannel
9. Subscribe to ChannelChannel if takeover exists

### State Changes
1. User action triggers `setShowState()`
2. Constructs `extra_params` based on current state and selections
3. Calls `POST /shows/:id/set_state`
4. Backend updates show state and broadcasts via ActionCable
5. Frontend receives update via ActionCable subscription
6. Redux state updates
7. UI re-renders

### Timer Updates
- When state is 'performing', starts interval timer (200ms)
- Fetches server time to calculate offset
- Updates `active_performer_set_current` every 200ms
- Stops when state changes away from 'performing'

---

## UI Patterns

### Buttons
- **Big Button**: Primary actions (state changes)
- **Button**: Secondary actions (view toggles, resets)
- **Tight Button**: Small actions (reset picks, etc.)
- **Disabled State**: Grayed out, non-clickable when conditions not met

### Switches
- Uses `react-switch` component
- Colors: Green (#bee0bd) when ON, Blue (#b6b9d9) when OFF
- Labels clickable to toggle

### Dropdowns
- Large dropdowns for performer/slide/channel selection
- Class: `show-runner-big-dropdown`

### Confirmations
- `window.confirm()` for destructive actions
- Required for: Reset draws, Reset picks, Lock-in mode switch

---

## Mobile App Implementation Considerations

### Navigation
- Tab-based navigation for modules (similar to web)
- Bottom tab bar or top tab bar
- Status bar always visible at top
- Footer always visible at bottom

### State Management
- Use Redux (already set up in mobile app)
- Create new reducers for run show state
- Reuse existing show/performer reducers where possible

### Real-Time Updates
- Implement ActionCable WebSocket connection
- Handle reconnection logic
- Update Redux state on received messages

### API Calls
- Use existing `ApiService` and `CsrfTokenService`
- Add new endpoints to `apiEndpoints.js`
- Handle CSRF tokens (set_state endpoint skips CSRF, but others may need it)

### UI Components
- Large touch-friendly buttons
- Switches for toggles (React Native Switch component)
- Picker for dropdowns (React Native Picker or custom modal)
- Confirmation dialogs (React Native Alert)

### Timer Display
- Use `setInterval` for performing timer
- Format time as mm:ss
- Update every 200ms (or use requestAnimationFrame for smoother updates)

### Error Handling
- Network errors
- Validation errors (alerts from backend)
- State transition errors

---

## Key Files Reference

### Rails Backend
- `app/controllers/shows_controller.rb` - `set_state`, `reset_picks`, `set_times`
- `app/controllers/channels_controller.rb` - Channel takeover endpoints
- `app/services/cable_service.rb` - ActionCable broadcasting
- `app/channels/show_runner_channel.rb` - ShowRunnerChannel
- `config/routes.rb` - Route definitions

### React Frontend (Web)
- `app/javascript/containers/RunShow/ShowRunnerDashboard.js` - Main dashboard
- `app/javascript/containers/RunShow/Voting.js` - Voting module
- `app/javascript/containers/RunShow/Draw.js` - Draw module
- `app/javascript/containers/RunShow/Buzzer.js` - Buzzer module
- `app/javascript/containers/RunShow/Messaging.js` - Slides module
- `app/javascript/containers/RunShow/Performing.js` - Performing module
- `app/javascript/containers/RunShow/Channels.js` - Channels module
- `app/javascript/containers/RunShow/AllVotes.js` - All votes view
- `app/javascript/containers/RunShow/AllDraws.js` - All draws view
- `app/javascript/containers/RunShow/StatusBar.js` - Status display
- `app/javascript/containers/RunShow/Footer.js` - Footer with audience count
- `app/javascript/actions/runShowActions.js` - Redux actions

---

## Implementation Checklist for Mobile App

### Phase 1: Core Infrastructure
- [ ] Set up ActionCable WebSocket connection
- [ ] Create run show Redux reducers and actions
- [ ] Implement API endpoints for set_state, reset_picks, etc.
- [ ] Create main RunShow component with tab navigation

### Phase 2: Basic Modules
- [ ] Messaging/Slides module
- [ ] Performing module with timer
- [ ] Status bar component
- [ ] Footer component

### Phase 3: Voting Module
- [ ] Star rating voting
- [ ] Pick voting with performer selection
- [ ] Picking type toggle (lock-in/fluid)
- [ ] Winner announcement
- [ ] All votes view
- [ ] Reset picks functionality

### Phase 4: Draw Module
- [ ] Draw type toggle (all/opt-in)
- [ ] Get ready state
- [ ] Pick winner
- [ ] Reset draws
- [ ] All draws view

### Phase 5: Buzzer Module
- [ ] Get ready state
- [ ] Go state
- [ ] Next buzzer
- [ ] Correct buzzer
- [ ] Current buzzer display

### Phase 6: Channels Module
- [ ] Channel selection (user/venue)
- [ ] Take channel
- [ ] Release channel
- [ ] Kill performer takeover
- [ ] Channel status display

### Phase 7: Real-Time Updates
- [ ] Show state updates
- [ ] Vote count updates
- [ ] Pick count updates
- [ ] Draw winner updates
- [ ] Buzzer updates
- [ ] Performer timer updates
- [ ] Channel takeover updates

### Phase 8: Polish
- [ ] Error handling
- [ ] Loading states
- [ ] Confirmation dialogs
- [ ] Disabled button states
- [ ] Visual feedback for actions

---

**Document Version**: 1.0
**Last Updated**: Current session
**Purpose**: Reference for implementing mobile app run show interface


