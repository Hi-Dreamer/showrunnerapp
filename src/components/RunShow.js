import React, { useEffect, useState, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image, Dimensions } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { loadRunShowData, runShowReset, runShowUpdateElapsedTime } from '../actions/runShowActions';
import ShowRunnerChannelService from '../services/showRunnerChannel';
import ApiService from '../services/api';
import { API_ENDPOINTS } from '../constants/apiEndpoints';
import StatusBar from './RunShow/StatusBar';
import Footer from './RunShow/Footer';
import ChannelsModule from './RunShow/ChannelsModule';
import MessagingModule from './RunShow/MessagingModule';
import PerformingModule from './RunShow/PerformingModule';
import VotingModule from './RunShow/VotingModule';
import DrawModule from './RunShow/DrawModule';
import BuzzerModule from './RunShow/BuzzerModule';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * RunShow Component
 * Main component for running a show with module-based controls
 */
const RunShow = ({ showId, onBack }) => {
  const dispatch = useDispatch();
  const { loading, error, showState, activePerformerId, activePerformerSetStart } = useSelector((state) => state.runShow);
  const { currentShow, hiModules } = useSelector((state) => state.show);
  const { user } = useSelector((state) => state.auth);
  const [show, setShow] = useState(null);
  const [activeModule, setActiveModule] = useState(null);
  const scrollViewRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Timer state
  const [serverTimeDiff, setServerTimeDiff] = useState(0);
  const [timerStartTimestamp, setTimerStartTimestamp] = useState(null);
  const timerIntervalRef = useRef(null);

  /**
   * Determine which modules are enabled based on hi_module_ids
   * Channels module is always first if user/venue has channels
   */
  const determineEnabledModules = (showData) => {
    // If showData is missing, return empty array
    if (!showData) {
      return [];
    }
    
    // If hi_module_ids is missing or not an array, return empty array
    if (!showData.hi_module_ids || !Array.isArray(showData.hi_module_ids) || showData.hi_module_ids.length === 0) {
      return [];
    }
    
    if (!hiModules || hiModules.length === 0) {
      return [];
    }

    const enabledModules = [];
    const moduleMap = {};
    
    // Create a map of module IDs to names
    hiModules.forEach((module) => {
      moduleMap[module.id] = module.name;
    });

    // Check which modules are enabled (Channels will be added at the beginning)
    const tempModules = [];
    
    showData.hi_module_ids.forEach((moduleId) => {
      const moduleName = moduleMap[moduleId];
      if (moduleName) {
        // Map module names to our module keys
        switch (moduleName) {
          case 'Messaging':
            tempModules.push('messaging');
            break;
          case 'Performing':
            tempModules.push('performing');
            break;
          case 'Voting':
          case 'Extended Voting':
            tempModules.push('voting');
            break;
          case 'Draw':
            tempModules.push('draw');
            // Only add buzzer if it's also explicitly in hi_module_ids
            // Don't automatically add buzzer when Draw is enabled
            break;
          case 'Buzzer':
            // Buzzer is a separate module that can be enabled independently
            tempModules.push('buzzer');
            break;
          default:
            break;
        }
      }
    });

    // Add channels at the beginning (swipe left from slides)
    const hasUserChannels = user && user.channels && user.channels.length > 0;
    const hasVenueChannels = showData.venue_id && showData.venue && showData.venue.channels && showData.venue.channels.length > 0;
    const isExtendedVoting = showData.hi_module_ids.some(id => moduleMap[id] === 'Extended Voting');
    
    if ((hasUserChannels || hasVenueChannels) && !isExtendedVoting) {
      enabledModules.push('channels');
    }
    
    // Add other modules after channels
    enabledModules.push(...tempModules);

    return enabledModules;
  };

  useEffect(() => {
    // Load show data
    const initialize = async () => {
      const result = await dispatch(loadRunShowData(showId));
      if (result.success && result.show) {
        setShow(result.show);
      } else {
        Alert.alert('Error', result.error || 'Failed to load show data');
        if (onBack) {
          onBack();
        }
      }
    };

    if (showId) {
      initialize();
      
      // Subscribe to ShowRunnerChannel for real-time updates
      // Only subscribe if not already subscribed
      if (!ShowRunnerChannelService.subscription) {
        ShowRunnerChannelService.subscribe(showId, dispatch);
      }
    }

    // Cleanup on unmount
    return () => {
      ShowRunnerChannelService.unsubscribe();
      dispatch(runShowReset());
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [showId]); // Removed dispatch and onBack from dependencies to prevent re-runs

  // Get server time offset on mount
  useEffect(() => {
    const getServerTime = async () => {
      try {
        const api = ApiService.getClient();
        const serverTime = await api.server_time.get();
        if (serverTime && serverTime.server_time) {
          const serverTimestamp = new Date(serverTime.server_time).getTime();
          const clientTimestamp = Date.now();
          setServerTimeDiff(clientTimestamp - serverTimestamp);
        }
      } catch (error) {
        console.warn('Failed to get server time:', error);
      }
    };

    getServerTime();
  }, []);

  // Track previous performer ID and show state to detect when a new performance starts
  const previousPerformerIdRef = useRef(null);
  const previousShowStateRef = useRef(null);
  
  // Load set_start when entering performing state
  useEffect(() => {
    if (showState === 'performing' && activePerformerId) {
      // Check if this is a new performance (entering performing state or performer changed)
      const isNewPerformance = 
        previousShowStateRef.current !== 'performing' || // Just entered performing state
        previousPerformerIdRef.current !== activePerformerId; // Performer changed
      
      const loadSetStart = async () => {
        try {
          // Small delay to ensure backend has updated set_start
          await new Promise(resolve => setTimeout(resolve, 100));
          
          const response = await fetch(API_ENDPOINTS.SET_TIMES(showId), {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Accept': 'application/json',
            },
          });
          
          if (response.ok) {
            const setTimes = await response.json();
            if (setTimes && Array.isArray(setTimes)) {
              const performerSetTime = setTimes.find(st => st.performer_id === activePerformerId);
              if (performerSetTime && performerSetTime.set_start) {
                const startTimestamp = new Date(performerSetTime.set_start).getTime();
                setTimerStartTimestamp(startTimestamp);
                previousPerformerIdRef.current = activePerformerId;
                previousShowStateRef.current = showState;
              } else {
                // If no set_start found, use current server time (new performance)
                const currentTime = Date.now() - serverTimeDiff;
                setTimerStartTimestamp(currentTime);
                previousPerformerIdRef.current = activePerformerId;
                previousShowStateRef.current = showState;
              }
            }
          }
        } catch (error) {
          console.warn('Failed to load set_start:', error);
          // Fallback: use current server time if API fails
          const currentTime = Date.now() - serverTimeDiff;
          setTimerStartTimestamp(currentTime);
        }
      };
      
      if (isNewPerformance) {
        // New performance - always fetch fresh set_start from API
        loadSetStart();
      } else {
        // Same performer, same state - use ActionCable value if available
        if (activePerformerSetStart) {
          const startTimestamp = new Date(activePerformerSetStart).getTime();
          setTimerStartTimestamp(startTimestamp);
        } else {
          // No ActionCable value yet, fetch from API
          loadSetStart();
        }
      }
    } else {
      // Not in performing state - clear timer
      setTimerStartTimestamp(null);
      if (showState !== 'performing') {
        previousShowStateRef.current = showState;
      }
    }
  }, [showState, activePerformerId, activePerformerSetStart, showId, serverTimeDiff]);

  // Timer logic - update every 200ms when in performing state
  useEffect(() => {
    if (showState === 'performing' && activePerformerId && timerStartTimestamp) {
      // Calculate and dispatch initial elapsed time immediately
      const calculateElapsed = () => {
        const currentTime = Date.now();
        const elapsed = currentTime - serverTimeDiff - timerStartTimestamp;
        return Math.max(0, elapsed);
      };
      
      // Update immediately
      dispatch(runShowUpdateElapsedTime(calculateElapsed()));
      
      // Start timer interval for continuous updates
      timerIntervalRef.current = setInterval(() => {
        dispatch(runShowUpdateElapsedTime(calculateElapsed()));
      }, 200);

      return () => {
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
      };
    } else {
      // Stop timer
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      dispatch(runShowUpdateElapsedTime(null));
    }
  }, [showState, activePerformerId, timerStartTimestamp, serverTimeDiff, dispatch]);

  // Memoize enabled modules calculation to prevent unnecessary re-renders
  const enabledModules = useMemo(() => {
    if (!show || !hiModules || hiModules.length === 0) {
      return [];
    }
    return determineEnabledModules(show);
  }, [show, hiModules, user]);

  // Set initial active module based on show state or default to Messaging
  useEffect(() => {
    if (enabledModules.length > 0 && !activeModule && show) {
      // Determine module based on current show state
      let initialModule = null;
      
      if (show.state) {
        switch (show.state) {
          case 'messaging':
            initialModule = 'messaging';
            break;
          case 'performing':
            initialModule = 'performing';
            break;
          case 'voting':
          case 'winner':
            initialModule = 'voting';
            break;
          case 'draw':
            initialModule = 'draw';
            break;
          case 'buzzer':
            initialModule = 'buzzer';
            break;
        }
      }
      
      // If state doesn't map to a module or no state, default to Messaging
      if (!initialModule || !enabledModules.includes(initialModule)) {
        // Default to Messaging if available, otherwise first non-channels module
        if (enabledModules.includes('messaging')) {
          initialModule = 'messaging';
        } else {
          // Find first module that's not channels
          initialModule = enabledModules.find(m => m !== 'channels') || enabledModules[0];
        }
      }
      
      setActiveModule(initialModule);
      
      // Set scroll position to initial module
      const initialIndex = enabledModules.indexOf(initialModule);
      setCurrentIndex(initialIndex);
      
      // Scroll to initial module after a brief delay to ensure layout is complete
      setTimeout(() => {
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollTo({
            x: initialIndex * SCREEN_WIDTH,
            animated: false,
          });
        }
      }, 100);
    }
  }, [enabledModules, activeModule, show]);

  // Handle scroll to update current index
  const handleScroll = (event) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    setCurrentIndex(index);
    if (enabledModules[index]) {
      setActiveModule(enabledModules[index]);
    }
  };

  // Render module component
  const renderModule = (module) => {
    switch (module) {
      case 'channels':
        return <ChannelsModule showId={showId} />;
      case 'messaging':
        return <MessagingModule showId={showId} />;
      case 'performing':
        return <PerformingModule showId={showId} />;
      case 'voting':
        return <VotingModule showId={showId} />;
      case 'draw':
        return <DrawModule showId={showId} />;
      case 'buzzer':
        return <BuzzerModule showId={showId} />;
      default:
        return (
          <View style={styles.fullScreenModule}>
            <Text style={styles.placeholderText}>Module not implemented</Text>
          </View>
        );
    }
  };

  if (loading && !show) {
    return (
      <View style={styles.container}>
        <Text>Loading show...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (enabledModules.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Run Show</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.fullScreenModule}>
          <Text style={styles.placeholderText}>No modules enabled for this show</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Run Show</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Status Bar */}
      <StatusBar activeModule={activeModule} />

      {/* Swipeable Modules */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        style={styles.swipeContainer}
        contentContainerStyle={styles.swipeContent}
      >
        {enabledModules.map((module) => (
          <View key={module} style={styles.moduleScreen}>
            {renderModule(module)}
          </View>
        ))}
      </ScrollView>

      {/* Module Indicator Dots */}
      {enabledModules.length > 1 && (
        <View style={styles.indicatorContainer}>
          {enabledModules.map((_, index) => (
            <View
              key={index}
              style={[
                styles.indicatorDot,
                index === currentIndex && styles.indicatorDotActive,
              ]}
            />
          ))}
        </View>
      )}

      {/* Footer */}
      <Footer showId={showId} show={show} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 5,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerRight: {
    width: 60, // Balance the back button width
  },
  swipeContainer: {
    flex: 1,
  },
  swipeContent: {
    flexDirection: 'row',
  },
  moduleScreen: {
    width: SCREEN_WIDTH,
    flex: 1,
  },
  fullScreenModule: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  placeholderText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
    padding: 20,
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: '#f5f5f5',
  },
  indicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ccc',
    marginHorizontal: 4,
  },
  indicatorDotActive: {
    backgroundColor: '#007AFF',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});

export default RunShow;

