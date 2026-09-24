import React, { useState } from 'react';
import { View, Button, Alert, Image, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { compressImage } from '../lib/imageUtils';
import { formatBytes } from '../lib/format';

export default function ImagePickerButton({ onImageChange, label, multiple = false }) {
  const [images, setImages] = useState([]); // Array of { uri, name, type, originalSize, compressedSize }

  const pickImages = async () => {
    try {
      let result;
      if (multiple) {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsMultipleSelection: true,
          quality: 1, // We'll compress later
        });
      } else {
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 1,
        });
      }

      if (!result.canceled && result.assets) {
        const assets = multiple ? result.assets : [result.assets];
        // We'll compress each asset
        const compressedImages = [];
        for (const asset of assets) {
          const compressed = await compressImage(asset.uri, { maxDimension: 1600, quality: 0.75, base64: false });
          // We'll get the original and compressed sizes for display
          const originalSize = await ImagePicker.getAssetInfoAsync(asset).then(info => info.fileSize);
          const compressedSize = await ImagePicker.getAssetInfoAsync(compressed.uri).then(info => info.fileSize);
          compressedImages.push({
            uri: compressed.uri,
            name: compressed.uri.split('/').pop(),
            type: 'image/jpeg',
            originalSize,
            compressedSize,
          });
        }
        setImages(compressedImages);
        onImageChange(compressedImages);
      }
    } catch (error) {
      Alert.alert('Error', error.message ?? 'Failed to pick image');
    }
  };

  return (
    <View>
      <Button title={label} onPress={pickImages} />
      {images.length > 0 && (
        <View>
          {images.map((image, index) => (
            <View key={index} style={{ margin: 10, alignItems: 'center' }}>
              <Image source={{ uri: image.uri }} style={{ width: 100, height: 100 }} />
              <Text>
                {formatBytes(image.originalSize)} → {formatBytes(image.compressedSize)}
              </Text>
              <Button title="Remove" onPress={() => {
                const newImages = [...images];
                newImages.splice(index, 1);
                setImages(newImages);
                onImageChange(newImages);
              }} />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
});