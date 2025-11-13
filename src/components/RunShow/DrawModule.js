import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, Switch } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { setShowState, runShowUpdateState } from '../../actions/runShowActions';

/**
 * Draw Module Component
 * Controls random draw prize selection
 */
const DrawModule = ({ showId }) => {
  const dispatch = useDispatch();
  const { 
    showState, 
    drawState,
    drawWinners,
    optInCount,
    audienceCount
  } = useSelector((state) => state.runShow);
  
  const [drawType, setDrawType] = useState('from_all'); // 'from_all' or 'from_opt_in'
  const [loading, setLoading] = useState(false);

  // Initialize draw type from drawState
  useEffect(() => {
    if (drawState) {
      if (drawState.includes('opt_in')) {
        setDrawType('from_opt_in');
      } else {
        setDrawType('from_all');
      }
    }
  }, [drawState]);

  // Handle draw type toggle
  const handleDrawTypeToggle = (value) => {
    const newType = value ? 'from_opt_in' : 'from_all';
    setDrawType(newType);
    // Update Redux state immediately
    // Note: Actual state will be set when actions are taken
  };

  // Get current draw state based on draw type
  const getDrawStateForType = (action) => {
    const suffix = drawType === 'from_opt_in' ? 'opt_in' : 'all';
    return `${action}_${suffix}`;
  };

  // Handle Get Ready / Prompt Opt-In
  const handleGetReady = async () => {
    const drawStateValue = getDrawStateForType('get_ready');
    
    setLoading(true);
    const result = await dispatch(
      setShowState(showId, 'draw', {
        draw_state: drawStateValue,
      })
    );
    setLoading(false);
    
    if (!result.success) {
      Alert.alert('Error', result.error || 'Failed to set get ready state');
    }
  };

  // Handle Pick From All / Pick From Opt-In
  const handlePick = async () => {
    const drawStateValue = getDrawStateForType('pick');
    
    // Check if we can pick
    if (drawType === 'from_opt_in' && optInCount === 0) {
      Alert.alert('Error', 'No opt-ins available. Please wait for voters to opt in.');
      return;
    }
    
    setLoading(true);
    const result = await dispatch(
      setShowState(showId, 'draw', {
        draw_state: drawStateValue,
      })
    );
    setLoading(false);
    
    if (!result.success) {
      Alert.alert('Error', result.error || 'Failed to pick winner');
    }
  };

  // Handle Reset Draws
  const handleResetDraws = () => {
    Alert.alert(
      'Reset Draws',
      'Are you sure you want to reset the draws? This will clear all draw times and opt-ins, and reset to get ready state. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Draws',
          style: 'destructive',
          onPress: async () => {
            const drawStateValue = getDrawStateForType('reset');
            
            setLoading(true);
            const result = await dispatch(
              setShowState(showId, 'draw', {
                draw_state: drawStateValue,
              })
            );
            setLoading(false);
            
            if (!result.success) {
              Alert.alert('Error', result.error || 'Failed to reset draws');
            }
          },
        },
      ]
    );
  };

  // Get button text for Get Ready
  const getGetReadyButtonText = () => {
    return drawType === 'from_opt_in' ? 'PROMPT OPT-IN' : 'GET READY';
  };

  // Get button text for Pick
  const getPickButtonText = () => {
    return drawType === 'from_opt_in' ? 'PICK FROM OPT-IN' : 'PICK FROM ALL';
  };

  // Get current winner (last winner from drawWinners array)
  const getCurrentWinner = () => {
    if (!drawWinners || drawWinners.length === 0) {
      return null;
    }
    // Most recent winner is first in array (or last, depending on backend)
    const winner = drawWinners[0];
    if (winner && winner.device_id) {
      // Get last 4 digits of device ID
      const deviceId = winner.device_id.toString();
      return deviceId.slice(-4);
    }
    return null;
  };

  // Check if Get Ready button should be disabled
  const isGetReadyDisabled = () => {
    // Disabled when all voters have already won
    // This would require knowing num_winners and num_voters
    // For now, we'll leave it enabled
    return false;
  };

  // Check if Pick button should be disabled
  const isPickDisabled = () => {
    if (drawType === 'from_opt_in') {
      return optInCount === 0;
    }
    // For 'from_all', disabled when all voters have won
    // This would require backend data
    return false;
  };

  const isInDrawState = showState === 'draw';
  const currentWinner = getCurrentWinner();
  const drawCount = drawWinners ? drawWinners.length : 0;

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={true}
    >
      {/* Draw Type Toggle */}
      <View style={styles.section}>
        <View style={styles.switchRow}>
          <Text style={[styles.switchLabel, { marginRight: 15 }]}>ALL</Text>
          <Switch
            value={drawType === 'from_opt_in'}
            onValueChange={handleDrawTypeToggle}
            trackColor={{ false: '#b6b9d9', true: '#bee0bd' }}
            thumbColor="#fff"
          />
          <Text style={[styles.switchLabel, { marginLeft: 15 }]}>OPT-IN</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.section}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton, (loading || isGetReadyDisabled()) && styles.buttonDisabled]}
          onPress={handleGetReady}
          disabled={loading || isGetReadyDisabled()}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Loading...' : getGetReadyButtonText()}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.pickButton, (loading || isPickDisabled()) && styles.buttonDisabled]}
          onPress={handlePick}
          disabled={loading || isPickDisabled()}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Loading...' : getPickButtonText()}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.resetButton, loading && styles.buttonDisabled]}
          onPress={handleResetDraws}
          disabled={loading}
        >
          <Text style={styles.buttonText}>RESET DRAWS</Text>
        </TouchableOpacity>
      </View>

      {/* Draw Winners List */}
      {drawWinners && drawWinners.length > 0 && (
        <View style={styles.winnersSection}>
          <Text style={styles.winnersTitle}>Recent Winners</Text>
          {drawWinners.slice(0, 5).map((winner, index) => {
            const deviceId = winner.device_id ? winner.device_id.toString().slice(-4) : 'N/A';
            return (
              <View key={index} style={styles.winnerItem}>
                <Text style={styles.winnerItemText}>
                  #{index + 1}: {deviceId}
                </Text>
              </View>
            );
          })}
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
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  pickButton: {
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
  winnerDisplay: {
    marginTop: 15,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#34C759',
  },
  winnerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 5,
  },
  winnerId: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#34C759',
    fontFamily: 'monospace',
  },
  winnersSection: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  winnersTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  winnerItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  winnerItemText: {
    fontSize: 16,
    color: '#333',
  },
});

export default DrawModule;

