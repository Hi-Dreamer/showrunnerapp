import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useDispatch, useSelector } from 'react-redux';
import { createShow, loadShows, loadExpiredShows, updateShow } from '../actions/showActions';
import ApiService from '../services/api';
import MultipartRequestService from '../services/multipartRequestService';
import { DateUtils } from '../utils/dateUtils';
import PageHeader from './PageHeader';

const CopyEditPage = ({ copyShowData, page1Data, onCancel, onSave }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const [showDatetime, setShowDatetime] = useState(null);
  const [showEndDatetime, setShowEndDatetime] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(null);
  const [saving, setSaving] = useState(false);
  const [hasOverlap, setHasOverlap] = useState(false);
  const [overlapWarning, setOverlapWarning] = useState('');
  const overlapCheckTimeoutRef = useRef(null);
  const isCheckingOverlapRef = useRef(false);
  const checkForOverlapsRef = useRef(null);
  const hasInitialCheckRef = useRef(false);

  // Check if two date ranges overlap
  const dateRangesOverlap = (start1, end1, start2, end2) => {
    if (!start1 || !end1 || !start2 || !end2) return false;
    return new Date(start1) < new Date(end2) && new Date(start2) < new Date(end1);
  };

  // Check if a show is an Extended Voting show (by duration > 12 hours)
  const isExtendedVotingShow = (show) => {
    if (!show) return false;
    if (show.show_datetime && show.show_end_datetime) {
      const startDate = new Date(show.show_datetime);
      const endDate = new Date(show.show_end_datetime);
      const durationHours = (endDate - startDate) / (1000 * 60 * 60);
      if (durationHours > 12) {
        return true;
      }
    }
    return false;
  };

  // Check for overlapping shows
  const checkForOverlaps = useCallback(async (startDate, endDate) => {
    if (!startDate || !endDate) {
      setHasOverlap(false);
      setOverlapWarning('');
      return;
    }

    if (isCheckingOverlapRef.current) {
      return;
    }

    isCheckingOverlapRef.current = true;

    try {
      const api = ApiService.getClient();
      const [activeShows, expiredShows] = await Promise.all([
        api.shows.get({ date_filter: 'upcoming', page: 1 }),
        api.shows.get({ date_filter: 'past', page: 1 }),
      ]);
      
      const allShowsToCheck = [...(activeShows || []), ...(expiredShows || [])];

      // Check if current show would be Extended Voting (> 12 hours)
      const durationHours = (endDate - startDate) / (1000 * 60 * 60);
      const wouldBeExtendedVoting = durationHours > 12;

      // Check extended voting limit if this would be an Extended Voting show
      if (wouldBeExtendedVoting) {
        const extendedVotingShowsAllowed = user?.extended_voting_shows_allowed || 0;
        if (extendedVotingShowsAllowed > 0) {
          let count = 0;
          for (const show of allShowsToCheck) {
            if (isExtendedVotingShow(show)) {
              count++;
            }
          }
          
          if (count >= extendedVotingShowsAllowed) {
            setHasOverlap(true);
            setOverlapWarning(
              `Warning: You have reached your limit of ${extendedVotingShowsAllowed} Extended Voting show(s). This show exceeds 12 hours and would exceed your allowed limit.`
            );
            isCheckingOverlapRef.current = false;
            return;
          }
        } else {
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
        // Skip Extended Voting shows (they can overlap)
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
            isCheckingOverlapRef.current = false;
            return;
          }
        }
      }

      // No overlaps found
      setHasOverlap(false);
      setOverlapWarning('');
    } catch (error) {
      console.error('Error checking for overlaps:', error);
      setHasOverlap(false);
      setOverlapWarning('');
    } finally {
      isCheckingOverlapRef.current = false;
    }
  }, [user]);

  // Store the latest checkForOverlaps function in a ref
  checkForOverlapsRef.current = checkForOverlaps;

  // Initialize dates when component mounts
  useEffect(() => {
    if (copyShowData) {
      // When copying, force dates to current date/time (next hour)
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
  }, [copyShowData]);

  // Check for overlaps when dates change (debounced)
  useEffect(() => {
    if (!hasInitialCheckRef.current) {
      return;
    }
    
    if (showDatetime && showEndDatetime) {
      if (overlapCheckTimeoutRef.current) {
        clearTimeout(overlapCheckTimeoutRef.current);
      }
      
      overlapCheckTimeoutRef.current = setTimeout(() => {
        if (checkForOverlapsRef.current) {
          checkForOverlapsRef.current(showDatetime, showEndDatetime);
        }
      }, 500);
    }
    
    return () => {
      if (overlapCheckTimeoutRef.current) {
        clearTimeout(overlapCheckTimeoutRef.current);
      }
    };
  }, [showDatetime, showEndDatetime]);

  const handleCopy = async () => {
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
      name: page1Data.name || `${copyShowData.name} (Copy)`,
      code: page1Data.code || null,
      venue_id: page1Data.venueId > 0 ? page1Data.venueId : null,
      show_datetime: DateUtils.formatForAPI(showDatetime),
      show_end_datetime: DateUtils.formatForAPI(showEndDatetime),
      hi_modules: page1Data?.selectedHiModules || [],
      performer_ids: copyShowData.performer_ids || null,
      tv_theme: copyShowData.tv_theme || 'light',
      tv_score_visible: copyShowData.tv_score_visible || false,
    };

    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 30000);
      });

      const createPromise = dispatch(createShow(showData));
      const result = await Promise.race([createPromise, timeoutPromise]);
      setSaving(false);

      if (result && result.success) {
        const newShowId = result.show.id;
        
        // Copy slides if they exist
        if (copyShowData.custom_messages && copyShowData.custom_messages.length > 0) {
          try {
            await MultipartRequestService.saveSlides(newShowId, copyShowData.custom_messages);
          } catch (error) {
            console.error('Error copying slides:', error);
            // Don't fail the copy if slides fail - user can add them later
          }
        }
        
        // Copy messaging customization if it exists
        const messagingData = {
          text_performing_tv: copyShowData.text_performing_tv || null,
          text_performing_mobile: copyShowData.text_performing_mobile || null,
          text_voting_prompt_tv: copyShowData.text_voting_prompt_tv || null,
          text_voting_prompt_mobile: copyShowData.text_voting_prompt_mobile || null,
          text_voting_done_mobile: copyShowData.text_voting_done_mobile || null,
          text_voting_winner_tv: copyShowData.text_voting_winner_tv || null,
          text_voting_winner_mobile: copyShowData.text_voting_winner_mobile || null,
          text_draw_get_ready_tv: copyShowData.text_draw_get_ready_tv || null,
          text_draw_get_ready_mobile: copyShowData.text_draw_get_ready_mobile || null,
        };
        
        // Only update if there's any messaging data to copy
        const hasMessagingData = Object.values(messagingData).some(val => val !== null);
        if (hasMessagingData) {
          try {
            await dispatch(updateShow(newShowId, messagingData));
          } catch (error) {
            console.error('Error copying messaging:', error);
            // Don't fail the copy if messaging fails
          }
        }
        
        // Refresh shows lists
        dispatch(loadShows('upcoming'));
        dispatch(loadExpiredShows());
        
        if (onSave) {
          onSave(result.show);
        }
      } else if (result) {
        Alert.alert('Error', result.error || 'Failed to copy show');
      }
    } catch (error) {
      setSaving(false);
      console.error('Show copy error:', error);
      Alert.alert('Error', error.message || 'Failed to copy show');
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <PageHeader
          title={`Copy Show: ${copyShowData?.name || 'Untitled'}`}
          showLogo={true}
          logoSize="medium"
          titleFontSize="small"
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

        {hasOverlap && overlapWarning && (
          <View style={styles.field}>
            <View style={styles.warningContainer}>
              <Text style={styles.warningText}>{overlapWarning}</Text>
            </View>
          </View>
        )}

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.deleteButton]}
            onPress={handleCancel}
            disabled={saving}
          >
            <Text style={styles.deleteButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.button, 
              styles.saveButton,
              (saving || hasOverlap) && styles.buttonDisabled
            ]}
            onPress={handleCopy}
            disabled={saving || hasOverlap}
          >
            <Text style={styles.saveButtonText}>
              {saving ? 'Copying...' : 'Copy'}
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
  field: {
    marginBottom: 25,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  dateButton: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
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
  warningContainer: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffc107',
    borderWidth: 1,
    borderRadius: 8,
    padding: 15,
  },
  warningText: {
    color: '#856404',
    fontSize: 14,
    lineHeight: 20,
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
});

export default CopyEditPage;

