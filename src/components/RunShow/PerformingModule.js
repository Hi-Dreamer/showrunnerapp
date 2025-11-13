import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, Modal, FlatList } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { setShowState } from '../../actions/runShowActions';
import ApiService from '../../services/api';

/**
 * Performing Module Component
 * Controls performer performance timer
 */
const PerformingModule = ({ showId }) => {
  const dispatch = useDispatch();
  const { showState, activePerformerId, activePerformerName } = useSelector(
    (state) => state.runShow
  );
  
  const [performers, setPerformers] = useState([]);
  const [selectedPerformerId, setSelectedPerformerId] = useState(null);
  const [selectedPerformerName, setSelectedPerformerName] = useState('');
  const [showPerformerPicker, setShowPerformerPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load performers
  useEffect(() => {
    const loadPerformers = async () => {
      try {
        const api = ApiService.getClient();
        const performersData = await api.performers.get({ show_id: showId });
        if (performersData && performersData.length > 0) {
          // Sort performers by id to ensure consistent order
          const sortedPerformers = [...performersData].sort((a, b) => a.id - b.id);
          setPerformers(sortedPerformers);
          if (!selectedPerformerId && sortedPerformers.length > 0) {
            const firstPerformer = sortedPerformers[0];
            setSelectedPerformerId(firstPerformer.id);
            setSelectedPerformerName(firstPerformer.name);
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
    if (activePerformerId) {
      setSelectedPerformerId(activePerformerId);
      const performer = performers.find(p => p.id === activePerformerId);
      if (performer) {
        setSelectedPerformerName(performer.name);
      }
    }
  }, [activePerformerId, performers]);

  // Get next performer in the list (from currently active/performing performer)
  const getNextPerformer = () => {
    if (performers.length === 0) return null;
    // Use activePerformerId if available (currently performing), otherwise use selectedPerformerId
    const currentPerformerId = activePerformerId || selectedPerformerId;
    const currentIndex = performers.findIndex(p => p.id === currentPerformerId);
    if (currentIndex === -1) return performers[0];
    const nextIndex = (currentIndex + 1) % performers.length;
    return performers[nextIndex];
  };

  // Get previous performer in the list (from currently active/performing performer)
  const getPreviousPerformer = () => {
    if (performers.length === 0) return null;
    // Use activePerformerId if available (currently performing), otherwise use selectedPerformerId
    const currentPerformerId = activePerformerId || selectedPerformerId;
    const currentIndex = performers.findIndex(p => p.id === currentPerformerId);
    if (currentIndex === -1) return performers[0];
    const prevIndex = currentIndex === 0 ? performers.length - 1 : currentIndex - 1;
    return performers[prevIndex];
  };

  // Get first performer (host)
  const getFirstPerformer = () => {
    if (performers.length === 0) return null;
    return performers[0];
  };

  const handleStartPerformance = async (performerId = null) => {
    const targetPerformerId = performerId || selectedPerformerId;
    if (!targetPerformerId) {
      Alert.alert('Error', 'No performer selected');
      return;
    }

    setLoading(true);
    const result = await dispatch(
      setShowState(showId, 'performing', {
        performer_id: targetPerformerId,
      })
    );
    setLoading(false);

    if (!result.success) {
      Alert.alert('Error', result.error || 'Failed to start performance');
    }
  };

  const handleUpArrow = async () => {
    const previousPerformer = getPreviousPerformer();
    if (previousPerformer) {
      setSelectedPerformerId(previousPerformer.id);
      setSelectedPerformerName(previousPerformer.name);
      await handleStartPerformance(previousPerformer.id);
    }
  };

  const handleDownArrow = async () => {
    const nextPerformer = getNextPerformer();
    if (nextPerformer) {
      setSelectedPerformerId(nextPerformer.id);
      setSelectedPerformerName(nextPerformer.name);
      await handleStartPerformance(nextPerformer.id);
    }
  };

  const handleHostButton = async () => {
    const firstPerformer = getFirstPerformer();
    if (firstPerformer) {
      setSelectedPerformerId(firstPerformer.id);
      setSelectedPerformerName(firstPerformer.name);
      await handleStartPerformance(firstPerformer.id);
    }
  };

  if (performers.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>
          No performers available. Please add performers to this show.
        </Text>
      </View>
    );
  }

  const handleSelectPerformerFromModal = (performerId) => {
    if (performerId) {
      setSelectedPerformerId(performerId);
      const performer = performers.find(p => p.id === performerId);
      if (performer) {
        setSelectedPerformerName(performer.name);
      }
      setShowPerformerPicker(false);
    }
  };

  const handleStartSelectedPerformer = async () => {
    if (!selectedPerformerId) {
      Alert.alert('Error', 'Please select a performer first');
      return;
    }
    await handleStartPerformance(selectedPerformerId);
  };

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={true}
    >
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
                    onPress={() => handleSelectPerformerFromModal(item.id)}
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

      {/* Navigation Buttons Section */}
      <View style={styles.navigationSection}>
        <TouchableOpacity
          style={[styles.selectPerformerButton, loading && styles.buttonDisabled]}
          onPress={handleStartSelectedPerformer}
          disabled={loading || !selectedPerformerId || performers.length === 0}
        >
          <Text style={styles.selectPerformerButtonText}>
            {selectedPerformerName ? `START: ${selectedPerformerName}` : 'SELECT PERFORMER'}
          </Text>
        </TouchableOpacity>

        <View style={styles.arrowButtonsRow}>
          <TouchableOpacity
            style={[styles.arrowButton, loading && styles.buttonDisabled]}
            onPress={handleUpArrow}
            disabled={loading || performers.length === 0}
          >
            <Text style={styles.arrowButtonText}>▲</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.arrowButton, loading && styles.buttonDisabled]}
            onPress={handleDownArrow}
            disabled={loading || performers.length === 0}
          >
            <Text style={styles.arrowButtonText}>▼</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.hostButton, loading && styles.buttonDisabled]}
          onPress={handleHostButton}
          disabled={loading || performers.length === 0}
        >
          <Text style={styles.hostButtonText}>HOST</Text>
        </TouchableOpacity>
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
  buttonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  navigationSection: {
    marginTop: 40,
    alignItems: 'center',
  },
  selectPerformerButton: {
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    marginBottom: 30,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    minWidth: 200,
  },
  selectPerformerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  arrowButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  arrowButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  arrowButtonText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  hostButton: {
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 8,
    backgroundColor: '#34C759',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  hostButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginTop: 50,
    padding: 20,
  },
});

export default PerformingModule;

