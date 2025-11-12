import { SLIDE_ALLOWED_FIELDS } from '../constants/slideFields';

/**
 * Utility for cleaning and preparing slide data for API requests
 * Handles field whitelisting, null conversion, and update vs create logic
 */
export class SlideDataCleaner {
  /**
   * Convert empty strings, null, or undefined to null
   * @param {*} value - Value to clean
   * @returns {*} Cleaned value (null if empty)
   */
  static cleanValue(value) {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string' && value.trim() === '') return null;
    return value;
  }

  /**
   * Clean slide data for API submission
   * @param {Object} slide - Raw slide data
   * @param {boolean} isUpdate - Whether this is an update (has id) or create
   * @returns {Object} Cleaned slide data ready for API
   */
  static cleanSlide(slide, isUpdate = false) {
    // Start with required fields
    const cleanSlide = {
      name: slide.name || '',
      body_type: slide.body_type || 'single',
    };

    // Include id if editing existing slide
    if (isUpdate && slide.id) {
      cleanSlide.id = slide.id;
    }

    // For updates, include all fields (Rails service compares all fields)
    // Convert empty strings to null for optional fields
    if (isUpdate) {
      cleanSlide.body = this.cleanValue(slide.body);
      cleanSlide.body_tv = this.cleanValue(slide.body_tv);
      cleanSlide.link_url = this.cleanValue(slide.link_url);
      cleanSlide.button_text = this.cleanValue(slide.button_text);
      cleanSlide.video_url = this.cleanValue(slide.video_url);
      cleanSlide.minutes = slide.minutes !== null && slide.minutes !== undefined ? parseInt(slide.minutes) : null;
      cleanSlide.seconds = slide.seconds !== null && slide.seconds !== undefined ? parseInt(slide.seconds) : null;
      cleanSlide.start_minutes = slide.start_minutes !== null && slide.start_minutes !== undefined ? parseInt(slide.start_minutes) : null;
      cleanSlide.start_seconds = slide.start_seconds !== null && slide.start_seconds !== undefined ? parseInt(slide.start_seconds) : null;
    } else {
      // For new slides, only include fields with actual values (not empty strings)
      const body = this.cleanValue(slide.body);
      if (body !== null) cleanSlide.body = body;
      
      const bodyTv = this.cleanValue(slide.body_tv);
      if (bodyTv !== null) cleanSlide.body_tv = bodyTv;
      
      const linkUrl = this.cleanValue(slide.link_url);
      if (linkUrl !== null) cleanSlide.link_url = linkUrl;
      
      const buttonText = this.cleanValue(slide.button_text);
      if (buttonText !== null) cleanSlide.button_text = buttonText;
      
      const videoUrl = this.cleanValue(slide.video_url);
      if (videoUrl !== null) cleanSlide.video_url = videoUrl;
      
      if (slide.minutes !== null && slide.minutes !== undefined) cleanSlide.minutes = parseInt(slide.minutes) || 0;
      if (slide.seconds !== null && slide.seconds !== undefined) cleanSlide.seconds = parseInt(slide.seconds) || 0;
      if (slide.start_minutes !== null && slide.start_minutes !== undefined) cleanSlide.start_minutes = parseInt(slide.start_minutes) || 0;
      if (slide.start_seconds !== null && slide.start_seconds !== undefined) cleanSlide.start_seconds = parseInt(slide.start_seconds) || 0;
    }

    // Handle image - only include if it's a file object or explicitly removed
    if (slide.image && slide.image.uri) {
      // React Native file format - new image to upload
      cleanSlide.image = slide.image;
    } else if (slide.image === '') {
      // Empty string means remove existing image
      cleanSlide.image = '';
    }
    // If slide.image is null/undefined, don't include it - Rails will keep existing image
    // Don't include image_url - that's only for display

    // Final cleanup - only include whitelisted fields to prevent sending backend-only fields
    const finalSlide = {};
    SLIDE_ALLOWED_FIELDS.forEach(field => {
      if (cleanSlide.hasOwnProperty(field)) {
        finalSlide[field] = cleanSlide[field];
      }
    });

    return finalSlide;
  }

  /**
   * Determine if a slide is an update (has an id)
   * @param {Object} slide - Slide data
   * @returns {boolean} True if slide has an id
   */
  static isUpdate(slide) {
    return slide.id != null;
  }

  /**
   * Format slide for logging (handles file objects gracefully)
   * @param {Object} slide - Slide data
   * @returns {string} JSON string representation
   */
  static formatForLogging(slide) {
    return JSON.stringify(slide, (key, value) => {
      // Don't try to stringify file objects
      if (key === 'image' && value && typeof value === 'object' && value.uri) {
        return `[File: ${value.name || 'image'}]`;
      }
      return value;
    }, 2);
  }
}

