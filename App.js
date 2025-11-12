import React, { useEffect } from 'react';
import { SafeAreaView, StatusBar } from 'react-native';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { store } from './src/store';
import { checkAuth } from './src/actions/authActions';
import LoginScreen from './src/components/LoginScreen';
import ShowsList from './src/components/ShowsList';

// Polyfill for ActionCable
if (typeof global.addEventListener !== 'function') {
  global.addEventListener = () => {};
}
if (typeof global.removeEventListener !== 'function') {
  global.removeEventListener = () => {};
}

// Set API base URL for ActionCable
// Use your development machine's IP address instead of localhost
global.root_url = 'http://192.168.1.84:3000';
global.cable_url = 'ws://192.168.1.84:3000/cable';

const AppContent = () => {
  const dispatch = useDispatch();
  const { isAuthenticated, loading } = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(checkAuth());
  }, [dispatch]);

  if (loading) {
    return null; // Or a loading spinner
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <StatusBar barStyle="dark-content" />
      {isAuthenticated ? <ShowsList /> : <LoginScreen />}
    </SafeAreaView>
  );
};

export default function App() {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
}
