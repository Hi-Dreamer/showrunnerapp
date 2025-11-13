import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useSelector } from 'react-redux';
import ApiService from '../../services/api';
import CsrfTokenService from '../../services/csrfTokenService';
import { API_ENDPOINTS } from '../../constants/apiEndpoints';
import { ErrorHandler } from '../../utils/errorHandler';

/**
 * Footer Component
 * Displays audience count and reset show option
 */
const Footer = ({ showId, show }) => {
  const handleResetShow = async () => {
    if (!showId) return;

    Alert.alert(
      'Reset Show',
      'This will reset all audience members, votes, and picks. This action cannot be undone. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              const csrfToken = await CsrfTokenService.ensureFreshToken();
              const response = await fetch(`${API_ENDPOINTS.SHOW(showId)}/reset_show`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                  'Accept': 'application/json',
                  'X-CSRF-Token': csrfToken,
                },
              });

              if (!response.ok) {
                const errorInfo = await ErrorHandler.parseErrorResponse(response);
                Alert.alert('Error', ErrorHandler.formatUserMessage(errorInfo.message));
              } else {
                Alert.alert('Success', 'Show has been reset');
              }
            } catch (error) {
              const errorMessage = await ErrorHandler.handleError(error, 'resetShow');
              Alert.alert('Error', errorMessage);
            }
          },
        },
      ]
    );
  };

  // Determine if reset show should be shown
  const shouldShowReset = () => {
    if (!show) return false;
    
    // Check conditions from documentation
    const hasVoters = show.voter_count > 0;
    const isFuture = show.show_datetime && new Date(show.show_datetime) > new Date();
    const isNotLocked = !show.date_locked;
    
    return hasVoters && isFuture && isNotLocked;
  };

  const audienceCount = show?.voter_count || 0;
  const audienceCapacity = show?.capacity || 0;

  return (
    <View style={styles.container}>
      <Text style={styles.audienceText}>
        Audience Members: {audienceCount}{audienceCapacity > 0 ? `/${audienceCapacity}` : ''}
      </Text>
      {shouldShowReset() && (
        <TouchableOpacity onPress={handleResetShow} style={styles.resetButton}>
          <Text style={styles.resetButtonText}>Reset Show</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  audienceText: {
    fontSize: 14,
    color: '#666',
  },
  resetButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  resetButtonText: {
    color: '#d32f2f',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default Footer;


