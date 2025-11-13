import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ScrollView, Dimensions } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { loadShows, loadExpiredShows, loadShow, deleteShow } from '../actions/showActions';
import ApiService from '../services/api';
import { logoutUser } from '../actions/authActions';
import ShowForm from './ShowForm';
import RunShow from './RunShow';
import PageHeader from './PageHeader';
import { COLORS } from '../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ShowsList = () => {
  const dispatch = useDispatch();
  const { activeShows, expiredShows, loading, loadingExpired } = useSelector((state) => state.show);
  const { user } = useSelector((state) => state.auth);
  const [showForm, setShowForm] = useState(null); // null, 'new', or showId number
  const [runShowId, setRunShowId] = useState(null); // null or showId number
  const [currentPage, setCurrentPage] = useState(0); // 0 = Active Shows, 1 = Old Shows

  useEffect(() => {
    // Load both active and expired shows
    dispatch(loadShows('upcoming'));
    dispatch(loadExpiredShows());
  }, [dispatch]);

  const handleLogout = () => {
    dispatch(logoutUser());
  };

  const handleCreateShow = () => {
    setShowForm('new');
  };

  const handleEditShow = (showId) => {
    setShowForm(showId);
  };

  const handleEditBasicInfo = (showId) => {
    // Open ShowForm starting on Page 1 for basic info editing
    setShowForm({ showId, startOnPage1: true });
  };

  const handleRunShow = (showId) => {
    setRunShowId(showId);
  };

  const handleRunShowBack = () => {
    setRunShowId(null);
  };

  const handleFormCancel = () => {
    setShowForm(null);
  };

  const handleFormSave = () => {
    setShowForm(null);
    dispatch(loadShows('upcoming')); // Refresh the active shows list
    dispatch(loadExpiredShows()); // Refresh the expired shows list
  };

  const handleCopyShow = async (showId) => {
    // Load the full show data (including all relationships) and open it in edit mode as a new show
    try {
      const show = await dispatch(loadShow(showId));
      if (show) {
        // Load additional data needed for copying
        const api = ApiService.getClient();
        
        // Load performers
        let performers = [];
        try {
          performers = await api.performers.get({ show_id: showId });
        } catch (error) {
          console.error('Error loading performers for copy:', error);
        }
        
        // Load slides (custom_messages)
        let slides = [];
        if (show.custom_messages) {
          slides = show.custom_messages;
        }
        
        // Create a complete copy of the show with all data
        const showToCopy = {
          ...show,
          name: `${show.name} (Copy)`,
          performers: performers, // Include performers array
          custom_messages: slides, // Include slides
        };
        
        // Open the form with the show data pre-populated (as a new show)
        setShowForm({ copyFrom: showToCopy });
      } else {
        Alert.alert('Error', 'Failed to load show for copying');
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to load show for copying');
    }
  };

  const handleDeleteShow = async (showId) => {
    Alert.alert(
      'Delete Show',
      'Are you sure you want to delete this show? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await dispatch(deleteShow(showId));
            if (result.success) {
              Alert.alert('Success', 'Show deleted successfully');
              dispatch(loadShows('upcoming')); // Refresh the active shows list
              dispatch(loadExpiredShows()); // Refresh the expired shows list
            } else {
              Alert.alert('Error', result.error || 'Failed to delete show');
            }
          },
        },
      ]
    );
  };

  const handlePageChange = (event) => {
    const page = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setCurrentPage(page);
  };

  if (runShowId) {
    return (
      <RunShow
        showId={runShowId}
        onBack={handleRunShowBack}
      />
    );
  }

  if (showForm) {
    // Handle different showForm types
    let showId = null;
    let copyFromShow = null;
    let startOnPage1 = false;
    
    if (showForm === 'new') {
      showId = null;
    } else if (typeof showForm === 'object') {
      if (showForm.copyFrom) {
        // Copy mode - no showId, but pass the show data to copy from
        showId = null;
        copyFromShow = showForm.copyFrom;
      } else if (showForm.showId) {
        // Basic info edit mode - showId with startOnPage1 flag
        showId = showForm.showId;
        startOnPage1 = showForm.startOnPage1 || false;
      }
    } else {
      // Edit mode - showId is the number
      showId = showForm;
    }
    
    return (
      <ShowForm
        showId={showId}
        copyFromShow={copyFromShow}
        startOnPage1={startOnPage1}
        onCancel={handleFormCancel}
        onSave={handleFormSave}
      />
    );
  }

  const renderShowList = (showList, isActiveShows) => (
    <View style={styles.pageContainer}>
      <View style={styles.header}>
        <PageHeader
          title={isActiveShows ? 'Active Shows' : 'Old Shows'}
          subtitle={isActiveShows ? 'Swipe Left For Old Shows' : 'Swipe Right for Active Shows'}
          subtitleColor={COLORS.TEAL}
          subtitleItalic={true}
          showLogo={true}
          logoSize="medium"
          titleFontSize="medium"
        />
        <View style={styles.userInfoRow}>
          <Text style={styles.userInfo}>Logged in as: {user?.email}</Text>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {(isActiveShows ? loading : loadingExpired) ? (
        <Text style={styles.loading}>Loading shows...</Text>
      ) : (
        <FlatList
          data={showList}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.showItem}>
              <TouchableOpacity 
                style={styles.showItemContent}
                onPress={() => handleEditBasicInfo(item.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.showName}>{item.name}</Text>
                <Text style={styles.showCode}>Code: {item.code || 'N/A'}</Text>
                {item.show_datetime && (
                  <Text style={styles.showDate}>
                    {new Date(item.show_datetime).toLocaleString()}
                  </Text>
                )}
              </TouchableOpacity>
              <View style={styles.showItemActions}>
                {isActiveShows ? (
                  <>
                    <TouchableOpacity
                      onPress={() => handleEditShow(item.id)}
                      style={styles.actionButton}
                    >
                      <Text style={styles.actionButtonText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleRunShow(item.id)}
                      style={[styles.actionButton, styles.runButton]}
                    >
                      <Text style={[styles.actionButtonText, styles.runButtonText]}>Run</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <TouchableOpacity
                      onPress={() => handleCopyShow(item.id)}
                      style={styles.actionButton}
                    >
                      <Text style={styles.actionButtonText}>Copy</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteShow(item.id)}
                      style={[styles.actionButton, styles.deleteButton]}
                    >
                      <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.empty}>
                {isActiveShows ? 'No active shows found' : 'No expired shows found'}
              </Text>
              {isActiveShows && (
                <TouchableOpacity onPress={handleCreateShow} style={styles.emptyCreateButton}>
                  <Text style={styles.emptyCreateButtonText}>Create Your First Show</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
      {isActiveShows && (
        <TouchableOpacity onPress={handleCreateShow} style={styles.bottomButton}>
          <Text style={styles.bottomButtonText}>+ New Show</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handlePageChange}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
      >
        {renderShowList(activeShows, true)}
        {renderShowList(expiredShows, false)}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexDirection: 'row',
  },
  pageContainer: {
    width: SCREEN_WIDTH,
    flex: 1,
    padding: 20,
    paddingBottom: 100, // Add padding to prevent content from being hidden behind bottom button
  },
  header: {
    marginBottom: 20,
  },
  userInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  userInfo: {
    fontSize: 14,
    color: '#666',
  },
  bottomButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  bottomButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    padding: 10,
  },
  logoutText: {
    color: '#007AFF',
    fontSize: 16,
  },
  loading: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
  },
  showItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  showItemContent: {
    flex: 1,
  },
  showName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  showCode: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  showDate: {
    fontSize: 12,
    color: '#999',
  },
  showItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginLeft: 10,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
  },
  actionButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  runButton: {
    backgroundColor: '#e8f5e9',
  },
  runButtonText: {
    color: '#2e7d32',
  },
  deleteButton: {
    backgroundColor: '#ffebee',
  },
  deleteButtonText: {
    color: '#c62828',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 50,
    padding: 20,
  },
  empty: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  emptyCreateButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
  },
  emptyCreateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ShowsList;

