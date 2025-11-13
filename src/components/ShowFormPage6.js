import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, FlatList, TextInput, Modal, Image } from 'react-native';
import { useDispatch } from 'react-redux';
import { loadShow, updateShow } from '../actions/showActions';
import ApiService from '../services/api';
import { DateUtils } from '../utils/dateUtils';
import { COLORS } from '../constants/theme';

const ShowFormPage6 = forwardRef(({ showId, initialPerformers, page1Data, loadedShow, onBack, onSavePerformers }, ref) => {
  const dispatch = useDispatch();
  const [performers, setPerformers] = useState(initialPerformers || []);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [availablePerformers, setAvailablePerformers] = useState([]);
  const [performerSearchText, setPerformerSearchText] = useState('');
  const [showPerformerPicker, setShowPerformerPicker] = useState(false);

  useEffect(() => {
    if (initialPerformers) {
      setPerformers(initialPerformers);
    }
  }, [initialPerformers]);

  useEffect(() => {
    if (showId && !initialPerformers) {
      setLoading(true);
      const loadPerformers = async () => {
        try {
          const api = ApiService.getClient();
          const performersData = await api.performers.get({ show_id: showId });
          setPerformers(performersData || []);
        } catch (error) {
          console.error('Error loading performers:', error);
        }
        setLoading(false);
      };
      loadPerformers();
    }
  }, [showId, initialPerformers]);

  // Load available performers for search
  useEffect(() => {
    const loadAvailablePerformers = async () => {
      try {
        const api = ApiService.getClient();
        const allPerformers = await api.performers.get();
        setAvailablePerformers(allPerformers || []);
      } catch (error) {
        console.error('Error loading available performers:', error);
      }
    };
    loadAvailablePerformers();
  }, []);

  const movePerformer = (index, direction) => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === performers.length - 1) return;

    const newPerformers = [...performers];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    const temp = newPerformers[index];
    newPerformers[index] = newPerformers[swapIndex];
    newPerformers[swapIndex] = temp;
    setPerformers(newPerformers);
  };

  const removePerformer = (performer, index) => {
    Alert.alert(
      'Remove Performer',
      `Are you sure you want to remove "${performer.name}" from this show?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            const newPerformers = performers.filter((_, i) => i !== index);
            setPerformers(newPerformers);
          },
        },
      ]
    );
  };

  const addPerformer = (performer) => {
    if (!performers.find(p => p.id === performer.id)) {
      setPerformers([...performers, performer]);
      setPerformerSearchText('');
      setShowPerformerPicker(false);
    } else {
      Alert.alert('Already Added', 'That performer is already on this show!');
    }
  };

  const filteredAvailablePerformers = availablePerformers.filter(p =>
    p.name.toLowerCase().includes(performerSearchText.toLowerCase())
  );

  // Expose performers state to parent
  useImperativeHandle(ref, () => ({
    performers,
    setPerformers,
  }));

  const handleAddPerformer = () => {
    setShowPerformerPicker(true);
    setPerformerSearchText('');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (onSavePerformers) {
        const result = await onSavePerformers(performers);
        if (result && result.success === true) {
          setSaving(false);
          onBack();
          return;
        } else {
          // Error occurred - show error message and stay on page
          setSaving(false);
          const errorMessage = result?.error || 'Failed to save performers';
          Alert.alert('Error Saving Performers', errorMessage);
          return;
        }
      }
      
      // If no save handler, try to save directly
      if (showId) {
        const showData = {
          name: page1Data?.name || loadedShow?.name,
          code: page1Data?.code || loadedShow?.code || null,
          venue_id: page1Data?.venueId || loadedShow?.venue_id || null,
          performer_ids: performers.length > 0 ? performers.map(p => p.id) : null,
        };
        
        const result = await dispatch(updateShow(showId, showData));
        if (result.success) {
          const updatedShow = await dispatch(loadShow(showId));
          if (updatedShow) {
            setSaving(false);
            onBack();
            return;
          }
        } else {
          // Error occurred - show error message and stay on page
          setSaving(false);
          const errorMessage = result.error || 'Failed to save performers';
          Alert.alert('Error Saving Performers', errorMessage);
          return;
        }
      }
      
      setSaving(false);
      onBack();
    } catch (error) {
      setSaving(false);
      Alert.alert('Error', error.message || 'Failed to save performers');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loading}>Loading performers...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Performers</Text>
        </View>
        <View style={styles.headerRight}>
          <Image 
            source={require('../../assets/hi_logo.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
      </View>

      {performers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>You do not have any performers.</Text>
          <Text style={styles.emptyText}>Click the + Add New button to add one!</Text>
        </View>
      ) : (
        <FlatList
          data={performers}
          keyExtractor={(item, index) => `${item.id || index}-${index}`}
          renderItem={({ item, index }) => (
            <View style={[styles.performerItem, index % 2 === 0 ? styles.performerItemEven : styles.performerItemOdd]}>
              <View style={styles.performerControls}>
                <TouchableOpacity
                  style={[styles.controlButton, index === 0 && styles.controlButtonDisabled]}
                  onPress={() => movePerformer(index, 'up')}
                  disabled={index === 0}
                >
                  <Text style={styles.controlButtonText}>⬆️</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.controlButton, index === performers.length - 1 && styles.controlButtonDisabled]}
                  onPress={() => movePerformer(index, 'down')}
                  disabled={index === performers.length - 1}
                >
                  <Text style={styles.controlButtonText}>⬇️</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.performerInfo}>
                <Text style={styles.performerNumber}>{index + 1}.</Text>
                <View style={styles.performerDetails}>
                  <Text style={styles.performerName}>{item.name}</Text>
                </View>
              </View>
              <View style={styles.performerActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => removePerformer(item, index)}
                >
                  <Text style={styles.actionButtonText}>❌</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      <Modal
        visible={showPerformerPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowPerformerPicker(false);
          setPerformerSearchText('');
        }}
      >
        <View style={styles.pickerModal}>
          <View style={styles.pickerContent}>
            <Text style={styles.pickerTitle}>Search and Add Performer</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search performers..."
              value={performerSearchText}
              onChangeText={setPerformerSearchText}
              autoFocus
            />
            <FlatList
              data={filteredAvailablePerformers}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.performerOption}
                  onPress={() => addPerformer(item)}
                >
                  <Text style={styles.performerOptionText}>{item.name}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                performerSearchText.length > 0 ? (
                  <Text style={styles.emptyText}>No performers found</Text>
                ) : (
                  <Text style={styles.emptyText}>Start typing to search...</Text>
                )
              }
            />
            <TouchableOpacity
              style={styles.closePickerButton}
              onPress={() => {
                setShowPerformerPicker(false);
                setPerformerSearchText('');
              }}
            >
              <Text style={styles.closePickerButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddPerformer}
        >
          <Text style={styles.addButtonText}>+ Add New</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.backButton, saving && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.backButtonText}>
            {saving ? 'Saving...' : 'Save & Done'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: COLORS.TEAL,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  logo: {
    width: 48,
    height: 48,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
  performerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  performerItemEven: {
    backgroundColor: '#f9f9f9',
  },
  performerItemOdd: {
    backgroundColor: '#fff',
  },
  performerControls: {
    flexDirection: 'row',
    marginRight: 15,
  },
  controlButton: {
    padding: 5,
    marginRight: 5,
  },
  controlButtonDisabled: {
    opacity: 0.3,
  },
  controlButtonText: {
    fontSize: 18,
  },
  performerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  performerNumber: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 10,
    minWidth: 30,
  },
  performerDetails: {
    flex: 1,
  },
  performerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  performerActions: {
    flexDirection: 'row',
    marginLeft: 10,
  },
  actionButton: {
    padding: 10,
    marginLeft: 5,
  },
  actionButtonText: {
    fontSize: 18,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  backButton: {
    backgroundColor: '#007AFF',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  loading: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
  },
  pickerModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxHeight: '70%',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    color: '#333',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
    backgroundColor: '#fff',
  },
  performerOption: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  performerOptionText: {
    fontSize: 16,
    color: '#333',
  },
  closePickerButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15,
  },
  closePickerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ShowFormPage6;

