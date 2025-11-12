import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { updateShow, loadShow } from '../actions/showActions';
import { DateUtils } from '../utils/dateUtils';

const ShowFormPage3 = ({ showId, page1Data, onBack, onSave }) => {
  const dispatch = useDispatch();
  const { currentShow, hiModules } = useSelector((state) => state.show);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadedShow, setLoadedShow] = useState(null);
  
  // Messaging fields
  const [textPerformingTv, setTextPerformingTv] = useState('');
  const [textPerformingMobile, setTextPerformingMobile] = useState('');
  const [textVotingPromptTv, setTextVotingPromptTv] = useState('');
  const [textVotingPromptMobile, setTextVotingPromptMobile] = useState('');
  const [textVotingDoneMobile, setTextVotingDoneMobile] = useState('');
  const [textVotingWinnerTv, setTextVotingWinnerTv] = useState('');
  const [textVotingWinnerMobile, setTextVotingWinnerMobile] = useState('');
  const [textDrawGetReadyTv, setTextDrawGetReadyTv] = useState('');
  const [textDrawGetReadyMobile, setTextDrawGetReadyMobile] = useState('');

  // Check if a hi_module is selected
  const hiModuleSelected = (moduleNames) => {
    if (!page1Data?.selectedHiModules || !hiModules) return false;
    const moduleIds = hiModules
      .filter(m => moduleNames.includes(m.name))
      .map(m => m.id);
    return moduleIds.some(id => page1Data.selectedHiModules.includes(id));
  };

  useEffect(() => {
    if (showId) {
      setLoading(true);
      dispatch(loadShow(showId)).then((show) => {
        if (show) {
          setLoadedShow(show); // Store locally for save operation
          // Load messaging fields
          setTextPerformingTv(show.text_performing_tv || '');
          setTextPerformingMobile(show.text_performing_mobile || '');
          setTextVotingPromptTv(show.text_voting_prompt_tv || '');
          setTextVotingPromptMobile(show.text_voting_prompt_mobile || '');
          setTextVotingDoneMobile(show.text_voting_done_mobile || '');
          setTextVotingWinnerTv(show.text_voting_winner_tv || '');
          setTextVotingWinnerMobile(show.text_voting_winner_mobile || '');
          setTextDrawGetReadyTv(show.text_draw_get_ready_tv || '');
          setTextDrawGetReadyMobile(show.text_draw_get_ready_mobile || '');
        }
        setLoading(false);
      });
    }
  }, [showId, dispatch]);

  const handleSave = async () => {
    setSaving(true);

    const showData = {
      name: page1Data.name,
      code: page1Data.code || null,
      venue_id: page1Data.venueId > 0 ? page1Data.venueId : null,
      // Include existing dates to avoid validation errors
      show_datetime: loadedShow?.show_datetime ? DateUtils.formatForAPI(new Date(loadedShow.show_datetime)) : null,
      show_end_datetime: loadedShow?.show_end_datetime ? DateUtils.formatForAPI(new Date(loadedShow.show_end_datetime)) : null,
      // Include other required fields
      tv_theme: loadedShow?.tv_theme || 'light',
      tv_score_visible: loadedShow?.tv_score_visible || false,
      // IMPORTANT: Preserve existing performers - if we don't include this, ShowPerformersService will clear all performers
      performer_ids: loadedShow?.performer_ids && loadedShow.performer_ids.length > 0 ? loadedShow.performer_ids : null,
      // Note: hi_modules are only set during creation, not updates
      text_performing_tv: textPerformingTv || null,
      text_performing_mobile: textPerformingMobile || null,
      text_voting_prompt_tv: textVotingPromptTv || null,
      text_voting_prompt_mobile: textVotingPromptMobile || null,
      text_voting_done_mobile: textVotingDoneMobile || null,
      text_voting_winner_tv: textVotingWinnerTv || null,
      text_voting_winner_mobile: textVotingWinnerMobile || null,
      text_draw_get_ready_tv: textDrawGetReadyTv || null,
      text_draw_get_ready_mobile: textDrawGetReadyMobile || null,
    };

    try {
      const result = await dispatch(updateShow(showId, showData));
      setSaving(false);

      if (result.success) {
        if (onSave) {
          onSave(result.show);
        }
      } else {
        Alert.alert('Error', result.error || 'Failed to save messaging customization');
      }
    } catch (error) {
      setSaving(false);
      Alert.alert('Error', error.message || 'Failed to save messaging customization');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loading}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.title}>Messaging Customization</Text>
        <Text style={styles.subTitle}>Customize the text displayed on TV and mobile</Text>

        {hiModuleSelected(['Performing']) && (
          <View style={styles.field}>
            <Text style={styles.sectionTitle}>Performing</Text>
            <View style={styles.subField}>
              <Text style={styles.label}>Performing (TV)</Text>
              <TextInput
                style={styles.input}
                value={textPerformingTv}
                onChangeText={setTextPerformingTv}
                placeholder="Now Performing"
                multiline
              />
            </View>
            <View style={styles.subField}>
              <Text style={styles.label}>Performing (Mobile)</Text>
              <TextInput
                style={styles.input}
                value={textPerformingMobile}
                onChangeText={setTextPerformingMobile}
                placeholder="Now Performing"
                multiline
              />
            </View>
          </View>
        )}

        {hiModuleSelected(['Voting', 'Extended Voting']) && (
          <View style={styles.field}>
            <Text style={styles.sectionTitle}>Voting</Text>
            <View style={styles.subField}>
              <Text style={styles.label}>Voting Prompt (TV)</Text>
              <TextInput
                style={styles.input}
                value={textVotingPromptTv}
                onChangeText={setTextVotingPromptTv}
                placeholder="It's Time To Vote For"
                multiline
              />
            </View>
            <View style={styles.subField}>
              <Text style={styles.label}>Voting Prompt (Mobile)</Text>
              <TextInput
                style={styles.input}
                value={textVotingPromptMobile}
                onChangeText={setTextVotingPromptMobile}
                placeholder="It's Time To Vote For"
                multiline
              />
            </View>
            <View style={styles.subField}>
              <Text style={styles.label}>Voting Done (Mobile)</Text>
              <TextInput
                style={styles.input}
                value={textVotingDoneMobile}
                onChangeText={setTextVotingDoneMobile}
                placeholder="Awesome! Thanks for your vote!"
                multiline
              />
            </View>
            <View style={styles.subField}>
              <Text style={styles.label}>Voting Winner (TV)</Text>
              <TextInput
                style={styles.input}
                value={textVotingWinnerTv}
                onChangeText={setTextVotingWinnerTv}
                placeholder="The Winner Is"
                multiline
              />
            </View>
            <View style={styles.subField}>
              <Text style={styles.label}>Voting Winner (Mobile)</Text>
              <TextInput
                style={styles.input}
                value={textVotingWinnerMobile}
                onChangeText={setTextVotingWinnerMobile}
                placeholder="THE WINNER IS..."
                multiline
              />
            </View>
          </View>
        )}

        {hiModuleSelected(['Draw']) && (
          <View style={styles.field}>
            <Text style={styles.sectionTitle}>Draw</Text>
            <View style={styles.subField}>
              <Text style={styles.label}>Draw Get Ready (TV)</Text>
              <TextInput
                style={styles.input}
                value={textDrawGetReadyTv}
                onChangeText={setTextDrawGetReadyTv}
                placeholder="Draw In Progress"
                multiline
              />
            </View>
            <View style={styles.subField}>
              <Text style={styles.label}>Draw Get Ready (Mobile)</Text>
              <TextInput
                style={styles.input}
                value={textDrawGetReadyMobile}
                onChangeText={setTextDrawGetReadyMobile}
                placeholder="A draw is about to take place!"
                multiline
              />
            </View>
          </View>
        )}

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.backButton]}
            onPress={onBack}
            disabled={saving}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.saveButton, saving && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>
              {saving ? 'Saving...' : 'Save'}
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
    marginBottom: 10,
  },
  subTitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
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
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#fff',
    minHeight: 60,
    textAlignVertical: 'top',
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
  backButton: {
    backgroundColor: '#f0f0f0',
    marginRight: 10,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    marginLeft: 10,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  backButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonText: {
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

export default ShowFormPage3;

