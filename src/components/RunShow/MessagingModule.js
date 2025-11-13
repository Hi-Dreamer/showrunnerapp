import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, Modal, FlatList, TextInput } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { setShowState } from '../../actions/runShowActions';
import ApiService from '../../services/api';

/**
 * Messaging Module Component
 * Controls slide display and cycling
 */
const MessagingModule = ({ showId }) => {
  const dispatch = useDispatch();
  const { showState, activeSlideId, activeSlideName, customMessagesCycling } = useSelector(
    (state) => state.runShow
  );
  
  const [slides, setSlides] = useState([]);
  const [selectedSlideId, setSelectedSlideId] = useState(null);
  const [selectedSlideName, setSelectedSlideName] = useState('');
  const [showSlidePicker, setShowSlidePicker] = useState(false);
  const [cycleMinutes, setCycleMinutes] = useState('0');
  const [cycleSeconds, setCycleSeconds] = useState('10');
  const [loading, setLoading] = useState(false);

  // Load slides
  useEffect(() => {
    const loadSlides = async () => {
      try {
        const api = ApiService.getClient();
        const show = await api.shows(showId).get();
        if (show.custom_messages && show.custom_messages.length > 0) {
          setSlides(show.custom_messages);
          if (!selectedSlideId && show.custom_messages.length > 0) {
            const firstSlide = show.custom_messages[0];
            setSelectedSlideId(firstSlide.id);
            setSelectedSlideName(firstSlide.name || `Slide ${firstSlide.id}`);
          }
        }
      } catch (error) {
        console.error('Error loading slides:', error);
        Alert.alert('Error', 'Failed to load slides');
      }
    };

    if (showId) {
      loadSlides();
    }
  }, [showId]);

  // Update selected slide when active slide changes
  useEffect(() => {
    if (activeSlideId && !customMessagesCycling) {
      setSelectedSlideId(activeSlideId);
      const slide = slides.find(s => s.id === activeSlideId);
      if (slide) {
        setSelectedSlideName(slide.name || `Slide ${slide.id}`);
      }
    }
  }, [activeSlideId, customMessagesCycling, slides]);

  const handleDisplaySlide = async () => {
    if (!selectedSlideId) {
      Alert.alert('Error', 'Please select a slide');
      return;
    }

    setLoading(true);
    const result = await dispatch(
      setShowState(showId, 'messaging', {
        custom_message_id: selectedSlideId,
      })
    );
    setLoading(false);

    if (!result.success) {
      Alert.alert('Error', result.error || 'Failed to display slide');
    }
  };

  const handleCycleSlides = async () => {
    const totalSeconds = parseInt(cycleMinutes) * 60 + parseInt(cycleSeconds);
    
    if (totalSeconds < 10) {
      Alert.alert('Error', 'Cycle time must be at least 10 seconds');
      return;
    }

    setLoading(true);
    const result = await dispatch(
      setShowState(showId, 'messaging', {
        custom_message_id: 'cycle',
        custom_message_frequency_minutes: cycleMinutes,
        custom_message_frequency_seconds: cycleSeconds,
      })
    );
    setLoading(false);

    if (!result.success) {
      Alert.alert('Error', result.error || 'Failed to start cycling');
    }
  };

  const handleNextSlide = async () => {
    if (slides.length === 0) {
      Alert.alert('Error', 'No slides available');
      return;
    }

    let targetSlideId = null;
    
    // If no slide is currently displayed, show the first slide
    if (!activeSlideId || customMessagesCycling) {
      targetSlideId = slides[0].id;
    } else {
      // Find current slide index
      const currentIndex = slides.findIndex(s => s.id === activeSlideId);
      
      if (currentIndex === -1) {
        // Current slide not found, show first slide
        targetSlideId = slides[0].id;
      } else {
        // Move to next slide (wrap around to first if at end)
        const nextIndex = (currentIndex + 1) % slides.length;
        targetSlideId = slides[nextIndex].id;
      }
    }

    setLoading(true);
    const result = await dispatch(
      setShowState(showId, 'messaging', {
        custom_message_id: targetSlideId,
      })
    );
    setLoading(false);

    if (!result.success) {
      Alert.alert('Error', result.error || 'Failed to display slide');
    }
  };

  const handlePreviousSlide = async () => {
    if (slides.length === 0) {
      Alert.alert('Error', 'No slides available');
      return;
    }

    let targetSlideId = null;
    
    // If no slide is currently displayed, show the first slide
    if (!activeSlideId || customMessagesCycling) {
      targetSlideId = slides[0].id;
    } else {
      // Find current slide index
      const currentIndex = slides.findIndex(s => s.id === activeSlideId);
      
      if (currentIndex === -1) {
        // Current slide not found, show first slide
        targetSlideId = slides[0].id;
      } else {
        // Move to previous slide (wrap around to last if at beginning)
        const prevIndex = currentIndex === 0 ? slides.length - 1 : currentIndex - 1;
        targetSlideId = slides[prevIndex].id;
      }
    }

    setLoading(true);
    const result = await dispatch(
      setShowState(showId, 'messaging', {
        custom_message_id: targetSlideId,
      })
    );
    setLoading(false);

    if (!result.success) {
      Alert.alert('Error', result.error || 'Failed to display slide');
    }
  };

  const isInMessagingState = showState === 'messaging';
  const buttonText = isInMessagingState ? 'CHANGE SLIDE' : 'DISPLAY SLIDE';

  if (slides.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>No slides available. Please add slides to this show.</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={true}
    >
      <View style={styles.section}>
        <Text style={styles.label}>Select Slide</Text>
        <TouchableOpacity
          style={styles.pickerButton}
          onPress={() => setShowSlidePicker(true)}
        >
          <Text style={styles.pickerButtonText}>
            {selectedSlideName || 'Select a slide'}
          </Text>
          <Text style={styles.pickerButtonArrow}>▼</Text>
        </TouchableOpacity>

        <Modal
          visible={showSlidePicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowSlidePicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Slide</Text>
              <FlatList
                data={slides}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.modalItem,
                      selectedSlideId === item.id && styles.modalItemSelected,
                    ]}
                    onPress={() => {
                      setSelectedSlideId(item.id);
                      setSelectedSlideName(item.name || `Slide ${item.id}`);
                      setShowSlidePicker(false);
                    }}
                  >
                    <Text style={styles.modalItemText}>
                      {item.name || `Slide ${item.id}`}
                    </Text>
                    {selectedSlideId === item.id && (
                      <Text style={styles.modalItemCheck}>✓</Text>
                    )}
                  </TouchableOpacity>
                )}
              />
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowSlidePicker(false)}
              >
                <Text style={styles.modalCloseButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>

      <View style={styles.section}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton, loading && styles.buttonDisabled]}
          onPress={handleDisplaySlide}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? 'Loading...' : buttonText}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Cycle Slides (Showrunner Only)</Text>
        <Text style={styles.subLabel}>
          Automatically cycle through all slides at the specified interval
        </Text>
        
        <View style={styles.cycleInputs}>
          <View style={styles.cycleInput}>
            <Text style={styles.cycleLabel}>Minutes</Text>
            <TextInput
              style={styles.cycleTextInput}
              value={cycleMinutes}
              onChangeText={(text) => {
                // Only allow numbers 0-5
                const num = parseInt(text);
                if (text === '' || (!isNaN(num) && num >= 0 && num <= 5)) {
                  setCycleMinutes(text);
                }
              }}
              keyboardType="number-pad"
              placeholder="0"
              maxLength={1}
            />
          </View>
          <View style={styles.cycleInput}>
            <Text style={styles.cycleLabel}>Seconds</Text>
            <TextInput
              style={styles.cycleTextInput}
              value={cycleSeconds}
              onChangeText={(text) => {
                // Only allow numbers 0-59, but suggest 10, 20, 30, 40, 50
                const num = parseInt(text);
                if (text === '' || (!isNaN(num) && num >= 0 && num <= 59)) {
                  setCycleSeconds(text);
                }
              }}
              keyboardType="number-pad"
              placeholder="10"
              maxLength={2}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton, loading && styles.buttonDisabled]}
          onPress={handleCycleSlides}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Loading...' : 'CYCLE SLIDES'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Manual Control</Text>
        <View style={styles.manualControlRow}>
          <TouchableOpacity
            style={[styles.arrowButton, styles.arrowButtonUp]}
            onPress={handlePreviousSlide}
            disabled={loading}
          >
            <Text style={styles.arrowButtonText}>↑</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.arrowButton, styles.arrowButtonDown]}
            onPress={handleNextSlide}
            disabled={loading}
          >
            <Text style={styles.arrowButtonText}>↓</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.manualControlHint}>
          Use arrows to navigate through slides one at a time
        </Text>
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
  subLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
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
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: '#34C759',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cycleInputs: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  cycleInput: {
    flex: 1,
    marginRight: 10,
  },
  cycleLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  cycleTextInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    backgroundColor: '#fff',
    fontSize: 16,
    textAlign: 'center',
    color: '#333',
    fontWeight: '600',
  },
  manualControlRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 10,
  },
  arrowButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 15,
  },
  arrowButtonUp: {
    backgroundColor: '#007AFF',
  },
  arrowButtonDown: {
    backgroundColor: '#007AFF',
  },
  arrowButtonText: {
    fontSize: 32,
    color: '#fff',
    fontWeight: 'bold',
  },
  manualControlHint: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 5,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginTop: 50,
  },
});

export default MessagingModule;

