import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, Modal, FlatList, Switch } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { setShowState, resetPicks, runShowUpdateState } from '../../actions/runShowActions';
import ApiService from '../../services/api';

/**
 * Voting Module Component
 * Controls voting for performers (Star Rating or Pick)
 */
const VotingModule = ({ showId }) => {
  const dispatch = useDispatch();
  const { 
    showState, 
    votingType, 
    pickingType, 
    votingPickOptions,
    activePerformerId,
    activePerformerName,
    voteCounts,
    pickCounts,
    setTimes
  } = useSelector((state) => state.runShow);
  
  const [performers, setPerformers] = useState([]);
  const [selectedPerformerId, setSelectedPerformerId] = useState(null);
  const [selectedPerformerName, setSelectedPerformerName] = useState('');
  const [showPerformerPicker, setShowPerformerPicker] = useState(false);
  const [selectedPickPerformers, setSelectedPickPerformers] = useState([]); // Array of performer IDs
  const [loading, setLoading] = useState(false);

  // Load performers
  useEffect(() => {
    const loadPerformers = async () => {
      try {
        const api = ApiService.getClient();
        const performersData = await api.performers.get({ show_id: showId });
        if (performersData && performersData.length > 0) {
          const sortedPerformers = [...performersData].sort((a, b) => a.id - b.id);
          setPerformers(sortedPerformers);
          if (!selectedPerformerId && sortedPerformers.length > 0) {
            const firstPerformer = sortedPerformers[0];
            setSelectedPerformerId(firstPerformer.id);
            setSelectedPerformerName(firstPerformer.name);
          }
          // Initialize pick performers selection
          if (selectedPickPerformers.length === 0) {
            setSelectedPickPerformers(sortedPerformers.map(p => p.id));
          }
        }
      } catch (error) {
        console.error('Error loading performers:', error);
        Alert.alert('Error', 'Failed to load performers');
      }
    };

    if (showId) {
      loadPerformers();
    }
  }, [showId]);

  // Update selected performer when active performer changes
  useEffect(() => {
    if (activePerformerId && votingType === 'star_rating') {
      setSelectedPerformerId(activePerformerId);
      const performer = performers.find(p => p.id === activePerformerId);
      if (performer) {
        setSelectedPerformerName(performer.name);
      }
    }
  }, [activePerformerId, performers, votingType]);

  // Update pick performers when votingPickOptions changes
  useEffect(() => {
    if (votingPickOptions && votingPickOptions.length > 0) {
      setSelectedPickPerformers([...votingPickOptions]);
    }
  }, [votingPickOptions]);

  // Handle voting type toggle
  const handleVotingTypeToggle = async (value) => {
    const newType = value ? 'pick' : 'star_rating';
    
    // Don't update if it's already the same
    if (currentVotingType === newType) {
      return;
    }
    
    // Update Redux state immediately for responsive UI
    dispatch(runShowUpdateState({ votingType: newType }));
    
    setLoading(true);
    
    // Update backend (even if not in voting state)
    const result = await dispatch(
      setShowState(showId, showState || 'messaging', {
        voting_type: newType,
      })
    );
    setLoading(false);
    
    if (!result.success) {
      // Revert on error
      dispatch(runShowUpdateState({ votingType: currentVotingType }));
      Alert.alert('Error', result.error || 'Failed to update voting type');
    }
    // Note: ActionCable will also send an update, but it should match our newType
  };

  // Handle picking type toggle
  const handlePickingTypeToggle = async (value) => {
    const newPickingType = value ? 1 : 0;
    
    if (newPickingType === 0) {
      // Switching to LOCK-IN requires confirmation
      Alert.alert(
        'Switch to LOCK-IN Mode',
        'Lock-in mode prevents voters from changing their picks. Are you sure?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Switch to LOCK-IN',
            onPress: async () => {
              await savePickingType(newPickingType);
            },
          },
        ]
      );
    } else {
      await savePickingType(newPickingType);
    }
  };

  const savePickingType = async (pickingType) => {
    // Update Redux state immediately for responsive UI
    dispatch(runShowUpdateState({ pickingType }));
    
    setLoading(true);
    
    // Preserve current voting type when updating picking type
    const extraParams = {
      picking_type: pickingType,
    };
    
    // Only include voting_type if we're in pick mode (to preserve it)
    if (currentVotingType === 'pick') {
      extraParams.voting_type = 'pick';
    }
    
    const result = await dispatch(
      setShowState(showId, showState || 'messaging', extraParams)
    );
    setLoading(false);
    
    if (!result.success) {
      // Revert on error
      dispatch(runShowUpdateState({ pickingType: pickingType === 1 ? 0 : 1 }));
      Alert.alert('Error', result.error || 'Failed to update picking type');
    }
  };

  // Toggle performer in/out of pick voting
  const handleTogglePickPerformer = (performerId) => {
    const isSelected = selectedPickPerformers.includes(performerId);
    if (isSelected) {
      setSelectedPickPerformers(selectedPickPerformers.filter(id => id !== performerId));
    } else {
      setSelectedPickPerformers([...selectedPickPerformers, performerId]);
    }
  };

  // Start voting
  const handleStartVoting = async () => {
    if (votingType === 'star_rating' || !votingType) {
      // Star Rating voting
      if (!selectedPerformerId) {
        Alert.alert('Error', 'Please select a performer');
        return;
      }
      
      setLoading(true);
      const result = await dispatch(
        setShowState(showId, 'voting', {
          voting_type: 'star_rating',
          performer_id: selectedPerformerId,
        })
      );
      setLoading(false);
      
      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to start voting');
      }
    } else {
      // Pick voting
      if (selectedPickPerformers.length === 0) {
        Alert.alert('Error', 'Please select at least one performer for pick voting');
        return;
      }
      
      setLoading(true);
      const result = await dispatch(
        setShowState(showId, 'voting', {
          voting_type: 'pick',
          voting_pick_options: selectedPickPerformers,
          picking_type: pickingType !== undefined ? pickingType : 1,
        })
      );
      setLoading(false);
      
      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to start pick voting');
      }
    }
  };

  // Announce winner
  const handleAnnounceWinner = async () => {
    const extraParams = {
      voting_type: votingType || 'star_rating',
    };
    
    if (votingType === 'star_rating' && selectedPerformerId) {
      extraParams.performer_id = selectedPerformerId;
    }
    
    setLoading(true);
    const result = await dispatch(
      setShowState(showId, 'winner', extraParams)
    );
    setLoading(false);
    
    if (!result.success) {
      Alert.alert('Error', result.error || 'Failed to announce winner');
    }
  };

  // Reset picks
  const handleResetPicks = () => {
    Alert.alert(
      'Reset Picks',
      'Resetting picks will permanently clear all current votes. This action cannot be undone. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Picks',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            const result = await dispatch(resetPicks(showId));
            setLoading(false);
            
            if (!result.success) {
              Alert.alert('Error', result.error || 'Failed to reset picks');
            }
          },
        },
      ]
    );
  };

  // Get button text
  const getStartButtonText = () => {
    if (showState === 'voting') {
      if (votingType === 'star_rating') {
        return 'CHANGE PERFORMER BEING VOTED ON';
      } else {
        return 'CHANGE PICKS';
      }
    } else {
      if (votingType === 'star_rating' || !votingType) {
        return 'START VOTING FOR PERFORMER';
      } else {
        return 'START PICKING';
      }
    }
  };

  // Calculate average score for a performer
  const getAverageScore = (performerId) => {
    if (!voteCounts[performerId]) return 0;
    const { count, total } = voteCounts[performerId];
    if (count === 0) return 0;
    return (total / count).toFixed(1);
  };

  // Get set time for a performer
  const getSetTime = (performerId) => {
    if (!setTimes || !Array.isArray(setTimes)) return '00:00';
    const performerTime = setTimes.find(st => st.performer_id === performerId);
    return performerTime ? performerTime.set_time : '00:00';
  };

  // Get total picks count
  const getTotalPicks = () => {
    return Object.values(pickCounts).reduce((sum, count) => sum + count, 0);
  };

  const currentVotingType = votingType || 'star_rating';
  const isInVotingState = showState === 'voting' || showState === 'winner';
  const isStarRating = currentVotingType === 'star_rating';
  const isPick = currentVotingType === 'pick';

  if (performers.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>
          No performers available. Please add performers to this show.
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
      {/* Voting Type Toggle */}
      <View style={styles.section}>
        <View style={styles.switchRow}>
          <Text style={[styles.switchLabel, { marginRight: 15 }]}>STAR RATING</Text>
          <Switch
            value={currentVotingType === 'pick'}
            onValueChange={handleVotingTypeToggle}
            trackColor={{ false: '#b6b9d9', true: '#bee0bd' }}
            thumbColor="#fff"
          />
          <Text style={[styles.switchLabel, { marginLeft: 15 }]}>PICK</Text>
        </View>
      </View>

      {/* Picking Type Toggle (Pick Voting only) */}
      {isPick && (
        <View style={styles.section}>
          <View style={styles.switchRow}>
            <Text style={[styles.switchLabel, { marginRight: 15 }]}>LOCK-IN</Text>
            <Switch
              value={pickingType === 1}
              onValueChange={handlePickingTypeToggle}
              trackColor={{ false: '#bee0bd', true: '#b6b9d9' }}
              thumbColor="#fff"
            />
            <Text style={[styles.switchLabel, { marginLeft: 15 }]}>FLUID</Text>
          </View>
        </View>
      )}

      {/* Performer Selection - Star Rating */}
      {isStarRating && (
        <View style={styles.section}>
          <Text style={styles.label}>Select Performer</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowPerformerPicker(true)}
          >
            <Text style={styles.pickerButtonText}>
              {selectedPerformerName || 'Select a performer'}
            </Text>
            <Text style={styles.pickerButtonArrow}>▼</Text>
          </TouchableOpacity>

          <Modal
            visible={showPerformerPicker}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowPerformerPicker(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Select Performer</Text>
                <FlatList
                  data={performers}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.modalItem,
                        selectedPerformerId === item.id && styles.modalItemSelected,
                      ]}
                      onPress={() => {
                        setSelectedPerformerId(item.id);
                        setSelectedPerformerName(item.name);
                        setShowPerformerPicker(false);
                      }}
                    >
                      <Text style={styles.modalItemText}>{item.name}</Text>
                      {selectedPerformerId === item.id && (
                        <Text style={styles.modalItemCheck}>✓</Text>
                      )}
                    </TouchableOpacity>
                  )}
                />
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setShowPerformerPicker(false)}
                >
                  <Text style={styles.modalCloseButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </View>
      )}

      {/* Performer Selection - Pick Voting */}
      {isPick && (
        <View style={styles.section}>
          <Text style={styles.label}>Select Performers for Pick Voting</Text>
          {performers.map((performer) => {
            const isSelected = selectedPickPerformers.includes(performer.id);
            const pickCount = pickCounts[performer.id] || 0;
            return (
              <View key={performer.id} style={styles.pickPerformerRow}>
                <View style={styles.pickPerformerInfo}>
                  <Text style={styles.pickPerformerName}>{performer.name}</Text>
                  {isInVotingState && (
                    <Text style={styles.pickCount}>Picks: {pickCount}</Text>
                  )}
                </View>
                <Switch
                  value={isSelected}
                  onValueChange={() => handleTogglePickPerformer(performer.id)}
                  trackColor={{ false: '#ddd', true: '#bee0bd' }}
                  thumbColor="#fff"
                />
              </View>
            );
          })}
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.section}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton, loading && styles.buttonDisabled]}
          onPress={handleStartVoting}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? 'Loading...' : getStartButtonText()}</Text>
        </TouchableOpacity>

        {isInVotingState && (
          <TouchableOpacity
            style={[styles.button, styles.winnerButton, loading && styles.buttonDisabled]}
            onPress={handleAnnounceWinner}
            disabled={loading}
          >
            <Text style={styles.buttonText}>ANNOUNCE WINNER</Text>
          </TouchableOpacity>
        )}

        {isPick && isInVotingState && (
          <TouchableOpacity
            style={[styles.button, styles.resetButton, loading && styles.buttonDisabled]}
            onPress={handleResetPicks}
            disabled={loading}
          >
            <Text style={styles.buttonText}>RESET PICKS</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Winner Display */}
      {showState === 'winner' && activePerformerName && (
        <View style={styles.winnerSection}>
          <Text style={styles.winnerText}>Winner: {activePerformerName}</Text>
        </View>
      )}
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
  pickPerformerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  pickPerformerInfo: {
    flex: 1,
  },
  pickPerformerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  pickCount: {
    fontSize: 14,
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
  winnerButton: {
    backgroundColor: '#34C759',
  },
  resetButton: {
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
  winnerSection: {
    marginTop: 20,
    padding: 20,
    backgroundColor: '#34C759',
    borderRadius: 8,
    alignItems: 'center',
  },
  winnerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
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

export default VotingModule;

