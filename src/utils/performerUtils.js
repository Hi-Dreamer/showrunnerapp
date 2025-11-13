/**
 * Utility functions for performer-related operations
 */

/**
 * Orders performers array to match the order specified in show.performer_ids
 * 
 * @param {Array} performers - Array of performer objects from API
 * @param {Object} show - Show object containing performer_ids array
 * @returns {Array} Ordered array of performers matching show.performer_ids order
 */
export const orderPerformersByShowOrder = (performers, show) => {
  if (!performers || performers.length === 0) {
    return [];
  }

  // If show has performer_ids array, use it to order performers
  if (show?.performer_ids && Array.isArray(show.performer_ids) && show.performer_ids.length > 0) {
    // Create a map for quick lookup
    const performerMap = new Map(performers.map(p => [p.id, p]));
    
    // Order performers according to performer_ids array
    const orderedPerformers = show.performer_ids
      .map(id => performerMap.get(id))
      .filter(p => p !== undefined); // Filter out any missing performers
    
    // Add any performers not in performer_ids (shouldn't happen, but safety check)
    const orderedIds = new Set(show.performer_ids);
    performers.forEach(p => {
      if (!orderedIds.has(p.id)) {
        orderedPerformers.push(p);
      }
    });
    
    return orderedPerformers;
  }
  
  // If no performer_ids order, return original order (don't sort by ID)
  return performers;
};

