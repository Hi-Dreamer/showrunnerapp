import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, Image } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { loadShows } from '../actions/showActions';
import { logoutUser } from '../actions/authActions';
import ShowForm from './ShowForm';

const ShowsList = () => {
  const dispatch = useDispatch();
  const { shows, loading } = useSelector((state) => state.show);
  const { user } = useSelector((state) => state.auth);
  const [showForm, setShowForm] = useState(null); // null, 'new', or showId number

  useEffect(() => {
    dispatch(loadShows());
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

  const handleRunShow = (showId) => {
    // TODO: Navigate to RunShow component (Phase 2)
    Alert.alert('Run Show', `Run show functionality will be implemented in Phase 2. Show ID: ${showId}`);
  };

  const handleFormCancel = () => {
    setShowForm(null);
  };

  const handleFormSave = () => {
    setShowForm(null);
    dispatch(loadShows()); // Refresh the list
  };

  if (showForm) {
    return (
      <ShowForm
        showId={showForm === 'new' ? null : showForm}
        onCancel={handleFormCancel}
        onSave={handleFormSave}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>My Shows</Text>
          <Image 
            source={require('../../assets/hi_logo.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.userInfo}>Logged in as: {user?.email}</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity onPress={handleCreateShow} style={styles.createButton}>
            <Text style={styles.createButtonText}>+ New Show</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <Text style={styles.loading}>Loading shows...</Text>
      ) : (
        <FlatList
          data={shows}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.showItem}>
              <View style={styles.showItemContent}>
                <Text style={styles.showName}>{item.name}</Text>
                <Text style={styles.showCode}>Code: {item.code || 'N/A'}</Text>
                {item.show_datetime && (
                  <Text style={styles.showDate}>
                    {new Date(item.show_datetime).toLocaleString()}
                  </Text>
                )}
              </View>
              <View style={styles.showItemActions}>
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
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.empty}>No shows found</Text>
              <TouchableOpacity onPress={handleCreateShow} style={styles.emptyCreateButton}>
                <Text style={styles.emptyCreateButtonText}>Create Your First Show</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    flex: 1,
  },
  logo: {
    width: 60,
    height: 60,
  },
  userInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  headerButtons: {
    flexDirection: 'row',
    marginTop: 10,
  },
  createButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 10,
  },
  createButtonText: {
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

