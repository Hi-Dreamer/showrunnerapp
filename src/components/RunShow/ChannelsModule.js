import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, Modal, FlatList, Switch } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import ApiService from '../../services/api';
import { API_ENDPOINTS } from '../../constants/apiEndpoints';
import CsrfTokenService from '../../services/csrfTokenService';
import { ErrorHandler } from '../../utils/errorHandler';
import ActionCableService from '../../services/actionCableService';

/**
 * Channels Module Component
 * Controls channel takeover functionality
 */
const ChannelsModule = ({ showId }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { currentShow } = useSelector((state) => state.show);
  const [show, setShow] = useState(null);
  
  const [userChannels, setUserChannels] = useState([]);
  const [venueChannels, setVenueChannels] = useState([]);
  const [selectedChannelId, setSelectedChannelId] = useState(null);
  const [selectedChannelName, setSelectedChannelName] = useState('');
  const [showChannelPicker, setShowChannelPicker] = useState(false);
  const [channelType, setChannelType] = useState('user'); // 'user' or 'venue'
  const [loading, setLoading] = useState(false);
  const [currentTakeover, setCurrentTakeover] = useState(null);
  const [channelSubscription, setChannelSubscription] = useState(null);

  // Load show data and channels
  useEffect(() => {
    const loadChannels = async () => {
      try {
        const api = ApiService.getClient();
        
        // Load show data to get venue info
        const showData = await api.shows(showId).get();
        setShow(showData);
        
        // Load user channels from current user
        if (user && user.channels) {
          setUserChannels(user.channels || []);
        } else {
          // Try to get current user with channels
          try {
            const currentUser = await api.users.me.get();
            if (currentUser && currentUser.channels) {
              setUserChannels(currentUser.channels || []);
            }
          } catch (error) {
            console.warn('Failed to load user channels:', error);
          }
        }
        
        // Load venue channels if show has a venue
        if (showData && showData.venue_id) {
          try {
            const venue = await api.venues(showData.venue_id).get();
            if (venue && venue.channels) {
              setVenueChannels(venue.channels || []);
            }
          } catch (error) {
            console.warn('Failed to load venue channels:', error);
          }
        }
      } catch (error) {
        console.error('Error loading channels:', error);
      }
    };

    if (showId) {
      loadChannels();
    }
  }, [showId, user]);

  // Subscribe to ChannelChannel when a channel is taken over
  useEffect(() => {
    if (selectedChannelId && currentTakeover) {
      const result = ActionCableService.subscribe(
        'ChannelChannel',
        { channel_id: selectedChannelId },
        {
          connected: () => {
            console.log('ChannelChannel: Connected');
          },
          disconnected: () => {
            console.log('ChannelChannel: Disconnected');
          },
          received: (data) => {
            handleChannelUpdate(data);
          },
        }
      );
      
      setChannelSubscription(result.subscriptionKey);
      
      return () => {
        if (result.subscriptionKey) {
          ActionCableService.unsubscribe(result.subscriptionKey);
        }
      };
    }
  }, [selectedChannelId, currentTakeover]);

  const handleChannelUpdate = (data) => {
    if (data.takeover_show_id) {
      setCurrentTakeover({
        showId: data.takeover_show_id,
        label: data.takeover_label,
      });
    }
    
    if (data.kill_all_takeovers || data.kill_takeover) {
      setCurrentTakeover(null);
    }
  };

  // Handle Take Channel
  const handleTakeChannel = async () => {
    if (!selectedChannelId) {
      Alert.alert('Error', 'Please select a channel');
      return;
    }

    setLoading(true);
    try {
      const csrfToken = await CsrfTokenService.ensureFreshToken();
      const response = await fetch(
        `${API_ENDPOINTS.CHANNEL(selectedChannelId)}/show_takeover?show_id=${showId}`,
        {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'X-CSRF-Token': csrfToken,
          },
        }
      );

      if (!response.ok) {
        const errorInfo = await ErrorHandler.parseErrorResponse(response);
        throw new Error(ErrorHandler.formatUserMessage(errorInfo.message));
      }

      Alert.alert('Success', 'Channel takeover successful');
      setCurrentTakeover({
        showId: showId,
        label: selectedChannelName,
      });
    } catch (error) {
      const errorMessage = await ErrorHandler.handleError(error, 'takeChannel');
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle Release Channel (Kill All Takeovers)
  const handleReleaseChannel = async () => {
    if (!selectedChannelId) {
      Alert.alert('Error', 'Please select a channel');
      return;
    }

    Alert.alert(
      'Release Channel',
      'Are you sure you want to release all channel takeovers?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Release',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const csrfToken = await CsrfTokenService.ensureFreshToken();
              const response = await fetch(
                `${API_ENDPOINTS.CHANNEL(selectedChannelId)}/kill_all_takeovers?show_id=${showId}`,
                {
                  method: 'GET',
                  credentials: 'include',
                  headers: {
                    'Accept': 'application/json',
                    'X-CSRF-Token': csrfToken,
                  },
                }
              );

              if (!response.ok) {
                const errorInfo = await ErrorHandler.parseErrorResponse(response);
                throw new Error(ErrorHandler.formatUserMessage(errorInfo.message));
              }

              Alert.alert('Success', 'Channel released');
              setCurrentTakeover(null);
            } catch (error) {
              const errorMessage = await ErrorHandler.handleError(error, 'releaseChannel');
              Alert.alert('Error', errorMessage);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // Handle Kill Performer Control
  const handleKillPerformerControl = async () => {
    if (!selectedChannelId) {
      Alert.alert('Error', 'Please select a channel');
      return;
    }

    setLoading(true);
    try {
      const csrfToken = await CsrfTokenService.ensureFreshToken();
      const response = await fetch(
        `${API_ENDPOINTS.CHANNEL(selectedChannelId)}/kill_show_takeover?show_id=${showId}`,
        {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'X-CSRF-Token': csrfToken,
          },
        }
      );

      if (!response.ok) {
        const errorInfo = await ErrorHandler.parseErrorResponse(response);
        throw new Error(ErrorHandler.formatUserMessage(errorInfo.message));
      }

      Alert.alert('Success', 'Performer control killed');
    } catch (error) {
      const errorMessage = await ErrorHandler.handleError(error, 'killPerformerControl');
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const availableChannels = channelType === 'user' ? userChannels : venueChannels;
  const hasUserChannels = userChannels.length > 0;
  const hasVenueChannels = venueChannels.length > 0;
  const showChannelTypeToggle = hasUserChannels && hasVenueChannels;

  if (!hasUserChannels && !hasVenueChannels) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>
          No channels available. You need to have personal channels or the show's venue needs to have channels.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={true}
    >
      {/* Channel Type Toggle */}
      {showChannelTypeToggle && (
        <View style={styles.section}>
          <View style={styles.switchRow}>
            <Text style={[styles.switchLabel, { marginRight: 15 }]}>YOUR CHANNELS</Text>
            <Switch
              value={channelType === 'venue'}
              onValueChange={(value) => setChannelType(value ? 'venue' : 'user')}
              trackColor={{ false: '#b6b9d9', true: '#bee0bd' }}
              thumbColor="#fff"
            />
            <Text style={[styles.switchLabel, { marginLeft: 15 }]}>VENUE CHANNELS</Text>
          </View>
        </View>
      )}

      {/* Channel Selection */}
      <View style={styles.section}>
        <Text style={styles.label}>
          Select {channelType === 'user' ? 'Your' : 'Venue'} Channel
        </Text>
        <TouchableOpacity
          style={styles.pickerButton}
          onPress={() => setShowChannelPicker(true)}
        >
          <Text style={styles.pickerButtonText}>
            {selectedChannelName || 'Select a channel'}
          </Text>
          <Text style={styles.pickerButtonArrow}>▼</Text>
        </TouchableOpacity>

        <Modal
          visible={showChannelPicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowChannelPicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Channel</Text>
              <FlatList
                data={availableChannels}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.modalItem,
                      selectedChannelId === item.id && styles.modalItemSelected,
                    ]}
                    onPress={() => {
                      setSelectedChannelId(item.id);
                      setSelectedChannelName(item.name || `Channel ${item.id}`);
                      setShowChannelPicker(false);
                    }}
                  >
                    <Text style={styles.modalItemText}>
                      {item.name || `Channel ${item.id}`}
                    </Text>
                    {selectedChannelId === item.id && (
                      <Text style={styles.modalItemCheck}>✓</Text>
                    )}
                  </TouchableOpacity>
                )}
              />
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowChannelPicker(false)}
              >
                <Text style={styles.modalCloseButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>

      {/* Action Buttons */}
      <View style={styles.section}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton, (loading || !selectedChannelId) && styles.buttonDisabled]}
          onPress={handleTakeChannel}
          disabled={loading || !selectedChannelId}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Loading...' : 'TAKE CHANNEL'}
          </Text>
        </TouchableOpacity>

        {currentTakeover && (
          <>
            <TouchableOpacity
              style={[styles.button, styles.releaseButton, loading && styles.buttonDisabled]}
              onPress={handleReleaseChannel}
              disabled={loading}
            >
              <Text style={styles.buttonText}>RELEASE CHANNEL</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.killButton, loading && styles.buttonDisabled]}
              onPress={handleKillPerformerControl}
              disabled={loading}
            >
              <Text style={styles.buttonText}>KILL PERFORMER CONTROL</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    backgroundColor: '#fff',
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  pickerButtonArrow: {
    fontSize: 12,
    color: '#666',
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  releaseButton: {
    backgroundColor: '#FF9500',
  },
  killButton: {
    backgroundColor: '#FF3B30',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '80%',
    maxHeight: '70%',
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalItemSelected: {
    backgroundColor: '#f0f0f0',
  },
  modalItemText: {
    fontSize: 16,
    flex: 1,
  },
  modalItemCheck: {
    fontSize: 18,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  modalCloseButton: {
    marginTop: 15,
    padding: 15,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginTop: 50,
    padding: 20,
  },
});

export default ChannelsModule;

