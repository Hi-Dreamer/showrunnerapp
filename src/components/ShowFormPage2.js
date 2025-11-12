import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Switch, FlatList, Modal, Platform, Image } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useDispatch, useSelector } from 'react-redux';
import { updateShow, loadShow, deleteShow } from '../actions/showActions';
import ApiService from '../services/api';
import { DateUtils } from '../utils/dateUtils';

const ShowFormPage2 = ({ showId, page1Data, onBack, onSave, onNavigateToMessaging, onNavigateToSlides }) => {
  const dispatch = useDispatch();
  const { currentShow, hiModules } = useSelector((state) => state.show);

  const [showDatetime, setShowDatetime] = useState(null);
  const [showEndDatetime, setShowEndDatetime] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(null);
  const [selectedPerformers, setSelectedPerformers] = useState([]);
  const [availablePerformers, setAvailablePerformers] = useState([]);
  const [performerSearchText, setPerformerSearchText] = useState('');
  const [showPerformerPicker, setShowPerformerPicker] = useState(false);
  const [tvTheme, setTvTheme] = useState('light');
  const [tvScoreVisible, setTvScoreVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadedShow, setLoadedShow] = useState(null); // Store loaded show data for hi_module checks


  // Check if a hi_module is selected
  // When editing, check loadedShow.hi_module_ids; when creating, check page1Data.selectedHiModules
  const hiModuleSelected = (moduleNames) => {
    if (!hiModules) return false;
    
    // Get the selected module IDs - either from page1Data (new show) or loadedShow (editing)
    let selectedModuleIds = [];
    if (showId && loadedShow?.hi_module_ids) {
      // Editing mode - use the show's actual hi_module_ids
      selectedModuleIds = loadedShow.hi_module_ids;
    } else if (page1Data?.selectedHiModules) {
      // New show mode - use page1Data
      selectedModuleIds = page1Data.selectedHiModules;
    } else {
      return false;
    }
    
    const moduleIds = hiModules
      .filter(m => moduleNames.includes(m.name))
      .map(m => m.id);
    return moduleIds.some(id => selectedModuleIds.includes(id));
  };

  useEffect(() => {
    if (showId) {
      setLoading(true);
      dispatch(loadShow(showId)).then(async (show) => {
        if (show) {
          // Store the loaded show for hi_module checks
          setLoadedShow(show);
          
          // If we have page1Data from a new show, use those dates if show doesn't have them yet
          if (page1Data && (!show.show_datetime || !show.show_end_datetime)) {
            const startDate = DateUtils.getNextHour();
            const endDate = DateUtils.getNextEndHour(startDate);
            setShowDatetime(startDate);
            setShowEndDatetime(endDate);
          } else {
            if (show.show_datetime) {
              setShowDatetime(new Date(show.show_datetime));
            }
            if (show.show_end_datetime) {
              setShowEndDatetime(new Date(show.show_end_datetime));
            }
          }
          setTvTheme(show.tv_theme || 'light');
          setTvScoreVisible(show.tv_score_visible || false);
          
          // Load performers
          if (show.performer_ids && show.performer_ids.length > 0) {
            try {
              const api = ApiService.getClient();
              const performers = await api.performers.get({ show_id: showId });
              setSelectedPerformers(performers || []);
            } catch (error) {
              console.error('Error loading performers:', error);
            }
          }
        }
        setLoading(false);
      });
    } else {
      // New show - set default dates
      const startDate = DateUtils.getNextHour();
      const endDate = DateUtils.getNextEndHour(startDate);
      setShowDatetime(startDate);
      setShowEndDatetime(endDate);
    }
  }, [showId, dispatch]);

  // Search performers
  useEffect(() => {
    if (performerSearchText.length > 0) {
      const timeout = setTimeout(async () => {
        try {
          const api = ApiService.getClient();
          const performers = await api.performers.get({ search: performerSearchText });
          setAvailablePerformers(performers || []);
        } catch (error) {
          console.error('Error searching performers:', error);
          setAvailablePerformers([]);
        }
      }, 250);
      return () => clearTimeout(timeout);
    } else {
      setAvailablePerformers([]);
    }
  }, [performerSearchText]);

  const addPerformer = async (performer) => {
    if (!selectedPerformers.find(p => p.id === performer.id)) {
      const newPerformers = [...selectedPerformers, performer];
      setSelectedPerformers(newPerformers);
      setPerformerSearchText('');
      setShowPerformerPicker(false);
      
      // Auto-save performers if we're editing an existing show
      if (showId) {
        try {
          const showData = {
            name: page1Data.name,
            code: page1Data.code || null,
            venue_id: page1Data.venueId > 0 ? page1Data.venueId : null,
            show_datetime: showDatetime ? DateUtils.formatForAPI(showDatetime) : (loadedShow?.show_datetime ? DateUtils.formatForAPI(new Date(loadedShow.show_datetime)) : null),
            show_end_datetime: showEndDatetime ? DateUtils.formatForAPI(showEndDatetime) : (loadedShow?.show_end_datetime ? DateUtils.formatForAPI(new Date(loadedShow.show_end_datetime)) : null),
            performer_ids: newPerformers.length > 0 ? newPerformers.map(p => p.id) : null,
            tv_theme: tvTheme,
            tv_score_visible: tvScoreVisible,
          };
          
          // Include messaging fields if they exist on loadedShow
          if (loadedShow) {
            showData.text_performing_tv = loadedShow.text_performing_tv || null;
            showData.text_performing_mobile = loadedShow.text_performing_mobile || null;
            showData.text_voting_prompt_tv = loadedShow.text_voting_prompt_tv || null;
            showData.text_voting_prompt_mobile = loadedShow.text_voting_prompt_mobile || null;
            showData.text_voting_done_mobile = loadedShow.text_voting_done_mobile || null;
            showData.text_voting_winner_tv = loadedShow.text_voting_winner_tv || null;
            showData.text_voting_winner_mobile = loadedShow.text_voting_winner_mobile || null;
            showData.text_draw_get_ready_tv = loadedShow.text_draw_get_ready_tv || null;
            showData.text_draw_get_ready_mobile = loadedShow.text_draw_get_ready_mobile || null;
          }
          
          await dispatch(updateShow(showId, showData));
          // Reload show to get updated performer_ids
          const updatedShow = await dispatch(loadShow(showId));
          if (updatedShow) {
            setLoadedShow(updatedShow);
          }
        } catch (error) {
          console.error('Error auto-saving performer:', error);
          // Don't show error to user - this is a background save
          // Revert the performer addition on error
          setSelectedPerformers(selectedPerformers);
        }
      }
    } else {
      Alert.alert('Already Added', 'That performer is already on this show!');
    }
  };

  const removePerformer = async (performerId) => {
    const newPerformers = selectedPerformers.filter(p => p.id !== performerId);
    setSelectedPerformers(newPerformers);
    
    // Auto-save performers if we're editing an existing show
    if (showId) {
      try {
        const showData = {
          name: page1Data.name,
          code: page1Data.code || null,
          venue_id: page1Data.venueId > 0 ? page1Data.venueId : null,
          show_datetime: showDatetime ? DateUtils.formatForAPI(showDatetime) : (loadedShow?.show_datetime ? DateUtils.formatForAPI(new Date(loadedShow.show_datetime)) : null),
          show_end_datetime: showEndDatetime ? DateUtils.formatForAPI(showEndDatetime) : (loadedShow?.show_end_datetime ? DateUtils.formatForAPI(new Date(loadedShow.show_end_datetime)) : null),
          performer_ids: newPerformers.length > 0 ? newPerformers.map(p => p.id) : null,
          tv_theme: tvTheme,
          tv_score_visible: tvScoreVisible,
        };
        
        // Include messaging fields if they exist on loadedShow
        if (loadedShow) {
          showData.text_performing_tv = loadedShow.text_performing_tv || null;
          showData.text_performing_mobile = loadedShow.text_performing_mobile || null;
          showData.text_voting_prompt_tv = loadedShow.text_voting_prompt_tv || null;
          showData.text_voting_prompt_mobile = loadedShow.text_voting_prompt_mobile || null;
          showData.text_voting_done_mobile = loadedShow.text_voting_done_mobile || null;
          showData.text_voting_winner_tv = loadedShow.text_voting_winner_tv || null;
          showData.text_voting_winner_mobile = loadedShow.text_voting_winner_mobile || null;
          showData.text_draw_get_ready_tv = loadedShow.text_draw_get_ready_tv || null;
          showData.text_draw_get_ready_mobile = loadedShow.text_draw_get_ready_mobile || null;
        }
        
        await dispatch(updateShow(showId, showData));
        // Reload show to get updated performer_ids
        const updatedShow = await dispatch(loadShow(showId));
        if (updatedShow) {
          setLoadedShow(updatedShow);
        }
      } catch (error) {
        console.error('Error auto-saving performer removal:', error);
        // Don't show error to user - this is a background save
        // Revert the performer removal on error
        setSelectedPerformers(selectedPerformers);
      }
    }
  };

  const handleDeleteShow = async () => {
    if (!showId) {
      // If no showId, just go back (new show that hasn't been saved yet)
      onBack();
      return;
    }

    Alert.alert(
      'Delete Show',
      `Are you sure you want to delete this show? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await dispatch(deleteShow(showId));
            if (result.success) {
              // Return to shows list after successful deletion
              if (onBack) {
                onBack();
              }
            } else {
              Alert.alert('Error', result.error || 'Failed to delete show');
            }
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    if (!showDatetime || !showEndDatetime) {
      Alert.alert('Error', 'Please set both start and end date/time');
      return;
    }

    if (showDatetime >= showEndDatetime) {
      Alert.alert('Error', 'End date/time must be after start date/time');
      return;
    }

    setSaving(true);

    const showData = {
      name: page1Data.name,
      code: page1Data.code || null,
      venue_id: page1Data.venueId > 0 ? page1Data.venueId : null,
      show_datetime: DateUtils.formatForAPI(showDatetime),
      show_end_datetime: DateUtils.formatForAPI(showEndDatetime),
      // Note: hi_modules are only set during creation, not updates
      performer_ids: selectedPerformers.length > 0 ? selectedPerformers.map(p => p.id) : null,
      tv_theme: tvTheme,
      tv_score_visible: tvScoreVisible,
    };

    try {
      // Add timeout wrapper
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout - the server took too long to respond')), 30000); // 30 second timeout
      });

      const savePromise = dispatch(updateShow(showId, showData));
      
      const result = await Promise.race([savePromise, timeoutPromise]);
      setSaving(false);

      if (result && result.success) {
        if (onSave) {
          onSave(result.show);
        }
      } else if (result) {
        Alert.alert('Error', result.error || 'Failed to save show');
      }
    } catch (error) {
      setSaving(false);
      console.error('Show save error:', error);
      const errorMessage = error.message || 'Failed to save show';
      Alert.alert('Error', errorMessage);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loading}>Loading show...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Show Details</Text>
          <Image 
            source={require('../../assets/hi_logo.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Start Date & Time *</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker('start')}
          >
            <Text style={styles.dateButtonText}>{DateUtils.formatForDisplay(showDatetime)}</Text>
          </TouchableOpacity>
          {showDatePicker === 'start' && (
            <DateTimePicker
              value={showDatetime || DateUtils.getNextHour()}
              mode="datetime"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, selectedDate) => {
                if (Platform.OS === 'android') {
                  setShowDatePicker(null);
                }
                if (event.type === 'set' && selectedDate) {
                  setShowDatetime(selectedDate);
                  if (!showEndDatetime || selectedDate >= showEndDatetime) {
                    setShowEndDatetime(DateUtils.getNextEndHour(selectedDate));
                  }
                } else if (event.type === 'dismissed') {
                  setShowDatePicker(null);
                }
              }}
            />
          )}
          {Platform.OS === 'ios' && showDatePicker === 'start' && (
            <View style={styles.iosPickerButtons}>
              <TouchableOpacity
                style={styles.iosPickerButton}
                onPress={() => setShowDatePicker(null)}
              >
                <Text style={styles.iosPickerButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>End Date & Time *</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker('end')}
          >
            <Text style={styles.dateButtonText}>{DateUtils.formatForDisplay(showEndDatetime)}</Text>
          </TouchableOpacity>
          {showDatePicker === 'end' && (
            <DateTimePicker
              value={showEndDatetime || DateUtils.getNextEndHour()}
              mode="datetime"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, selectedDate) => {
                if (Platform.OS === 'android') {
                  setShowDatePicker(null);
                }
                if (event.type === 'set' && selectedDate) {
                  if (selectedDate <= showDatetime) {
                    Alert.alert('Error', 'End time must be after start time');
                    setShowDatePicker(null);
                    return;
                  }
                  setShowEndDatetime(selectedDate);
                } else if (event.type === 'dismissed') {
                  setShowDatePicker(null);
                }
              }}
              minimumDate={showDatetime ? new Date(showDatetime.getTime() + 60000) : undefined}
            />
          )}
          {Platform.OS === 'ios' && showDatePicker === 'end' && (
            <View style={styles.iosPickerButtons}>
              <TouchableOpacity
                style={styles.iosPickerButton}
                onPress={() => setShowDatePicker(null)}
              >
                <Text style={styles.iosPickerButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {(hiModuleSelected(['Performing', 'Voting', 'Extended Voting']) || (showId && selectedPerformers.length > 0)) && (
          <View style={styles.field}>
            <Text style={styles.sectionTitle}>Performers (optional)</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowPerformerPicker(true)}
            >
              <Text style={styles.addButtonText}>+ Add Performer</Text>
            </TouchableOpacity>
            
            {selectedPerformers.length > 0 && (
              <View style={styles.performerList}>
                {selectedPerformers.map((performer) => (
                  <View key={performer.id} style={styles.performerItem}>
                    <Text style={styles.performerName}>{performer.name}</Text>
                    <TouchableOpacity
                      onPress={() => removePerformer(performer.id)}
                      style={styles.removeButton}
                    >
                      <Text style={styles.removeButtonText}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
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
                    data={availablePerformers}
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
          </View>
        )}

        <View style={styles.field}>
          <Text style={styles.sectionTitle}>TV Settings</Text>
          <View style={styles.subField}>
            <Text style={styles.label}>TV Theme</Text>
            <View style={styles.radioGroup}>
              <TouchableOpacity
                style={[styles.radio, tvTheme === 'light' && styles.radioSelected]}
                onPress={() => setTvTheme('light')}
              >
                <Text style={styles.radioText}>Light</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.radio, tvTheme === 'dark' && styles.radioSelected]}
                onPress={() => setTvTheme('dark')}
              >
                <Text style={styles.radioText}>Dark</Text>
              </TouchableOpacity>
            </View>
          </View>
          {hiModuleSelected(['Voting', 'Extended Voting']) && (
            <View style={styles.subField}>
              <View style={styles.switchRow}>
                <Text style={styles.label}>Show Score on TV</Text>
                <Switch
                  value={tvScoreVisible}
                  onValueChange={setTvScoreVisible}
                />
              </View>
            </View>
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.sectionTitle}>Additional Options</Text>
          {hiModuleSelected(['Performing', 'Voting', 'Extended Voting', 'Draw']) && onNavigateToMessaging && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={onNavigateToMessaging}
            >
              <Text style={styles.actionButtonText}>Messaging Customization</Text>
            </TouchableOpacity>
          )}
          {(hiModuleSelected(['Messaging']) || (showId && loadedShow?.custom_messages && loadedShow.custom_messages.length > 0)) && onNavigateToSlides && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={onNavigateToSlides}
            >
              <Text style={styles.actionButtonText}>Add/Edit Slides</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.deleteButton]}
            onPress={handleDeleteShow}
            disabled={saving}
          >
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.saveButton, saving && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>
              {saving ? 'Saving...' : 'Save Show'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  form: {
    padding: 20,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    flex: 1,
  },
  logo: {
    width: 48,
    height: 48,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  field: {
    marginBottom: 30,
  },
  subField: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  subLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  dateButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    backgroundColor: '#fff',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#333',
  },
  iosPickerButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  iosPickerButton: {
    padding: 10,
    paddingHorizontal: 20,
  },
  iosPickerButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  performerList: {
    marginTop: 12,
  },
  performerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 8,
  },
  performerName: {
    fontSize: 16,
    flex: 1,
  },
  removeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ff4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  pickerModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
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
    fontWeight: 'bold',
    marginBottom: 12,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  performerOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  performerOptionText: {
    fontSize: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    padding: 20,
  },
  closePickerButton: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  closePickerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  radioGroup: {
    flexDirection: 'row',
  },
  radio: {
    flex: 1,
    padding: 15,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 8,
    marginRight: 10,
    alignItems: 'center',
  },
  radioSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#E3F2FD',
  },
  radioText: {
    fontSize: 16,
    color: '#333',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 20,
    marginBottom: 40,
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#ffebee',
    marginRight: 10,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    marginLeft: 10,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  deleteButtonText: {
    color: '#d32f2f',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  actionButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loading: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
  },
});

export default ShowFormPage2;

