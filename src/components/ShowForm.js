import React, { useState, useEffect, useRef } from 'react';
import { Alert, View, Text } from 'react-native';
import ShowFormPage1 from './ShowFormPage1';
import ShowFormPage2 from './ShowFormPage2';
import ShowFormPage3 from './ShowFormPage3';
import ShowFormPage4 from './ShowFormPage4';
import ShowFormPage5 from './ShowFormPage5';
import { useDispatch } from 'react-redux';
import { loadShow } from '../actions/showActions';
import ApiService from '../services/api';
import MultipartRequestService from '../services/multipartRequestService';
import { ErrorHandler } from '../utils/errorHandler';

const ShowForm = ({ showId, onCancel, onSave }) => {
  const dispatch = useDispatch();
  const [currentPage, setCurrentPage] = useState(showId ? 2 : 1); // Start on Page 2 if editing, Page 1 if new
  const [page1Data, setPage1Data] = useState(null);
  const [loadedShowId, setLoadedShowId] = useState(showId);
  const [slides, setSlides] = useState([]);
  const [editingSlide, setEditingSlide] = useState(null);
  const [editingSlideIndex, setEditingSlideIndex] = useState(null);
  const page4Ref = useRef(null);

  // Ensure we start on the correct page when showId changes
  useEffect(() => {
    if (showId) {
      // If we have a showId, we should be on page 2 (editing mode)
      if (currentPage === 1) {
        setCurrentPage(2);
      }
      // Reset page1Data when showId changes to force reload
      if (loadedShowId !== showId) {
        setPage1Data(null);
      }
    } else if (!showId && currentPage !== 1) {
      // If no showId, we should be on page 1 (new show mode)
      setCurrentPage(1);
      setPage1Data(null);
      setLoadedShowId(null);
    }
    // Update loadedShowId to match showId
    if (showId && loadedShowId !== showId) {
      setLoadedShowId(showId);
    }
  }, [showId]);

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

  const handlePage1Continue = (newShowId, data) => {
    setPage1Data(data);
    setLoadedShowId(newShowId);
    setCurrentPage(2);
  };

  const handlePage2Back = () => {
    if (showId) {
      // If editing, go back to shows list
      onCancel();
    } else {
      // If new show, go back to Page 1
      setCurrentPage(1);
    }
  };

  const handlePage2Save = (savedShow) => {
    if (onSave) {
      onSave(savedShow);
    }
  };

  const handlePage2NavigateToMessaging = () => {
    setCurrentPage(3);
  };

  const handlePage2NavigateToSlides = () => {
    setCurrentPage(4);
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

  // Check if a hi_module is selected (for Page 2 navigation)
  const hiModuleSelected = (moduleNames) => {
    if (!page1Data?.selectedHiModules) return false;
    // This will be checked in Page 2 itself
    return true;
  };

  if (currentPage === 1) {
    return (
      <ShowFormPage1
        showId={showId}
        onCancel={onCancel}
        onContinue={handlePage1Continue}
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
        onBack={handlePage2Back}
        onSave={handlePage2Save}
        onNavigateToMessaging={handlePage2NavigateToMessaging}
        onNavigateToSlides={handlePage2NavigateToSlides}
      />
    );
  }

  if (currentPage === 3) {
    return (
      <ShowFormPage3
        showId={loadedShowId}
        page1Data={page1Data}
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

  return null;
};

export default ShowForm;
