import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, FlatList, Image } from 'react-native';
import { useDispatch } from 'react-redux';
import { loadShow } from '../actions/showActions';
import ApiService from '../services/api';
import { COLORS } from '../constants/theme';

const ShowFormPage4 = forwardRef(({ showId, initialSlides, onBack, onEditSlide, onAddSlide, onSaveSlides }, ref) => {
  const dispatch = useDispatch();
  const [slides, setSlides] = useState(initialSlides || []);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialSlides) {
      setSlides(initialSlides);
    }
  }, [initialSlides]);

  useEffect(() => {
    if (showId && !initialSlides) {
      setLoading(true);
      dispatch(loadShow(showId)).then((show) => {
        if (show && show.custom_messages) {
          setSlides(show.custom_messages || []);
        }
        setLoading(false);
      });
    }
  }, [showId, dispatch, initialSlides]);


  const moveSlide = (index, direction) => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === slides.length - 1) return;

    const newSlides = [...slides];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    const temp = newSlides[index];
    newSlides[index] = newSlides[swapIndex];
    newSlides[swapIndex] = temp;
    setSlides(newSlides);
  };

  const removeSlide = (slide, index) => {
    Alert.alert(
      'Delete Slide',
      `Are you sure you want to delete "${slide.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const newSlides = slides.filter((_, i) => i !== index);
            setSlides(newSlides);
          },
        },
      ]
    );
  };

  const handleEditSlide = (slide, index) => {
    if (onEditSlide) {
      onEditSlide(slide, index);
    }
  };

  // Expose slides state to parent
  useImperativeHandle(ref, () => ({
    slides,
    setSlides,
  }));

  const handleAddSlide = () => {
    if (onAddSlide) {
      onAddSlide();
    }
  };

  const handleSave = async () => {
    if (!onSaveSlides) {
      // If no save handler, just go back
      onBack();
      return;
    }

    setSaving(true);
    try {
      const result = await onSaveSlides(slides);
      setSaving(false);
      if (result && result.success) {
        onBack();
      } else {
        Alert.alert('Error', result?.error || 'Failed to save slides');
      }
    } catch (error) {
      setSaving(false);
      Alert.alert('Error', error.message || 'Failed to save slides');
    }
  };

  const getSlideTypeLabel = (bodyType) => {
    const types = {
      single: 'Text',
      dual: 'Split Text',
      image: 'Image',
      video: 'Video',
      slide: 'Slide',
      link: 'Link',
    };
    return types[bodyType] || bodyType;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loading}>Loading slides...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Slides</Text>
        </View>
        <View style={styles.headerRight}>
          <Image 
            source={require('../../assets/hi_logo.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
      </View>

      {slides.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>You do not have any slides.</Text>
          <Text style={styles.emptyText}>Click the + Add New button to add one!</Text>
        </View>
      ) : (
        <FlatList
          data={slides}
          keyExtractor={(item, index) => `${item.id || index}-${index}`}
          renderItem={({ item, index }) => (
            <View style={[styles.slideItem, index % 2 === 0 ? styles.slideItemEven : styles.slideItemOdd]}>
              <View style={styles.slideControls}>
                <TouchableOpacity
                  style={[styles.controlButton, index === 0 && styles.controlButtonDisabled]}
                  onPress={() => moveSlide(index, 'up')}
                  disabled={index === 0}
                >
                  <Text style={styles.controlButtonText}>⬆️</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.controlButton, index === slides.length - 1 && styles.controlButtonDisabled]}
                  onPress={() => moveSlide(index, 'down')}
                  disabled={index === slides.length - 1}
                >
                  <Text style={styles.controlButtonText}>⬇️</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.slideInfo}>
                <Text style={styles.slideNumber}>{index + 1}.</Text>
                <View style={styles.slideDetails}>
                  <Text style={styles.slideName}>{item.name}</Text>
                  <Text style={styles.slideType}>{getSlideTypeLabel(item.body_type)}</Text>
                </View>
              </View>
              <View style={styles.slideActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleEditSlide(item, index)}
                >
                  <Text style={styles.actionButtonText}>✏️</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => removeSlide(item, index)}
                >
                  <Text style={styles.actionButtonText}>❌</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddSlide}
        >
          <Text style={styles.addButtonText}>+ Add New</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.backButton, saving && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.backButtonText}>
            {saving ? 'Saving...' : 'Save & Done'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: COLORS.TEAL,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  logo: {
    width: 48,
    height: 48,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
  slideItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  slideItemEven: {
    backgroundColor: '#f9f9f9',
  },
  slideItemOdd: {
    backgroundColor: '#fff',
  },
  slideControls: {
    flexDirection: 'row',
    marginRight: 15,
  },
  controlButton: {
    padding: 5,
    marginRight: 5,
  },
  controlButtonDisabled: {
    opacity: 0.3,
  },
  controlButtonText: {
    fontSize: 18,
  },
  slideInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  slideNumber: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 10,
    minWidth: 30,
  },
  slideDetails: {
    flex: 1,
  },
  slideName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  slideType: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  slideActions: {
    flexDirection: 'row',
    marginLeft: 10,
  },
  actionButton: {
    padding: 10,
    marginLeft: 5,
  },
  actionButtonText: {
    fontSize: 18,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  backButton: {
    backgroundColor: '#007AFF',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  loading: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
  },
});

export default ShowFormPage4;

