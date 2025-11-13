import { createConsumer } from '@rails/actioncable';

/**
 * ActionCable Service
 * Manages WebSocket connections for real-time updates
 */

class ActionCableService {
  constructor() {
    this.consumer = null;
    this.subscriptions = new Map();
  }

  /**
   * Initialize ActionCable consumer
   * @param {string} cableUrl - WebSocket URL (defaults to global.cable_url)
   */
  initialize(cableUrl = null) {
    const url = cableUrl || global.cable_url || 'ws://192.168.1.84:3000/cable';
    
    if (!this.consumer) {
      this.consumer = createConsumer(url);
    }
    
    return this.consumer;
  }

  /**
   * Get or create the consumer
   */
  getConsumer() {
    if (!this.consumer) {
      this.initialize();
    }
    return this.consumer;
  }

  /**
   * Subscribe to a channel
   * @param {string} channelName - Channel name (e.g., 'ShowRunnerChannel')
   * @param {Object} params - Channel parameters
   * @param {Object} callbacks - Callback functions for received messages
   * @returns {Object} Subscription object
   */
  subscribe(channelName, params, callbacks) {
    const consumer = this.getConsumer();
    // Sort params keys to ensure consistent key generation
    const sortedParams = Object.keys(params).sort().reduce((acc, key) => {
      acc[key] = params[key];
      return acc;
    }, {});
    const subscriptionKey = `${channelName}_${JSON.stringify(sortedParams)}`;
    
    // Unsubscribe if already subscribed
    if (this.subscriptions.has(subscriptionKey)) {
      this.unsubscribe(subscriptionKey);
    }
    
    const subscription = consumer.subscriptions.create(
      {
        channel: channelName,
        ...params,
      },
      {
        connected: () => {
          console.log(`ActionCable: Connected to ${channelName}`);
          if (callbacks.connected) {
            callbacks.connected();
          }
        },
        disconnected: () => {
          console.log(`ActionCable: Disconnected from ${channelName}`);
          if (callbacks.disconnected) {
            callbacks.disconnected();
          }
        },
        received: (data) => {
          if (callbacks.received) {
            callbacks.received(data);
          }
        },
      }
    );
    
    this.subscriptions.set(subscriptionKey, subscription);
    return { subscription, subscriptionKey };
  }

  /**
   * Unsubscribe from a channel
   * @param {string} subscriptionKey - Key used when subscribing
   */
  unsubscribe(subscriptionKey) {
    const subscription = this.subscriptions.get(subscriptionKey);
    if (subscription) {
      subscription.unsubscribe();
      this.subscriptions.delete(subscriptionKey);
    }
  }

  /**
   * Unsubscribe from all channels
   */
  unsubscribeAll() {
    this.subscriptions.forEach((subscription, key) => {
      subscription.unsubscribe();
    });
    this.subscriptions.clear();
  }

  /**
   * Disconnect the consumer
   */
  disconnect() {
    this.unsubscribeAll();
    if (this.consumer) {
      this.consumer.disconnect();
      this.consumer = null;
    }
  }
}

export default new ActionCableService();

