import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { createShow, loadShow, loadVenues, loadHiModules } from '../actions/showActions';
import { DateUtils } from '../utils/dateUtils';

const ShowFormPage1 = ({ showId, onCancel, onContinue }) => {
  const dispatch = useDispatch();
  const { currentShow, venues, hiModules } = useSelector((state) => state.show);
  const { user } = useSelector((state) => state.auth);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [venueId, setVenueId] = useState(-1);
  const [selectedHiModules, setSelectedHiModules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Load venues and hi_modules
    dispatch(loadVenues());
    dispatch(loadHiModules());

    // If editing, load the show
    if (showId) {
      setLoading(true);
      dispatch(loadShow(showId)).then((show) => {
        if (show) {
          setName(show.name || '');
          setCode(show.code || '');
          setVenueId(show.venue_id || -1);
          setSelectedHiModules(show.hi_module_ids || []);
        }
        setLoading(false);
      });
    }
  }, [showId, dispatch]);

  // Filter hi_modules based on permissions
  const getFilteredHiModules = () => {
    if (!hiModules || hiModules.length === 0) return [];
    
    const extendedVotingShowsAllowed = user?.extended_voting_shows_allowed || 0;
    
    return hiModules.filter(module => {
      if (module.name === 'Extended Voting') {
        return extendedVotingShowsAllowed > 0;
      }
      return true;
    });
  };

  const toggleHiModule = (moduleId) => {
    const module = hiModules.find(m => m.id === moduleId);
    const isExtendedVoting = module?.name === 'Extended Voting';
    
    if (isExtendedVoting) {
      // Extended Voting is exclusive - if selected, clear all others
      if (selectedHiModules.includes(moduleId)) {
        setSelectedHiModules([]);
      } else {
        setSelectedHiModules([moduleId]);
      }
    } else {
      // Regular modules - toggle normally, but remove Extended Voting if it's selected
      if (selectedHiModules.includes(moduleId)) {
        setSelectedHiModules(selectedHiModules.filter(id => id !== moduleId));
      } else {
        const extendedVotingModule = hiModules.find(m => m.name === 'Extended Voting');
        const filtered = extendedVotingModule 
          ? selectedHiModules.filter(id => id !== extendedVotingModule.id)
          : selectedHiModules;
        setSelectedHiModules([...filtered, moduleId]);
      }
    }
  };

  const handleContinue = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a show name');
      return;
    }

    if (selectedHiModules.length === 0) {
      Alert.alert('Error', 'Please select at least one feature (hi_module)');
      return;
    }

    // For new shows, save Page 1 first
    if (!showId) {
      setSaving(true);
      try {
        const showData = {
          name: name.trim(),
          code: code.trim() || null,
          venue_id: venueId > 0 ? venueId : null,
          hi_modules: selectedHiModules,
          // Set default dates for Page 1 save
          show_datetime: DateUtils.formatForAPI(DateUtils.getNextHour()),
          show_end_datetime: DateUtils.formatForAPI(DateUtils.getNextEndHour()),
          tv_theme: 'light',
          tv_score_visible: false,
        };

        const result = await dispatch(createShow(showData));
        setSaving(false);

        if (result.success) {
          // Continue to Page 2 with the created show
          onContinue(result.show.id, {
            name,
            code,
            venueId,
            selectedHiModules,
          });
        } else {
          Alert.alert('Error', result.error || 'Failed to create show');
        }
      } catch (error) {
        setSaving(false);
        Alert.alert('Error', error.message || 'Failed to create show');
      }
    } else {
      // For editing, just pass data to Page 2
      onContinue(showId, {
        name,
        code,
        venueId,
        selectedHiModules,
      });
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loading}>Loading show...</Text>
      </View>
    );
  }

  const filteredModules = getFilteredHiModules();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.title}>
          {showId ? 'Edit Show - Basic Info' : 'Create New Show - Basic Info'}
        </Text>

        <View style={styles.field}>
          <Text style={styles.label}>Show Name *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter show name"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Show Code (optional)</Text>
          <TextInput
            style={styles.input}
            value={code}
            onChangeText={setCode}
            placeholder="Enter unique code"
            autoCapitalize="characters"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Venue (optional)</Text>
          <View style={styles.pickerContainer}>
            <TouchableOpacity 
              style={styles.picker}
              onPress={() => {
                if (venues.length > 0) {
                  Alert.alert(
                    'Select Venue',
                    'Choose a venue',
                    [
                      { text: 'None', onPress: () => setVenueId(-1) },
                      ...venues.map(venue => ({
                        text: venue.name,
                        onPress: () => setVenueId(venue.id),
                      })),
                      { text: 'Cancel', style: 'cancel' },
                    ]
                  );
                }
              }}
            >
              <Text style={styles.pickerText}>
                {venueId > 0 && venues.find(v => v.id === venueId)
                  ? venues.find(v => v.id === venueId).name
                  : 'None (optional)'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Features * (select at least one)</Text>
          <Text style={styles.subLabel}>
            Please pick the features you will need to support on this show
          </Text>
          {filteredModules.map((module) => {
            const moduleName = module.name === 'Messaging' ? 'Slides' : module.name;
            return (
              <TouchableOpacity
                key={module.id}
                style={styles.checkboxRow}
                onPress={() => toggleHiModule(module.id)}
              >
                <View style={[styles.checkbox, selectedHiModules.includes(module.id) && styles.checkboxChecked]}>
                  {selectedHiModules.includes(module.id) && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <View style={styles.checkboxLabelContainer}>
                  <Text style={styles.checkboxLabel}>{moduleName}</Text>
                  <Text style={styles.checkboxDescription}> - {module.description}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={onCancel}
            disabled={saving}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.continueButton, saving && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={saving}
          >
            <Text style={styles.continueButtonText}>
              {saving ? 'Saving...' : 'Continue'}
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  field: {
    marginBottom: 25,
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
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    padding: 15,
    backgroundColor: '#fff',
  },
  pickerText: {
    fontSize: 16,
    color: '#333',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 4,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxLabelContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  checkboxLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  checkboxDescription: {
    fontSize: 14,
    color: '#666',
    flex: 1,
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
  cancelButton: {
    backgroundColor: '#f0f0f0',
    marginRight: 10,
  },
  continueButton: {
    backgroundColor: '#007AFF',
    marginLeft: 10,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  continueButtonText: {
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

export default ShowFormPage1;

