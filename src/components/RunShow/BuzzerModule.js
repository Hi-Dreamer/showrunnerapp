import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { setShowState } from '../../actions/runShowActions';

/**
 * Buzzer Module Component
 * Controls game buzzer functionality
 */
const BuzzerModule = ({ showId }) => {
  const dispatch = useDispatch();
  const { 
    showState, 
    buzzerState,
    buzzerWinners,
    buzzerCount
  } = useSelector((state) => state.runShow);
  
  const [loading, setLoading] = React.useState(false);

  // Handle Get Ready
  const handleGetReady = async () => {
    setLoading(true);
    const result = await dispatch(
      setShowState(showId, 'buzzer', {
        buzzer_state: 'get_ready',
      })
    );
    setLoading(false);
    
    if (!result.success) {
      Alert.alert('Error', result.error || 'Failed to set get ready state');
    }
  };

  // Handle Go
  const handleGo = async () => {
    if (buzzerState !== 'get_ready') {
      Alert.alert('Error', 'Must be in get ready state to start');
      return;
    }
    
    setLoading(true);
    const result = await dispatch(
      setShowState(showId, 'buzzer', {
        buzzer_state: 'go',
      })
    );
    setLoading(false);
    
    if (!result.success) {
      Alert.alert('Error', result.error || 'Failed to start buzzer');
    }
  };

  // Handle Next
  const handleNext = async () => {
    if (buzzerState === 'get_ready' || buzzerState === 'correct') {
      Alert.alert('Error', 'Cannot advance in current state');
      return;
    }
    
    if (buzzerCount >= (buzzerWinners ? buzzerWinners.length : 0)) {
      Alert.alert('Error', 'No more buzzers available');
      return;
    }
    
    setLoading(true);
    const result = await dispatch(
      setShowState(showId, 'buzzer', {
        buzzer_state: 'next',
      })
    );
    setLoading(false);
    
    if (!result.success) {
      Alert.alert('Error', result.error || 'Failed to advance buzzer');
    }
  };

  // Handle Correct
  const handleCorrect = async () => {
    if (buzzerState === 'get_ready' || buzzerState === 'correct') {
      Alert.alert('Error', 'Cannot mark correct in current state');
      return;
    }
    
    if (!buzzerWinners || buzzerWinners.length === 0) {
      Alert.alert('Error', 'No buzzers available');
      return;
    }
    
    setLoading(true);
    const result = await dispatch(
      setShowState(showId, 'buzzer', {
        buzzer_state: 'correct',
      })
    );
    setLoading(false);
    
    if (!result.success) {
      Alert.alert('Error', result.error || 'Failed to mark correct');
    }
  };

  // Get current buzzer info
  const getCurrentBuzzer = () => {
    if (!buzzerWinners || buzzerWinners.length === 0) {
      return null;
    }
    
    // Current buzzer is at index buzzerCount (0-indexed)
    if (buzzerCount >= buzzerWinners.length) {
      return null;
    }
    
    return buzzerWinners[buzzerCount];
  };

  // Get current buzzer display
  const getCurrentBuzzerDisplay = () => {
    const buzzer = getCurrentBuzzer();
    if (!buzzer) {
      return 'No Buzzer';
    }
    
    // Show nickname if available, otherwise last 4 digits of device ID
    if (buzzer.nickname) {
      return buzzer.nickname;
    }
    
    if (buzzer.device_id) {
      const deviceId = buzzer.device_id.toString();
      return deviceId.slice(-4);
    }
    
    return 'Unknown';
  };

  // Check if buttons should be disabled
  const isGoDisabled = () => {
    return buzzerState !== 'get_ready';
  };

  const isNextDisabled = () => {
    return buzzerState === 'get_ready' || 
           buzzerState === 'correct' || 
           buzzerCount >= (buzzerWinners ? buzzerWinners.length : 0);
  };

  const isCorrectDisabled = () => {
    return buzzerState === 'get_ready' || 
           buzzerState === 'correct' || 
           !buzzerWinners || 
           buzzerWinners.length === 0;
  };

  const isInBuzzerState = showState === 'buzzer';
  const currentBuzzer = getCurrentBuzzer();
  const currentBuzzerDisplay = getCurrentBuzzerDisplay();
  const totalBuzzers = buzzerWinners ? buzzerWinners.length : 0;

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={true}
    >
      {/* Action Buttons */}
      <View style={styles.section}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton, loading && styles.buttonDisabled]}
          onPress={handleGetReady}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Loading...' : 'GET READY'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.goButton, (loading || isGoDisabled()) && styles.buttonDisabled]}
          onPress={handleGo}
          disabled={loading || isGoDisabled()}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Loading...' : 'GO'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.nextButton, (loading || isNextDisabled()) && styles.buttonDisabled]}
          onPress={handleNext}
          disabled={loading || isNextDisabled()}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Loading...' : 'NEXT'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.correctButton, (loading || isCorrectDisabled()) && styles.buttonDisabled]}
          onPress={handleCorrect}
          disabled={loading || isCorrectDisabled()}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Loading...' : 'CORRECT'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Buzzer Winners List */}
      {buzzerWinners && buzzerWinners.length > 0 && (
        <View style={styles.winnersSection}>
          <Text style={styles.winnersTitle}>Buzz-In Order</Text>
          {buzzerWinners.map((buzzer, index) => {
            const display = buzzer.nickname || 
                          (buzzer.device_id ? buzzer.device_id.toString().slice(-4) : 'N/A');
            const isCurrent = index === buzzerCount;
            const isCorrect = buzzerState === 'correct' && index === buzzerCount;
            
            return (
              <View 
                key={index} 
                style={[
                  styles.buzzerItem,
                  isCurrent && styles.buzzerItemCurrent,
                  isCorrect && styles.buzzerItemCorrect
                ]}
              >
                <Text style={styles.buzzerItemText}>
                  #{index + 1}: {display}
                  {isCurrent && ' (Current)'}
                  {isCorrect && ' ✓'}
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
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  goButton: {
    backgroundColor: '#34C759',
  },
  nextButton: {
    backgroundColor: '#FF9500',
  },
  correctButton: {
    backgroundColor: '#34C759',
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
  buzzerDisplay: {
    marginTop: 15,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  buzzerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 5,
  },
  buzzerId: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
    fontFamily: 'monospace',
    marginBottom: 5,
  },
  buzzerNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
  },
  correctIndicator: {
    marginTop: 15,
    padding: 15,
    backgroundColor: '#34C759',
    borderRadius: 8,
    alignItems: 'center',
  },
  correctText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
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
  buzzerItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  buzzerItemCurrent: {
    backgroundColor: '#e3f2fd',
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  buzzerItemCorrect: {
    backgroundColor: '#e8f5e9',
    borderLeftWidth: 4,
    borderLeftColor: '#34C759',
  },
  buzzerItemText: {
    fontSize: 16,
    color: '#333',
  },
});

export default BuzzerModule;

