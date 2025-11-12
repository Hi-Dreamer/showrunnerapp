/**
 * Constants for show field names
 * Centralized to prevent typos and provide autocomplete
 */

// Basic show fields
export const SHOW_FIELDS = {
  NAME: 'name',
  CODE: 'code',
  VENUE_ID: 'venue_id',
  SHOW_DATETIME: 'show_datetime',
  SHOW_END_DATETIME: 'show_end_datetime',
  TV_THEME: 'tv_theme',
  TV_SCORE_VISIBLE: 'tv_score_visible',
  PERFORMER_IDS: 'performer_ids',
  HI_MODULES: 'hi_modules',
  
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

/**
 * Array of all messaging field names
 * Useful for iterating over messaging fields
 */
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

