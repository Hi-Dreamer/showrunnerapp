import ActionCableService from './actionCableService';
import { 
  runShowUpdateState, 
  runShowUpdateVotes, 
  runShowUpdatePicks,
  runShowUpdateSetTimes 
} from '../actions/runShowActions';

/**
 * ShowRunnerChannel Service
 * Handles subscription to ShowRunnerChannel for real-time show updates
 */

class ShowRunnerChannelService {
  constructor() {
    this.subscription = null;
    this.subscriptionKey = null;
    this.dispatch = null;
    this.showId = null;
    this._hasLoggedConnection = false;
  }

  /**
   * Subscribe to ShowRunnerChannel for a show
   * @param {number} showId - Show ID
   * @param {Function} dispatch - Redux dispatch function
   */
  subscribe(showId, dispatch) {
    // Don't subscribe if already subscribed to the same show
    if (this.subscription && this.showId === showId) {
      return;
    }
    
    // Unsubscribe from previous subscription if exists
    if (this.subscription) {
      this.unsubscribe();
    }
    
    this.showId = showId;
    this.dispatch = dispatch;

    const result = ActionCableService.subscribe(
      'ShowRunnerChannel',
      { show_id: showId },
      {
        connected: () => {
          // Only log once to reduce noise
          if (!this._hasLoggedConnection) {
            console.log('ShowRunnerChannel: Connected');
            this._hasLoggedConnection = true;
          }
        },
        disconnected: () => {
          console.log('ShowRunnerChannel: Disconnected');
          this._hasLoggedConnection = false;
        },
        received: (data) => {
          this.handleMessage(data);
        },
      }
    );
    
    this.subscription = result.subscription;
    this.subscriptionKey = result.subscriptionKey;
  }

  /**
   * Handle incoming messages from ShowRunnerChannel
   */
  handleMessage(data) {
    if (!this.dispatch) return;

    // Handle show state updates
    if (data.contest) {
      const updates = {};
      
      if (data.contest.show_state !== undefined) {
        updates.showState = data.contest.show_state;
      }
      
      if (data.contest.active_performer_id !== undefined) {
        updates.activePerformerId = data.contest.active_performer_id;
      }
      
      if (data.contest.active_performer_name !== undefined) {
        updates.activePerformerName = data.contest.active_performer_name;
      }
      
      if (data.contest.active_performer_set_start !== undefined) {
        updates.activePerformerSetStart = data.contest.active_performer_set_start;
      }
      
      if (data.contest.active_custom_message_id !== undefined) {
        updates.activeSlideId = data.contest.active_custom_message_id;
      }
      
      if (data.contest.active_custom_message_name !== undefined) {
        updates.activeSlideName = data.contest.active_custom_message_name;
      }
      
      if (data.contest.custom_messages_cycling !== undefined) {
        updates.customMessagesCycling = data.contest.custom_messages_cycling;
      }
      
      if (data.contest.voting_type !== undefined) {
        updates.votingType = data.contest.voting_type;
      }
      
      if (data.contest.voting_pick_options !== undefined) {
        updates.votingPickOptions = data.contest.voting_pick_options;
      }
      
      if (data.contest.picking_type !== undefined) {
        updates.pickingType = data.contest.picking_type;
      }
      
      if (data.contest.draw_state !== undefined) {
        updates.drawState = data.contest.draw_state;
      }
      
      if (data.contest.draw_winners !== undefined) {
        updates.drawWinners = data.contest.draw_winners;
      }
      
      if (data.contest.opt_in_count !== undefined) {
        updates.optInCount = data.contest.opt_in_count;
      }
      
      if (data.contest.buzzer_state !== undefined) {
        updates.buzzerState = data.contest.buzzer_state;
      }
      
      if (data.contest.buzzer_winners !== undefined) {
        updates.buzzerWinners = data.contest.buzzer_winners;
      }
      
      if (data.contest.buzzer_count !== undefined) {
        updates.buzzerCount = data.contest.buzzer_count;
      }
      
      if (data.contest.show_voter_count !== undefined) {
        updates.audienceCount = data.contest.show_voter_count;
      }
      
      if (Object.keys(updates).length > 0) {
        this.dispatch(runShowUpdateState(updates));
      }
    }

    // Handle vote counts
    if (data.show_votes) {
      this.dispatch(runShowUpdateVotes(data.show_votes));
    }

    // Handle pick counts
    if (data.show_picks) {
      this.dispatch(runShowUpdatePicks(data.show_picks));
    }

    // Handle set times
    if (data.set_times) {
      this.dispatch(runShowUpdateSetTimes(data.set_times));
    }
  }

  /**
   * Unsubscribe from ShowRunnerChannel
   */
  unsubscribe() {
    if (this.subscriptionKey) {
      ActionCableService.unsubscribe(this.subscriptionKey);
      this.subscription = null;
      this.subscriptionKey = null;
      this.dispatch = null;
      this.showId = null;
      this._hasLoggedConnection = false;
    }
  }
}

export default new ShowRunnerChannelService();

