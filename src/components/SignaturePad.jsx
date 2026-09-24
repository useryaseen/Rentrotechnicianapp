import React, { useRef } from 'react';
import { View, Button, Alert } from 'react-native';
import SignatureCanvas from 'react-native-signature-canvas';
import { base64ToFileUri } from '../lib/imageUtils';

export default function SignaturePad({ onSignatureChange, label }) {
  const signatureRef = useRef(null);

  const clearSignature = () => {
    signatureRef.current?.clear();
    onSignatureChange(null);
  };

  const saveSignature = async () => {
    try {
      const dataUrl = await signatureRef.current?.getImageDataURL();
      if (!dataUrl) {
        Alert.alert('Error', 'Could not get signature image');
        return null;
      }
      // Remove the data URL prefix to get the base64 string
      const base64 = dataUrl.split(',')[1];
      const fileUri = await base64ToFileUri(base64, `${label.replace(/\s+/g, '-')}-signature.png`);
      onSignatureChange({ uri: fileUri, name: `${label.replace(/\s+/g, '-')}-signature.png`, type: 'image/png' });
      return fileUri;
    } catch (error) {
      Alert.alert('Error', error.message ?? 'Failed to save signature');
      return null;
    }
  };

  return (
    <View>
      <SignatureCanvas
        ref={signatureRef}
        style={{ width: 400, height: 200, backgroundColor: '#fff' }}
        strokeWidth={2}
        strokeColor="#0f172a"
      />
      <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 10 }}>
        <Button title="Clear" onPress={clearSignature} />
        <Button title="Save" onPress={saveSignature} />
      </View>
    </View>
  );
}