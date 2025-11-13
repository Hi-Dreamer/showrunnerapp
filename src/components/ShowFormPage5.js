import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

const ShowFormPage5 = ({ slide, slideIndex, onSave, onCancel }) => {
  const isEditing = slide !== null && slideIndex !== null;

  const [name, setName] = useState('');
  const [nameError, setNameError] = useState(false);
  const [bodyType, setBodyType] = useState('single');
  
  // Single/Dual fields
  const [body, setBody] = useState('');
  const [bodyTv, setBodyTv] = useState('');
  
  // Link fields
  const [linkUrl, setLinkUrl] = useState('');
  const [linkUrlError, setLinkUrlError] = useState(false);
  const [buttonText, setButtonText] = useState('');
  const [buttonTextError, setButtonTextError] = useState(false);
  
  // Video fields
  const [videoUrl, setVideoUrl] = useState('');
  const [videoMinutes, setVideoMinutes] = useState('0');
  const [videoSeconds, setVideoSeconds] = useState('0');
  const [videoStartMinutes, setVideoStartMinutes] = useState('0');
  const [videoStartSeconds, setVideoStartSeconds] = useState('0');
  
  // Image field
  const [imageUri, setImageUri] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => {
    if (isEditing && slide) {
      setName(slide.name || '');
      setBodyType(slide.body_type || 'single');
      setBody(slide.body || '');
      setBodyTv(slide.body_tv || '');
      setLinkUrl(slide.link_url || '');
      setButtonText(slide.button_text || '');
      setVideoUrl(slide.video_url || '');
      setVideoMinutes(String(slide.minutes || 0));
      setVideoSeconds(String(slide.seconds || 0));
      setVideoStartMinutes(String(slide.start_minutes || 0));
      setVideoStartSeconds(String(slide.start_seconds || 0));
      setImageUrl(slide.image_url || '');
      setImageUri(slide.image_url || null);
      setImageFile(null); // Don't set file when editing existing slide
    } else {
      // Reset for new slide
      setName('');
      setBodyType('single');
      setBody('');
      setBodyTv('');
      setLinkUrl('');
      setButtonText('');
      setVideoUrl('');
      setVideoMinutes('0');
      setVideoSeconds('0');
      setVideoStartMinutes('0');
      setVideoStartSeconds('0');
      setImageUrl('');
      setImageUri(null);
      setImageFile(null);
    }
  }, [isEditing, slide]);

  const handleSave = () => {
    let hasError = false;

    if (!name.trim()) {
      setNameError(true);
      hasError = true;
    }

    if (bodyType === 'link') {
      if (!linkUrl.trim()) {
        setLinkUrlError(true);
        hasError = true;
      }
      if (!buttonText.trim()) {
        setButtonTextError(true);
        hasError = true;
      }
    }

    if (hasError) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const slideData = {
      name: name.trim(),
      body_type: bodyType,
      body: body || null,
      body_tv: bodyTv || null,
      link_url: linkUrl || null,
      button_text: buttonText || null,
      video_url: videoUrl || null,
      minutes: bodyType === 'video' ? parseInt(videoMinutes) : null,
      seconds: bodyType === 'video' ? parseInt(videoSeconds) : null,
      start_minutes: bodyType === 'video' ? parseInt(videoStartMinutes) : null,
      start_seconds: bodyType === 'video' ? parseInt(videoStartSeconds) : null,
    };

    // Include id if editing existing slide
    if (isEditing && slide.id) {
      slideData.id = slide.id;
    }

    // Handle image - only include if it's a new file to upload or being removed
    // Don't send image_url - that's only for display
    if (imageFile && imageFile.uri) {
      // New image file to upload
      slideData.image = imageFile;
    } else if (isEditing && slide.image_url && !imageUri && !imageFile) {
      // Editing existing slide that had an image, but user removed it
      // (imageUri is null/empty but slide originally had image_url)
      slideData.image = '';
    }
    // If editing and no image change (imageUri still matches slide.image_url), 
    // don't include image field at all - Rails will keep the existing image

    if (onSave) {
      onSave(slideData);
    }
  };

  const renderBodyTypeSelector = () => {
    return (
      <View style={styles.bodyTypeSelector}>
        <TouchableOpacity
          style={[styles.bodyTypeButton, bodyType === 'single' && styles.bodyTypeButtonActive]}
          onPress={() => setBodyType('single')}
        >
          <Text style={[styles.bodyTypeButtonText, bodyType === 'single' && styles.bodyTypeButtonTextActive]}>
            Text
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.bodyTypeButton, bodyType === 'dual' && styles.bodyTypeButtonActive]}
          onPress={() => setBodyType('dual')}
        >
          <Text style={[styles.bodyTypeButtonText, bodyType === 'dual' && styles.bodyTypeButtonTextActive]}>
            Split Text
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.bodyTypeButton, bodyType === 'link' && styles.bodyTypeButtonActive]}
          onPress={() => setBodyType('link')}
        >
          <Text style={[styles.bodyTypeButtonText, bodyType === 'link' && styles.bodyTypeButtonTextActive]}>
            Link
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.bodyTypeButton, bodyType === 'image' && styles.bodyTypeButtonActive]}
          onPress={() => setBodyType('image')}
        >
          <Text style={[styles.bodyTypeButtonText, bodyType === 'image' && styles.bodyTypeButtonTextActive]}>
            Image
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.bodyTypeButton, bodyType === 'video' && styles.bodyTypeButtonActive]}
          onPress={() => setBodyType('video')}
        >
          <Text style={[styles.bodyTypeButtonText, bodyType === 'video' && styles.bodyTypeButtonTextActive]}>
            Video
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderContentFields = () => {
    switch (bodyType) {
      case 'single':
        return (
          <View style={styles.field}>
            <Text style={styles.label}>Slide Text *</Text>
            <Text style={styles.description}>(Will appear on both the TVs and mobile devices)</Text>
            <TextInput
              style={[styles.textArea, nameError && styles.inputError]}
              value={body}
              onChangeText={(text) => {
                setBody(text);
                setNameError(false);
              }}
              placeholder="Enter slide text"
              multiline
              numberOfLines={6}
            />
          </View>
        );

      case 'dual':
        return (
          <>
            <View style={styles.field}>
              <Text style={styles.label}>Slide Text Mobile *</Text>
              <Text style={styles.description}>(Will appear on ONLY the mobile devices)</Text>
              <TextInput
                style={styles.textArea}
                value={body}
                onChangeText={setBody}
                placeholder="Enter mobile text"
                multiline
                numberOfLines={4}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Slide Text TV *</Text>
              <Text style={styles.description}>(Will appear on ONLY the TVs)</Text>
              <TextInput
                style={styles.textArea}
                value={bodyTv}
                onChangeText={setBodyTv}
                placeholder="Enter TV text"
                multiline
                numberOfLines={4}
              />
            </View>
          </>
        );

      case 'link':
        return (
          <>
            <View style={styles.field}>
              <Text style={styles.label}>Link URL *</Text>
              <Text style={styles.description}>(User goes here when button clicked)</Text>
              <TextInput
                style={[styles.input, linkUrlError && styles.inputError]}
                value={linkUrl}
                onChangeText={(text) => {
                  setLinkUrl(text);
                  setLinkUrlError(false);
                }}
                placeholder="https://example.com"
                keyboardType="url"
                autoCapitalize="none"
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Button Text *</Text>
              <Text style={styles.description}>(Text user sees on the button)</Text>
              <TextInput
                style={[styles.input, buttonTextError && styles.inputError]}
                value={buttonText}
                onChangeText={(text) => {
                  setButtonText(text);
                  setButtonTextError(false);
                }}
                placeholder="Click Here"
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Link Text Mobile</Text>
              <Text style={styles.description}>(Will appear on mobile devices above button)</Text>
              <TextInput
                style={styles.textArea}
                value={body}
                onChangeText={setBody}
                placeholder="Enter mobile text"
                multiline
                numberOfLines={4}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Link Text TV</Text>
              <Text style={styles.description}>(Will appear on ONLY the TVs)</Text>
              <TextInput
                style={styles.textArea}
                value={bodyTv}
                onChangeText={setBodyTv}
                placeholder="Enter TV text"
                multiline
                numberOfLines={4}
              />
            </View>
          </>
        );

      case 'image':
        return (
          <View style={styles.field}>
            <Text style={styles.label}>Slide Image</Text>
            <Text style={styles.description}>(Will appear on both the TVs and mobile devices)</Text>
            
            {imageUri && (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: imageUri }} style={styles.imagePreview} resizeMode="contain" />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => {
                    setImageUri(null);
                    setImageFile(null);
                    setImageUrl('');
                  }}
                >
                  <Text style={styles.removeImageButtonText}>Remove Image</Text>
                </TouchableOpacity>
              </View>
            )}
            
            {!imageUri && (
              <TouchableOpacity
                style={styles.imagePickerButton}
                onPress={async () => {
                  try {
                    // Request permission
                    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                    if (status !== 'granted') {
                      Alert.alert('Permission needed', 'Sorry, we need camera roll permissions to select images!');
                      return;
                    }

                    // Launch image picker (no cropping, just select and upload)
                    // Use string 'images' for mediaTypes (MediaType.Images may not be available in all versions)
                    const result = await ImagePicker.launchImageLibraryAsync({
                      mediaTypes: 'images',
                      allowsEditing: false,
                      quality: 0.8,
                    });

                    if (!result.canceled && result.assets && result.assets[0]) {
                      const asset = result.assets[0];
                      setImageUri(asset.uri);
                      setImageUrl(asset.uri);
                      
                      // Create a file object for upload
                      // In React Native, we'll need to convert the URI to a file
                      // For now, store the URI and handle conversion during upload
                      setImageFile({
                        uri: asset.uri,
                        type: asset.type || 'image/jpeg',
                        name: asset.fileName || 'image.jpg',
                      });
                    }
                  } catch (error) {
                    console.error('Error picking image:', error);
                    Alert.alert('Error', 'Failed to pick image. Please try again.');
                  }
                }}
              >
                <Text style={styles.imagePickerButtonText}>Select Image (JPG/PNG)</Text>
              </TouchableOpacity>
            )}
          </View>
        );

      case 'video':
        return (
          <>
            <View style={styles.field}>
              <Text style={styles.label}>YouTube Video URL *</Text>
              <Text style={styles.description}>(Click "Share" then "Copy" on YouTube and paste here)</Text>
              <TextInput
                style={styles.input}
                value={videoUrl}
                onChangeText={setVideoUrl}
                placeholder="https://www.youtube.com/watch?v=..."
                keyboardType="url"
                autoCapitalize="none"
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Video Start</Text>
              <Text style={styles.description}>(The time you want the video to start at)</Text>
              <View style={styles.timeInputRow}>
                <View style={styles.timeInput}>
                  <Text style={styles.timeLabel}>Minutes (0-120)</Text>
                  <TextInput
                    style={styles.timeTextInput}
                    value={videoStartMinutes}
                    onChangeText={(text) => {
                      const num = parseInt(text) || 0;
                      if (num >= 0 && num <= 120) {
                        setVideoStartMinutes(String(num));
                      }
                    }}
                    keyboardType="numeric"
                    placeholder="0"
                  />
                </View>
                <View style={styles.timeInput}>
                  <Text style={styles.timeLabel}>Seconds (0-59)</Text>
                  <TextInput
                    style={styles.timeTextInput}
                    value={videoStartSeconds}
                    onChangeText={(text) => {
                      const num = parseInt(text) || 0;
                      if (num >= 0 && num <= 59) {
                        setVideoStartSeconds(String(num));
                      }
                    }}
                    keyboardType="numeric"
                    placeholder="0"
                  />
                </View>
              </View>
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Video Length</Text>
              <Text style={styles.description}>(The time you want the video to play for)</Text>
              <View style={styles.timeInputRow}>
                <View style={styles.timeInput}>
                  <Text style={styles.timeLabel}>Minutes (0-120)</Text>
                  <TextInput
                    style={styles.timeTextInput}
                    value={videoMinutes}
                    onChangeText={(text) => {
                      const num = parseInt(text) || 0;
                      if (num >= 0 && num <= 120) {
                        setVideoMinutes(String(num));
                      }
                    }}
                    keyboardType="numeric"
                    placeholder="0"
                  />
                </View>
                <View style={styles.timeInput}>
                  <Text style={styles.timeLabel}>Seconds (0-59)</Text>
                  <TextInput
                    style={styles.timeTextInput}
                    value={videoSeconds}
                    onChangeText={(text) => {
                      const num = parseInt(text) || 0;
                      if (num >= 0 && num <= 59) {
                        setVideoSeconds(String(num));
                      }
                    }}
                    keyboardType="numeric"
                    placeholder="0"
                  />
                </View>
              </View>
            </View>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{isEditing ? 'Edit Slide' : 'Add New Slide'}</Text>
          <Image 
            source={require('../../assets/hi_logo.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Slide Name *</Text>
          <TextInput
            style={[styles.input, nameError && styles.inputError]}
            value={name}
            onChangeText={(text) => {
              setName(text);
              setNameError(false);
            }}
            placeholder="Enter slide name"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Slide Type</Text>
          {renderBodyTypeSelector()}
        </View>

        {renderContentFields()}

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={onCancel}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.saveButton]}
            onPress={handleSave}
          >
            <Text style={styles.saveButtonText}>Done</Text>
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
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    flex: 1,
  },
  logo: {
    width: 48,
    height: 48,
  },
  field: {
    marginBottom: 25,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
    color: '#333',
  },
  description: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  note: {
    fontSize: 12,
    color: '#ff9800',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: '#ff4444',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#fff',
    minHeight: 120,
    textAlignVertical: 'top',
  },
  bodyTypeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  bodyTypeButton: {
    padding: 12,
    marginRight: 10,
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  bodyTypeButtonActive: {
    borderColor: '#007AFF',
    backgroundColor: '#E3F2FD',
  },
  bodyTypeButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  bodyTypeButtonTextActive: {
    color: '#007AFF',
  },
  timeInputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeInput: {
    flex: 1,
    marginRight: 10,
  },
  timeLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  timeTextInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    textAlign: 'center',
  },
  imagePreviewContainer: {
    marginTop: 10,
    alignItems: 'center',
  },
  imagePreview: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  removeImageButton: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#ff4444',
    borderRadius: 8,
  },
  removeImageButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  imagePickerButton: {
    marginTop: 10,
    padding: 15,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center',
  },
  imagePickerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
  cancelButton: {
    backgroundColor: '#f0f0f0',
    marginRight: 10,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    marginLeft: 10,
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ShowFormPage5;

