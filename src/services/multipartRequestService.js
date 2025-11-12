import { API_ENDPOINTS } from '../constants/apiEndpoints';
import CsrfTokenService from './csrfTokenService';
import ApiService from './api';
import { ErrorHandler } from '../utils/errorHandler';
import { SlideDataCleaner } from '../utils/slideDataCleaner';

/**
 * Service for handling multipart/form-data requests
 * Encapsulates FormData construction and CSRF token handling
 */
class MultipartRequestService {
  /**
   * Save a slide (create or update)
   * @param {number} showId - Show ID
   * @param {Object} slide - Slide data
   * @param {number} ordinal - Slide position/order
   * @returns {Promise<Object>} Saved slide data
   */
  async saveSlide(showId, slide, ordinal) {
    // Clean the slide data
    const isUpdate = SlideDataCleaner.isUpdate(slide);
    const cleanedSlide = SlideDataCleaner.cleanSlide(slide, isUpdate);

    // Ensure we have a fresh CSRF token
    const csrfToken = await CsrfTokenService.ensureFreshToken();

    // Build request payload
    const requestPayload = {
      custom_message: cleanedSlide,
      ordinal: ordinal,
      authenticity_token: csrfToken,
    };

    // Use ApiService's objectToFormData helper to properly encode the request
    const formData = ApiService.objectToFormData(requestPayload);

    // Get headers with CSRF token
    const headers = await CsrfTokenService.getHeaders(csrfToken);

    // Send request
    const response = await fetch(API_ENDPOINTS.ADD_CUSTOM_MESSAGE(showId), {
      method: 'POST',
      credentials: 'include',
      headers: {
        ...headers,
        // Don't set Content-Type - fetch will set it with boundary for FormData
      },
      body: formData,
    });

    if (!response.ok) {
      const errorInfo = await ErrorHandler.parseErrorResponse(response);
      const userMessage = ErrorHandler.formatUserMessage(errorInfo.message);
      throw new Error(userMessage);
    }

    return await response.json();
  }

  /**
   * Delete removed messages (slides that were removed from the show)
   * @param {number} showId - Show ID
   * @param {Array<number>} messageIds - Array of message IDs to keep (others will be deleted)
   * @returns {Promise<void>}
   */
  async destroyRemovedMessages(showId, messageIds) {
    // Ensure we have a fresh CSRF token
    const csrfToken = await CsrfTokenService.ensureFreshToken();

    // Manually construct FormData
    const formData = new FormData();
    
    // Add authenticity_token using the service
    await CsrfTokenService.addToFormData(formData, csrfToken);
    
    // Add custom_message_ids_seen array
    messageIds.forEach((id, index) => {
      formData.append(`custom_message_ids_seen[${index}]`, String(id));
    });
    
    // Get headers with CSRF token
    const headers = await CsrfTokenService.getHeaders(csrfToken);
    
    // Send request
    const response = await fetch(API_ENDPOINTS.DESTROY_REMOVED_MESSAGES(showId), {
      method: 'POST',
      credentials: 'include',
      headers,
      body: formData,
    });
    
    if (!response.ok) {
      const errorInfo = await ErrorHandler.parseErrorResponse(response);
      console.error('Error destroying removed messages:', errorInfo);
      // Don't throw - this is cleanup, not critical
    }
  }

  /**
   * Save multiple slides
   * @param {number} showId - Show ID
   * @param {Array<Object>} slides - Array of slide data
   * @returns {Promise<Object>} Object with slides array and errors array
   */
  async saveSlides(showId, slides) {
    const completedSlides = [];
    const errors = [];

    // Save each slide
    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      try {
        const savedSlide = await this.saveSlide(showId, slide, i + 1);
        completedSlides.push(savedSlide);
      } catch (error) {
        const errorMessage = await ErrorHandler.handleError(error, 'saveSlides');
        errors.push({ slide, error: errorMessage });
        console.error(`Error saving slide ${i + 1}:`, errorMessage);
        // Continue with other slides even if one fails
      }
    }

    // Delete removed slides (slides that exist on server but not in our array)
    // Only delete if we successfully saved at least one slide
    const slideIdsSeen = completedSlides.map(s => s.id).filter(id => id);
    
    if (slideIdsSeen.length > 0) {
      try {
        await this.destroyRemovedMessages(showId, slideIdsSeen);
      } catch (error) {
        // Log but don't fail - cleanup is not critical
        console.error('Error destroying removed messages:', error);
      }
    }

    return { slides: completedSlides, errors };
  }
}

export default new MultipartRequestService();

