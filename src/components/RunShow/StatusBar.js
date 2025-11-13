import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';

/**
 * StatusBar Component
 * Displays current show state at the top of Run Show interface
 */
const StatusBar = ({ activeModule }) => {
  const { 
    showState, 
    activePerformerName, 
    activePerformerId,
    activeSlideName, 
    customMessagesCycling, 
    elapsedTime,
    votingType,
    voteCounts,
    pickCounts,
    buzzerState,
    buzzerCount,
    buzzerWinners,
    drawState,
    drawWinners,
    setTimes
  } = useSelector((state) => state.runShow);

  // Format time as mm:ss
  const formatTime = (milliseconds) => {
    if (milliseconds === null || milliseconds === undefined) {
      return '00:00';
    }
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  // Get module name display
  const getModuleName = () => {
    if (!activeModule) return '';
    
    const moduleNames = {
      'channels': 'Channels',
      'messaging': 'Slides',
      'performing': 'Performing',
      'voting': 'Voting',
      'draw': 'Draw',
      'buzzer': 'Buzzer',
    };
    
    return moduleNames[activeModule] || activeModule;
  };

  // Check if module matches show state
  const moduleMatchesState = () => {
    if (!activeModule || !showState) return false;
    
    const stateMap = {
      'messaging': 'messaging',
      'performing': 'performing',
      'voting': ['voting', 'winner'],
      'draw': 'draw',
      'buzzer': 'buzzer',
    };
    
    const expectedStates = stateMap[activeModule];
    if (Array.isArray(expectedStates)) {
      return expectedStates.includes(showState);
    }
    return expectedStates === showState;
  };

  // Get status text and left side info (based on CURRENT SHOW STATE)
  const getStatusInfo = () => {
    if (!showState) {
      return {
        statusText: 'Ready to Start',
        statusInfo: null,
      };
    }

    switch (showState) {
      case 'messaging':
        const slideStatus = customMessagesCycling 
          ? 'Cycling' 
          : (activeSlideName || 'No Slide');
        return {
          statusText: customMessagesCycling 
            ? 'Showing Slides (cycling)' 
            : (activeSlideName ? `Showing ${activeSlideName}` : 'Showing Slide'),
          statusInfo: slideStatus,
        };
      
      case 'performing':
        const performerTime = activePerformerId && setTimes && Array.isArray(setTimes)
          ? setTimes.find(st => st.performer_id === activePerformerId)
          : null;
        return {
          statusText: activePerformerName 
            ? `Now Performing - ${activePerformerName}` 
            : 'Now Performing',
          statusInfo: performerTime ? `Set Time: ${performerTime.set_time}` : null,
        };
      
      case 'voting':
        if (votingType === 'star_rating') {
          const voteInfo = activePerformerId && voteCounts[activePerformerId]
            ? (() => {
                const { count, total } = voteCounts[activePerformerId];
                const avg = count > 0 ? (total / count).toFixed(1) : '0.0';
                return `Performer: ${activePerformerName || 'N/A'}\nRating: ${avg}`;
              })()
            : null;
          return {
            statusText: 'Now Voting',
            statusInfo: voteInfo,
          };
        } else if (votingType === 'pick') {
          const totalPicks = Object.values(pickCounts).reduce((sum, count) => sum + count, 0);
          return {
            statusText: 'Now Voting',
            statusInfo: `Total Picks: ${totalPicks}`,
          };
        }
        return {
          statusText: 'Now Voting',
          statusInfo: null,
        };
      
      case 'winner':
        return {
          statusText: activePerformerName 
            ? `The Winner is ${activePerformerName}!` 
            : 'Winner Announced',
          statusInfo: null,
        };
      
      case 'draw':
        const drawCount = drawWinners ? drawWinners.length : 0;
        const drawStateText = drawState ? drawState.replace(/_/g, ' ').toUpperCase() : '';
        return {
          statusText: 'Random Draw',
          statusInfo: `Draw Count: ${drawCount}\nState: ${drawStateText}`,
        };
      
      case 'buzzer':
        const buzzCount = buzzerWinners ? buzzerWinners.length : 0;
        const buzzState = buzzerState ? buzzerState.replace(/_/g, ' ').toUpperCase() : '';
        return {
          statusText: 'Game Buzzer',
          statusInfo: `Buzz In: ${buzzCount}\nState: ${buzzState}`,
        };
      
      default:
        return {
          statusText: 'Ready to Start',
          statusInfo: null,
        };
    }
  };

  // Helper to parse time string "mm:ss" to milliseconds
  const parseTimeString = (timeString) => {
    if (!timeString || typeof timeString !== 'string') return 0;
    const parts = timeString.split(':');
    if (parts.length !== 2) return 0;
    const minutes = parseInt(parts[0], 10) || 0;
    const seconds = parseInt(parts[1], 10) || 0;
    return (minutes * 60 + seconds) * 1000;
  };

  // Get module-specific right side info (based on ACTIVE MODULE being viewed)
  // But prioritize showing set time when performing
  const getModuleInfo = () => {
    // If performing, always show set time on the right (using real-time elapsed time)
    if (showState === 'performing') {
      let currentTimeMs = 0;
      let totalTimeMs = 0;
      
      // Get current session time (real-time)
      if (elapsedTime !== null && elapsedTime !== undefined) {
        currentTimeMs = elapsedTime;
      } else if (activePerformerId && setTimes && Array.isArray(setTimes)) {
        const performerTime = setTimes.find(st => st.performer_id === activePerformerId);
        if (performerTime && performerTime.set_time) {
          currentTimeMs = parseTimeString(performerTime.set_time);
        }
      }
      
      // Get total accumulated time from previous sessions
      // Expected API response format from GET /shows/:id/set_times:
      // [
      //   {
      //     "performer_id": 1,
      //     "set_time": "05:23",        // Current session time
      //     "set_start": "2024-01-15T10:30:00Z",
      //     "total_time": "12:45"       // REQUIRED: Total accumulated time across all sessions
      //   }
      // ]
      // See BACKEND_API_SPEC_SET_TIMES.md for full specification
      if (activePerformerId && setTimes && Array.isArray(setTimes)) {
        const performerTime = setTimes.find(st => st.performer_id === activePerformerId);
        if (performerTime) {
          // Check for total_time field (accumulated from previous sessions)
          if (performerTime.total_time) {
            const previousTotalMs = parseTimeString(performerTime.total_time);
            // Total = previous sessions + current session
            totalTimeMs = previousTotalMs + currentTimeMs;
          } else {
            // No total_time field, so this is first session - total equals current
            // TODO: Remove this fallback once backend implements total_time field
            totalTimeMs = currentTimeMs;
          }
        }
      }
      
      // If no data, both are 0
      if (currentTimeMs === 0 && totalTimeMs === 0) {
        return 'Set Time: 00:00\nTotal: 00:00';
      }
      
      return `Set Time: ${formatTime(currentTimeMs)}\nTotal: ${formatTime(totalTimeMs)}`;
    }

    if (!activeModule) return null;

    switch (activeModule) {
      case 'buzzer':
        const buzzCount = buzzerWinners ? buzzerWinners.length : 0;
        const buzzState = buzzerState ? buzzerState.replace(/_/g, ' ').toUpperCase() : '';
        return `Buzz In: ${buzzCount}\nState: ${buzzState}`;

      case 'draw':
        const drawCount = drawWinners ? drawWinners.length : 0;
        const drawStateText = drawState ? drawState.replace(/_/g, ' ').toUpperCase() : '';
        return `Draw Count: ${drawCount}\nState: ${drawStateText}`;

      case 'voting':
        if (votingType === 'star_rating') {
          if (activePerformerId && voteCounts[activePerformerId]) {
            const { count, total } = voteCounts[activePerformerId];
            const avg = count > 0 ? (total / count).toFixed(1) : '0.0';
            return `Performer: ${activePerformerName || 'N/A'}\nRating: ${avg}`;
          }
          return null;
        } else if (votingType === 'pick') {
          const totalPicks = Object.values(pickCounts).reduce((sum, count) => sum + count, 0);
          return `Total Picks: ${totalPicks}`;
        }
        return null;

      case 'messaging':
        if (customMessagesCycling) {
          return 'Cycling';
        }
        return activeSlideName || 'No Slide';

      case 'channels':
        return null;

      case 'performing':
        // This case is now handled above when showState === 'performing'
        return null;

      default:
        return null;
    }
  };

  const moduleName = getModuleName();
  const statusInfo = getStatusInfo();
  const moduleInfo = getModuleInfo();
  const matchesState = moduleMatchesState();

  return (
    <View style={styles.container}>
      <View style={styles.contentRow}>
        {/* Left: Current Show State Info */}
        <View style={styles.leftSection}>
          <Text style={styles.statusLabel}>Status:</Text>
          <Text style={styles.statusText}>{statusInfo.statusText}</Text>
          {statusInfo.statusInfo && (
            <Text style={styles.statusInfo}>{statusInfo.statusInfo}</Text>
          )}
        </View>

        {/* Center: Module Name */}
        <View style={styles.centerSection}>
          <Text style={[
            styles.moduleName,
            matchesState ? styles.moduleNameGreen : styles.moduleNameRed
          ]}>
            {moduleName}
          </Text>
        </View>

        {/* Right: Active Module Info */}
        <View style={styles.rightSection}>
          {moduleInfo && (
            <Text style={styles.moduleInfo}>{moduleInfo}</Text>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  contentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftSection: {
    flex: 1,
    alignItems: 'flex-start',
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
  },
  rightSection: {
    flex: 1,
    alignItems: 'flex-end',
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 2,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  statusInfo: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  moduleName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  moduleNameGreen: {
    color: '#34C759',
  },
  moduleNameRed: {
    color: '#FF3B30',
  },
  moduleInfo: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    lineHeight: 16,
  },
});

export default StatusBar;


