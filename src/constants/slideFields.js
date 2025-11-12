/**
 * Constants for slide/custom message field definitions
 */

/**
 * Fields allowed to be sent to the backend when saving slides
 * This whitelist prevents backend-only fields from being sent
 */
export const SLIDE_ALLOWED_FIELDS = [
  'id',
  'name',
  'body_type',
  'body',
  'body_tv',
  'link_url',
  'button_text',
  'video_url',
  'minutes',
  'seconds',
  'start_minutes',
  'start_seconds',
  'image',
];

/**
 * Fields that are required for slide creation
 */
export const SLIDE_REQUIRED_FIELDS = [
  'name',
  'body_type',
];

/**
 * Fields that are backend-only and should never be sent
 */
export const SLIDE_BACKEND_ONLY_FIELDS = [
  'active',
  'created_at',
  'updated_at',
  'show_id',
  'channel_id',
  'cached_service_url',
  'cached_service_url_expiry',
  'image_url',
  'ordinal', // Ordinal is sent separately, not in custom_message
];

/**
 * Slide body types
 */
export const SLIDE_BODY_TYPES = {
  SINGLE: 'single',
  SPLIT: 'split',
  LINK: 'link',
  IMAGE: 'image',
  VIDEO: 'video',
};

