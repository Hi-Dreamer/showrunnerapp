import React, { useState, useEffect, useRef } from 'react';
import { Alert, View, Text } from 'react-native';
import ShowFormPage1 from './ShowFormPage1';
import ShowFormPage2 from './ShowFormPage2';
import ShowFormPage3 from './ShowFormPage3';
import ShowFormPage4 from './ShowFormPage4';
import ShowFormPage5 from './ShowFormPage5';
import ShowFormPage6 from './ShowFormPage6';
import CopyEditPage from './CopyEditPage';
import { useDispatch } from 'react-redux';
import { loadShow, updateShow } from '../actions/showActions';
import ApiService from '../services/api';
import MultipartRequestService from '../services/multipartRequestService';
import { ErrorHandler } from '../utils/errorHandler';
import { DateUtils } from '../utils/dateUtils';

const ShowForm = ({ showId, copyFromShow, startOnPage1, onCancel, onSave }) => {
  const dispatch = useDispatch();
  // If copying, start on page 2 (skip page 1) but treat as new show (showId = null)
  // If startOnPage1 is true, always start on page 1
  const [currentPage, setCurrentPage] = useState(
    startOnPage1 ? 1 : ((showId || copyFromShow) ? 2 : 1)
  );
  const [page1Data, setPage1Data] = useState(null);
  const [loadedShowId, setLoadedShowId] = useState(showId);
  const [slides, setSlides] = useState([]);
  const [editingSlide, setEditingSlide] = useState(null);
  const [editingSlideIndex, setEditingSlideIndex] = useState(null);
  const [performers, setPerformers] = useState([]);
  const [copyShowData, setCopyShowData] = useState(copyFromShow); // Store the show data to copy from
  const page4Ref = useRef(null);
  const page6Ref = useRef(null);

  // Ensure we start on the correct page when showId or copyFromShow changes
  useEffect(() => {
    if (showId) {
      // If we have a showId, check if we should start on page 1 (basic info edit) or page 2 (full edit)
      if (startOnPage1) {
        // Basic info edit mode - stay on page 1
        if (currentPage !== 1) {
          setCurrentPage(1);
        }
      } else {
        // Full edit mode - go to page 2
        if (currentPage === 1) {
          setCurrentPage(2);
        }
      }
      // Reset page1Data when showId changes to force reload
      if (loadedShowId !== showId) {
        setPage1Data(null);
      }
    } else if (copyFromShow) {
      // If copying, start on page 2 but treat as new show
      if (currentPage === 1) {
        setCurrentPage(2);
      }
      // Pre-populate page1Data from copyFromShow
      if (!page1Data) {
        setPage1Data({
          name: copyFromShow.name || '',
          code: copyFromShow.code || '',
          venueId: copyFromShow.venue_id || -1,
          selectedHiModules: copyFromShow.hi_module_ids || [],
        });
        if (copyFromShow.custom_messages) {
          setSlides(copyFromShow.custom_messages || []);
        }
      }
      setLoadedShowId(null); // No showId since it's a new show
    } else if (!showId && !copyFromShow && !loadedShowId && currentPage !== 1) {
      // If no showId, not copying, and no loadedShowId, we should be on page 1 (new show mode)
      // But if loadedShowId is set (from creating a new show), allow page 2
      setCurrentPage(1);
      setPage1Data(null);
      setLoadedShowId(null);
    }
    // Update loadedShowId to match showId
    if (showId && loadedShowId !== showId) {
      setLoadedShowId(showId);
    }
    // Update copyShowData when copyFromShow changes
    if (copyFromShow && copyShowData !== copyFromShow) {
      setCopyShowData(copyFromShow);
    }
  }, [showId, copyFromShow, startOnPage1, currentPage, loadedShowId, page1Data, copyShowData]);

  // If editing, load show data for Page 1
  useEffect(() => {
    if (showId && currentPage === 2 && !page1Data) {
      dispatch(loadShow(showId)).then((show) => {
        if (show) {
          setPage1Data({
            name: show.name || '',
            code: show.code || '',
            venueId: show.venue_id || -1,
            selectedHiModules: show.hi_module_ids || [],
          });
          setLoadedShowId(showId);
          if (show.custom_messages) {
            setSlides(show.custom_messages || []);
          }
          // Load performers
          if (show.performer_ids && show.performer_ids.length > 0) {
            const loadPerformers = async () => {
              try {
                const api = ApiService.getClient();
                const performersData = await api.performers.get({ show_id: showId });
                setPerformers(performersData || []);
              } catch (error) {
                console.error('Error loading performers:', error);
              }
            };
            loadPerformers();
          }
        }
      }).catch((error) => {
        console.error('Error loading show:', error);
        // On error, go back to shows list
        if (onCancel) {
          onCancel();
        }
      });
    }
  }, [showId, currentPage, page1Data, dispatch, onCancel]);
  
  // If copying, pre-populate page1Data from copyShowData
  useEffect(() => {
    if (copyShowData && !showId && !page1Data) {
      setPage1Data({
        name: copyShowData.name || '',
        code: copyShowData.code || '',
        venueId: copyShowData.venue_id || -1,
        selectedHiModules: copyShowData.hi_module_ids || [],
      });
      // Pre-populate slides from copyShowData (should be loaded in ShowsList)
      if (copyShowData.custom_messages && Array.isArray(copyShowData.custom_messages)) {
        setSlides(copyShowData.custom_messages);
      }
    }
  }, [copyShowData, showId, page1Data]);

  const handlePage1Continue = (newShowId, data) => {
    setPage1Data(data);
    setLoadedShowId(newShowId);
    // Move to page 2 - loadedShowId being set prevents useEffect from resetting to page 1
    setCurrentPage(2);
  };

  const handlePage2Back = () => {
    if (showId || loadedShowId) {
      // If editing or after creating from copy, go back to shows list
      if (onSave && loadedShowId && !showId) {
        // If we just created a show from copy, save it
        onSave({ id: loadedShowId });
      }
      onCancel();
    } else if (copyFromShow) {
      // If copying but haven't saved yet, go back to shows list
      onCancel();
    } else {
      // If new show, go back to Page 1
      setCurrentPage(1);
    }
  };

  const handleCopySave = (savedShow) => {
    // After copying, exit the form and refresh lists
    if (savedShow && savedShow.id) {
      // Clear copy mode and exit
      setCopyShowData(null);
      if (onSave) {
        onSave(savedShow);
      }
    }
  };

  const handlePage2Save = (savedShow) => {
    // Normal edit flow
    if (!copyFromShow && onSave) {
      onSave(savedShow);
    }
  };

  const handlePage2NavigateToMessaging = () => {
    setCurrentPage(3);
  };

  const handlePage2NavigateToSlides = () => {
    setCurrentPage(4);
  };

  const handlePage2NavigateToPerformers = () => {
    setCurrentPage(6);
  };

  const handlePage3Back = () => {
    setCurrentPage(2);
  };

  const handlePage3Save = (savedShow) => {
    // After saving messaging, go back to Page 2
    setCurrentPage(2);
  };

  const handlePage4Back = () => {
    setCurrentPage(2);
  };

  const handlePage4EditSlide = (slide, index) => {
    setEditingSlide(slide);
    setEditingSlideIndex(index);
    setCurrentPage(5);
  };

  const handlePage4AddSlide = () => {
    setEditingSlide(null);
    setEditingSlideIndex(null);
    setCurrentPage(5);
  };

  const handlePage4SaveSlides = async (slidesToSave) => {
    try {
      if (!loadedShowId) {
        Alert.alert('Error', 'No show ID available');
        return { success: false, error: 'No show ID available' };
      }

      // Use MultipartRequestService to handle all slide saving logic
      const result = await MultipartRequestService.saveSlides(loadedShowId, slidesToSave);

      // Handle any errors that occurred during saving
      if (result.errors && result.errors.length > 0) {
        const errorMessages = result.errors.map(e => `${e.slide.name || 'Unnamed'}: ${e.error}`).join('\n');
        Alert.alert('Some Slides Failed to Save', errorMessages);
      }

      // Update local state with saved slides
      setSlides(slidesToSave);
      
      return { success: result.errors.length === 0, slides: result.slides };
    } catch (error) {
      const errorMessage = await ErrorHandler.handleError(error, 'handlePage4SaveSlides');
      Alert.alert('Error Saving Slides', errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const handlePage5Save = (slideData) => {
    // Get current slides from Page 4 if available, otherwise use state
    const currentSlides = page4Ref.current?.slides || slides;
    const newSlides = [...currentSlides];
    if (editingSlideIndex !== null && editingSlideIndex >= 0) {
      // Update existing slide
      newSlides[editingSlideIndex] = { ...newSlides[editingSlideIndex], ...slideData };
    } else {
      // Add new slide
      newSlides.push(slideData);
    }
    setSlides(newSlides);
    // Update Page 4's slides state
    if (page4Ref.current && page4Ref.current.setSlides) {
      page4Ref.current.setSlides(newSlides);
    }
    setEditingSlide(null);
    setEditingSlideIndex(null);
    setCurrentPage(4);
  };

  const handlePage5Cancel = () => {
    setEditingSlide(null);
    setEditingSlideIndex(null);
    setCurrentPage(4);
  };

  const handlePage6Back = () => {
    setCurrentPage(2);
  };

  const handlePage6SavePerformers = async (performersToSave) => {
    try {
      if (!loadedShowId) {
        Alert.alert('Error', 'No show ID available');
        return { success: false, error: 'No show ID available' };
      }

      // Load the current show to get existing dates and other required fields
      const currentShow = await dispatch(loadShow(loadedShowId));
      if (!currentShow) {
        return { success: false, error: 'Failed to load show data' };
      }

      // Build show data with existing fields preserved (like ShowFormPage3 does)
      const showData = {
        name: page1Data?.name || currentShow.name,
        code: page1Data?.code || currentShow.code || null,
        venue_id: page1Data?.venueId || currentShow.venue_id || null,
        // Include existing dates to avoid validation errors
        show_datetime: currentShow.show_datetime ? DateUtils.formatForAPI(new Date(currentShow.show_datetime)) : null,
        show_end_datetime: currentShow.show_end_datetime ? DateUtils.formatForAPI(new Date(currentShow.show_end_datetime)) : null,
        // Include other required fields
        tv_theme: currentShow.tv_theme || 'light',
        tv_score_visible: currentShow.tv_score_visible || false,
        // Update performer_ids
        performer_ids: performersToSave.length > 0 ? performersToSave.map(p => p.id) : null,
      };
      
      const result = await dispatch(updateShow(loadedShowId, showData));
      if (result.success) {
        // Reload show to get updated performers
        await dispatch(loadShow(loadedShowId));
        // Update local state
        setPerformers(performersToSave);
        return { success: true, performers: performersToSave };
      } else {
        // updateShow already handled the error and returned a user-friendly message
        return { success: false, error: result.error || 'Failed to save performers' };
      }
    } catch (error) {
      // Only use ErrorHandler if updateShow didn't already handle it
      // updateShow should catch errors internally, so this is a fallback
      const errorMessage = error.message || 'Failed to save performers';
      return { success: false, error: errorMessage };
    }
  };

  // Check if a hi_module is selected (for Page 2 navigation)
  const hiModuleSelected = (moduleNames) => {
    if (!page1Data?.selectedHiModules) return false;
    // This will be checked in Page 2 itself
    return true;
  };

  // If copying, show CopyEditPage instead of normal flow
  if (copyFromShow && !showId) {
    // Ensure we have page1Data for copying
    if (!page1Data && copyShowData) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text>Loading...</Text>
        </View>
      );
    }
    
    return (
      <CopyEditPage
        copyShowData={copyShowData}
        page1Data={page1Data}
        onCancel={onCancel}
        onSave={handleCopySave}
      />
    );
  }

  if (currentPage === 1) {
    return (
      <ShowFormPage1
        showId={showId}
        onCancel={onCancel}
        onContinue={handlePage1Continue}
        isBasicInfoEdit={startOnPage1}
      />
    );
  }

  if (currentPage === 2) {
    // Page 2 - need page1Data loaded when editing
    if (showId && !page1Data) {
      // Still loading show data, show loading state
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text>Loading show...</Text>
        </View>
      );
    }

    // For new shows, page1Data should come from Page 1
    if (!showId && !page1Data) {
      // Shouldn't happen, but just in case
      return null;
    }

    return (
      <ShowFormPage2
        showId={loadedShowId}
        page1Data={page1Data}
        copyShowData={copyShowData}
        initialPerformers={performers}
        onBack={handlePage2Back}
        onSave={handlePage2Save}
        onNavigateToMessaging={handlePage2NavigateToMessaging}
        onNavigateToSlides={handlePage2NavigateToSlides}
        onNavigateToPerformers={handlePage2NavigateToPerformers}
      />
    );
  }

  if (currentPage === 3) {
    return (
      <ShowFormPage3
        showId={loadedShowId}
        page1Data={page1Data}
        copyShowData={copyShowData}
        onBack={handlePage3Back}
        onSave={handlePage3Save}
      />
    );
  }

  if (currentPage === 4) {
    return (
      <ShowFormPage4
        ref={page4Ref}
        showId={loadedShowId}
        initialSlides={slides}
        onBack={handlePage4Back}
        onEditSlide={handlePage4EditSlide}
        onAddSlide={handlePage4AddSlide}
        onSaveSlides={handlePage4SaveSlides}
      />
    );
  }

  if (currentPage === 5) {
    return (
      <ShowFormPage5
        slide={editingSlide}
        slideIndex={editingSlideIndex}
        onSave={handlePage5Save}
        onCancel={handlePage5Cancel}
      />
    );
  }

  if (currentPage === 6) {
    return (
      <ShowFormPage6
        ref={page6Ref}
        showId={loadedShowId}
        initialPerformers={performers}
        page1Data={page1Data}
        loadedShow={null}
        onBack={handlePage6Back}
        onSavePerformers={handlePage6SavePerformers}
      />
    );
  }

  return null;
};

export default ShowForm;
