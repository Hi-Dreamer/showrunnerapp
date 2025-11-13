import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Switch, FlatList, Modal, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useDispatch, useSelector } from 'react-redux';
import { updateShow, createShow, loadShow, deleteShow, loadShows, loadExpiredShows } from '../actions/showActions';
import ApiService from '../services/api';
import { DateUtils } from '../utils/dateUtils';
import PageHeader from './PageHeader';
import { COLORS } from '../constants/theme';

const ShowFormPage2 = ({ showId, page1Data, copyShowData, initialPerformers, onBack, onSave, onNavigateToMessaging, onNavigateToSlides, onNavigateToPerformers }) => {
  const dispatch = useDispatch();
  const { currentShow, hiModules } = useSelector((state) => state.show);
  const { user } = useSelector((state) => state.auth);

  const [showDatetime, setShowDatetime] = useState(null);
  const [showEndDatetime, setShowEndDatetime] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(null);
  const [selectedPerformers, setSelectedPerformers] = useState([]);
  const [tvTheme, setTvTheme] = useState('light');
  const [tvScoreVisible, setTvScoreVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadedShow, setLoadedShow] = useState(null); // Store loaded show data for hi_module checks
  const [hasOverlap, setHasOverlap] = useState(false);
  const [overlapWarning, setOverlapWarning] = useState('');
  const overlapCheckTimeoutRef = useRef(null);
  const isCheckingOverlapRef = useRef(false);
  const checkForOverlapsRef = useRef(null);
  const hasInitialCheckRef = useRef(false);


  // Check if a hi_module is selected
  // When editing, check loadedShow.hi_module_ids; when creating/copying, check page1Data.selectedHiModules
  const hiModuleSelected = (moduleNames) => {
    if (!hiModules) return false;
    
    // Get the selected module IDs - either from page1Data (new show/copy) or loadedShow (editing)
    let selectedModuleIds = [];
    if (showId && loadedShow?.hi_module_ids) {
      // Editing mode - use the show's actual hi_module_ids
      selectedModuleIds = loadedShow.hi_module_ids;
    } else if (copyShowData?.hi_module_ids) {
      // Copying mode - use copyShowData
      selectedModuleIds = copyShowData.hi_module_ids;
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

  // Check if a show is an Extended Voting show (by duration > 12 hours)
  const isExtendedVotingShow = (show) => {
    if (!show) return false;
    
    // Check if show duration is > 12 hours (Extended Voting shows)
    if (show.show_datetime && show.show_end_datetime) {
      const startDate = new Date(show.show_datetime);
      const endDate = new Date(show.show_end_datetime);
      const durationHours = (endDate - startDate) / (1000 * 60 * 60);
      if (durationHours > 12) {
        return true;
      }
    }
    
    // Fallback: Check hi_module_ids if available
    if (hiModules && show.hi_module_ids) {
      const extendedVotingModule = hiModules.find(m => m.name === 'Extended Voting');
      if (extendedVotingModule && show.hi_module_ids.includes(extendedVotingModule.id)) {
        return true;
      }
    }
    
    return false;
  };

  // Check if current show would be Extended Voting (> 12 hours)
  const isCurrentShowExtendedVoting = () => {
    if (!showDatetime || !showEndDatetime) return false;
    const durationHours = (showEndDatetime - showDatetime) / (1000 * 60 * 60);
    return durationHours > 12;
  };

  // Count Extended Voting shows from a list
  const countExtendedVotingShows = (allShows) => {
    if (!allShows || !Array.isArray(allShows)) return 0;
    
    let count = 0;
    for (const show of allShows) {
      // Skip the current show if editing
      if (showId && show.id === showId) {
        continue;
      }
      
      if (show.show_datetime && show.show_end_datetime) {
        const startDate = new Date(show.show_datetime);
        const endDate = new Date(show.show_end_datetime);
        const durationHours = (endDate - startDate) / (1000 * 60 * 60);
        if (durationHours > 12) {
          count++;
        }
      }
    }
    return count;
  };

  // Check if two date ranges overlap
  const dateRangesOverlap = (start1, end1, start2, end2) => {
    if (!start1 || !end1 || !start2 || !end2) return false;
    // Two ranges overlap if: start1 < end2 && start2 < end1
    return new Date(start1) < new Date(end2) && new Date(start2) < new Date(end1);
  };

  // Check for overlapping shows
  const checkForOverlaps = useCallback(async (startDate, endDate) => {
    if (!startDate || !endDate) {
      setHasOverlap(false);
      setOverlapWarning('');
      return;
    }

    // Prevent concurrent overlap checks
    if (isCheckingOverlapRef.current) {
      return;
    }

    isCheckingOverlapRef.current = true;

    try {
      // Load all shows (both active and expired) to check for overlaps
      const api = ApiService.getClient();
      const [activeShows, expiredShows] = await Promise.all([
        api.shows.get({ date_filter: 'upcoming', page: 1 }),
        api.shows.get({ date_filter: 'past', page: 1 }),
      ]);
      
      const allShowsToCheck = [...(activeShows || []), ...(expiredShows || [])];
      // Don't update allShows state as it's not needed and could cause re-renders

      // Check if current show would be Extended Voting (> 12 hours)
      const durationHours = (endDate - startDate) / (1000 * 60 * 60);
      const wouldBeExtendedVoting = durationHours > 12;

      // Check extended voting limit if this would be an Extended Voting show
      if (wouldBeExtendedVoting) {
        const extendedVotingShowsAllowed = user?.extended_voting_shows_allowed || 0;
        if (extendedVotingShowsAllowed > 0) {
          const currentExtendedVotingCount = countExtendedVotingShows(allShowsToCheck);
          
          // If we're editing an existing Extended Voting show, don't count it
          const isEditingExtendedVoting = showId && isCurrentShowExtendedVoting();
          const adjustedCount = isEditingExtendedVoting ? currentExtendedVotingCount : currentExtendedVotingCount;
          
          if (adjustedCount >= extendedVotingShowsAllowed) {
            setHasOverlap(true);
            setOverlapWarning(
              `Warning: You have reached your limit of ${extendedVotingShowsAllowed} Extended Voting show(s). This show exceeds 12 hours and would exceed your allowed limit.`
            );
            isCheckingOverlapRef.current = false;
            return;
          }
        } else {
          // User doesn't have permission for Extended Voting shows
          setHasOverlap(true);
          setOverlapWarning(
            'Warning: This show exceeds 12 hours. Extended Voting shows require special permissions. Please reduce the duration to 12 hours or less.'
          );
          isCheckingOverlapRef.current = false;
          return;
        }
      }

      // Check for overlaps with other shows
      for (const otherShow of allShowsToCheck) {
        // Skip the current show if editing
        if (showId && otherShow.id === showId) {
          continue;
        }

        // Skip Extended Voting shows (they can overlap) - check by duration > 12 hours
        if (isExtendedVotingShow(otherShow)) {
          continue;
        }

        // If current show is Extended Voting, it can overlap with anything
        if (wouldBeExtendedVoting) {
          continue;
        }

        // Check if date ranges overlap
        if (otherShow.show_datetime && otherShow.show_end_datetime) {
          if (dateRangesOverlap(startDate, endDate, otherShow.show_datetime, otherShow.show_end_datetime)) {
            setHasOverlap(true);
            setOverlapWarning(
              `Warning: This show overlaps with "${otherShow.name}" (${new Date(otherShow.show_datetime).toLocaleString()} - ${new Date(otherShow.show_end_datetime).toLocaleString()}). Please change the date to avoid conflicts.`
            );
            return;
          }
        }
      }

      // No overlaps found
      setHasOverlap(false);
      setOverlapWarning('');
    } catch (error) {
      console.error('Error checking for overlaps:', error);
      // On error, don't block the user, but log it
      setHasOverlap(false);
      setOverlapWarning('');
    } finally {
      isCheckingOverlapRef.current = false;
    }
  }, [showId, loadedShow, copyShowData, page1Data, hiModules, user, showDatetime, showEndDatetime]);

  // Store the latest checkForOverlaps function in a ref
  checkForOverlapsRef.current = checkForOverlaps;

  useEffect(() => {
    if (initialPerformers && initialPerformers.length > 0) {
      setSelectedPerformers(initialPerformers);
    }
  }, [initialPerformers]);

  // Reset initial check flag when showId or copyShowData changes
  useEffect(() => {
    hasInitialCheckRef.current = false;
  }, [showId, copyShowData]);

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
            // Check for overlaps after setting dates - only on initial load
            if (!hasInitialCheckRef.current) {
              hasInitialCheckRef.current = true;
              setTimeout(() => {
                if (checkForOverlapsRef.current) {
                  checkForOverlapsRef.current(startDate, endDate);
                }
              }, 100);
            }
          } else {
            if (show.show_datetime) {
              setShowDatetime(new Date(show.show_datetime));
            }
            if (show.show_end_datetime) {
              setShowEndDatetime(new Date(show.show_end_datetime));
            }
            // Check for overlaps after setting dates (debounced) - only on initial load
            if (show.show_datetime && show.show_end_datetime && !hasInitialCheckRef.current) {
              hasInitialCheckRef.current = true;
              setTimeout(() => {
                if (checkForOverlapsRef.current) {
                  checkForOverlapsRef.current(new Date(show.show_datetime), new Date(show.show_end_datetime));
                }
              }, 100);
            }
          }
          setTvTheme(show.tv_theme || 'light');
          setTvScoreVisible(show.tv_score_visible || false);
          
          // Load performers only if not provided via props
          if (!initialPerformers && show.performer_ids && show.performer_ids.length > 0) {
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
    } else if (copyShowData) {
      // Copying a show - pre-populate from copyShowData (which should have all data loaded)
      // Set loading to false immediately since we have the data
      setLoading(false);
      setLoadedShow(copyShowData);
      
      let startDate, endDate;
      if (copyShowData.show_datetime) {
        startDate = new Date(copyShowData.show_datetime);
        setShowDatetime(startDate);
      } else {
        startDate = DateUtils.getNextHour();
        setShowDatetime(startDate);
      }
      
      if (copyShowData.show_end_datetime) {
        endDate = new Date(copyShowData.show_end_datetime);
        setShowEndDatetime(endDate);
      } else {
        endDate = DateUtils.getNextEndHour(copyShowData.show_datetime ? new Date(copyShowData.show_datetime) : null);
        setShowEndDatetime(endDate);
      }
      
      setTvTheme(copyShowData.tv_theme || 'light');
      setTvScoreVisible(copyShowData.tv_score_visible || false);
      
      // Use performers from copyShowData - should already be loaded in ShowsList
      if (copyShowData.performers && Array.isArray(copyShowData.performers)) {
        setSelectedPerformers(copyShowData.performers);
      } else if (copyShowData.performer_ids && copyShowData.performer_ids.length > 0) {
        // Fallback: try to load performers if not already included
        const loadPerformers = async () => {
          try {
            const api = ApiService.getClient();
            const originalShowId = copyShowData.id;
            if (originalShowId) {
              const performers = await api.performers.get({ show_id: originalShowId });
              setSelectedPerformers(performers || []);
            }
          } catch (error) {
            console.error('Error loading performers for copy:', error);
          }
        };
        loadPerformers();
      }

      // Check for overlaps after setting dates - only on initial load
      if (startDate && endDate && !hasInitialCheckRef.current) {
        hasInitialCheckRef.current = true;
        setTimeout(() => {
          if (checkForOverlapsRef.current) {
            checkForOverlapsRef.current(startDate, endDate);
          }
        }, 100);
      }
    } else {
      // New show - set default dates
      const startDate = DateUtils.getNextHour();
      const endDate = DateUtils.getNextEndHour(startDate);
      setShowDatetime(startDate);
      setShowEndDatetime(endDate);
      // Check for overlaps after setting dates - only on initial load
      if (!hasInitialCheckRef.current) {
        hasInitialCheckRef.current = true;
        setTimeout(() => {
          if (checkForOverlapsRef.current) {
            checkForOverlapsRef.current(startDate, endDate);
          }
        }, 100);
      }
    }
  }, [showId, copyShowData, dispatch]);

  // Check for overlaps when dates change (debounced) - but skip initial load
  useEffect(() => {
    // Skip if we haven't done the initial check yet (let the initial load useEffect handle it)
    if (!hasInitialCheckRef.current) {
      return;
    }
    
    if (showDatetime && showEndDatetime) {
      // Use debounced check - clear any pending timeout first
      if (overlapCheckTimeoutRef.current) {
        clearTimeout(overlapCheckTimeoutRef.current);
      }
      
      // Set a new timeout to check after 500ms of no changes
      overlapCheckTimeoutRef.current = setTimeout(() => {
        if (checkForOverlapsRef.current) {
          checkForOverlapsRef.current(showDatetime, showEndDatetime);
        }
      }, 500);
    }
    
    // Cleanup timeout on unmount or when dates change
    return () => {
      if (overlapCheckTimeoutRef.current) {
        clearTimeout(overlapCheckTimeoutRef.current);
      }
    };
  }, [showDatetime, showEndDatetime]);

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

    // Button should be disabled if hasOverlap, but double-check just in case
    if (hasOverlap) {
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

      let savePromise;
      if (showId) {
        // Updating existing show
        savePromise = dispatch(updateShow(showId, showData));
      } else {
        // Creating new show (either new or copy)
        // Include hi_modules from page1Data for creation
        const createData = {
          ...showData,
          hi_modules: page1Data?.selectedHiModules || [],
        };
        savePromise = dispatch(createShow(createData));
      }
      
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

  // Don't show loading when copying - we have the data already
  if (loading && !copyShowData) {
    return (
      <View style={styles.container}>
        <Text style={styles.loading}>Loading show...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <PageHeader
          title={loadedShow?.name || page1Data?.name || 'Show Details'}
          showLogo={true}
          logoSize="small"
          titleFontSize="medium"
        />

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
                    const newEndDate = DateUtils.getNextEndHour(selectedDate);
                    setShowEndDatetime(newEndDate);
                    // Overlap check will be handled by the useEffect watching dates
                  }
                  // Overlap check will be handled by the useEffect watching dates
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
                  // Overlap check will be handled by the useEffect watching dates
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

        {hasOverlap && overlapWarning && (
          <View style={styles.field}>
            <View style={styles.warningContainer}>
              <Text style={styles.warningText}>{overlapWarning}</Text>
            </View>
          </View>
        )}

        {(hiModuleSelected(['Performing', 'Voting', 'Extended Voting']) || (showId && selectedPerformers.length > 0)) && (
          <View style={styles.field}>
            <View style={styles.performersContainer}>
              <View style={styles.performersTextContainer}>
                <Text style={styles.performersText}>
                  <Text style={styles.performersLabel}>Performers: </Text>
                  {selectedPerformers.length > 0 ? (
                    selectedPerformers.map((performer, index) => {
                      const isFirst = index === 0;
                      const isLast = index === selectedPerformers.length - 1;
                      const isMiddle = !isFirst && !isLast;
                      
                      return (
                        <Text key={performer.id || index}>
                          {isFirst && <Text style={styles.hostLabel}>Host: </Text>}
                          {isMiddle && <Text style={styles.numberLabel}>{index + 1}. </Text>}
                          {isLast && selectedPerformers.length > 1 && <Text style={styles.hlLabel}>H/L: </Text>}
                          {isLast && selectedPerformers.length === 1 && <Text style={styles.hlLabel}> H/L: </Text>}
                          <Text style={styles.performersList}>{performer.name}</Text>
                          {index < selectedPerformers.length - 1 && <Text>, </Text>}
                        </Text>
                      );
                    })
                  ) : (
                    <Text style={styles.performersList}>No performers added</Text>
                  )}
                </Text>
              </View>
              {onNavigateToPerformers && (
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={onNavigateToPerformers}
                >
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        <View style={styles.field}>
          <Text style={styles.sectionTitle}>TV Settings</Text>
          <View style={styles.subField}>
            <View style={styles.switchRow}>
              <Text style={styles.label}>TV Theme</Text>
              <View style={styles.toggleWithLabels}>
                <Text style={styles.themeLabel}>L</Text>
                <View style={{ marginHorizontal: 12 }}>
                  <Switch
                    value={tvTheme === 'dark'}
                    onValueChange={(value) => setTvTheme(value ? 'dark' : 'light')}
                  />
                </View>
                <Text style={styles.themeLabel}>D</Text>
              </View>
            </View>
          </View>
          {hiModuleSelected(['Voting', 'Extended Voting']) && (
            <View style={styles.subField}>
              <View style={styles.switchRow}>
                <Text style={styles.label}>Show Score on TV</Text>
                <View style={styles.toggleWithLabels}>
                  <Text style={styles.themeLabel}>N</Text>
                  <View style={{ marginHorizontal: 12 }}>
                    <Switch
                      value={tvScoreVisible}
                      onValueChange={setTvScoreVisible}
                    />
                  </View>
                  <Text style={styles.themeLabel}>Y</Text>
                </View>
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
          {(hiModuleSelected(['Messaging']) || (showId && loadedShow?.custom_messages && loadedShow.custom_messages.length > 0) || (copyShowData?.custom_messages && copyShowData.custom_messages.length > 0)) && onNavigateToSlides && (
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
            style={[
              styles.button, 
              styles.saveButton,
              (saving || hasOverlap) && styles.buttonDisabled
            ]}
            onPress={handleSave}
            disabled={saving || hasOverlap}
          >
            <Text style={styles.saveButtonText}>
              {saving ? 'Saving...' : 'Save/Exit'}
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
  performersContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  performersTextContainer: {
    flex: 1,
    maxWidth: '75%',
    marginRight: 10,
  },
  performersText: {
    fontSize: 16,
    color: '#333',
  },
  performersLabel: {
    fontWeight: '600',
    fontSize: 19.2, // 20% larger than 16
    color: '#4CAF50', // Green
  },
  performersList: {
    fontWeight: 'normal',
    fontSize: 16,
  },
  hostLabel: {
    color: '#007AFF', // Blue
    fontSize: 16,
    fontWeight: '600',
  },
  numberLabel: {
    color: '#007AFF', // Blue
    fontSize: 16,
    fontWeight: '600',
  },
  hlLabel: {
    color: '#FF0000', // Red
    fontSize: 16,
    fontWeight: '600',
  },
  editButton: {
    backgroundColor: COLORS.TEAL,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
  toggleWithLabels: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  themeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    minWidth: 20,
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
  saveButtonFullWidth: {
    marginLeft: 0,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
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
  warningContainer: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffc107',
    borderWidth: 1,
    borderRadius: 8,
    padding: 15,
    marginTop: 10,
  },
  warningText: {
    color: '#856404',
    fontSize: 14,
    lineHeight: 20,
  },
  actionButton: {
    backgroundColor: COLORS.TEAL,
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

