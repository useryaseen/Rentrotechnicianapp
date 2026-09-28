import React, { useContext, useEffect } from 'react';
import { View, Text, Image, Pressable, StyleSheet, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { useConnectivity } from '@/connectivity-context';

export default function NoInternetScreen() {
  const { isConnected } = useConnectivity();
  const router = useRouter();

  useEffect(() => {
    if (isConnected) {
      const previousPage = router.state?.routes[router.state.routes.length - 2]?.name;
      if (previousPage) {
        router.replace(previousPage);
      } else {
        router.replace('/(technician)/dashboard');
      }
    }
  }, [isConnected, router]);

  if (isConnected) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.offlineContainer}>
        <Image
          source={require('../assets/technicianloginpageimage.png')}
          style={styles.offlineImage}
        />
        <Text style={styles.offlineText}>No internet connection</Text>
        <Pressable style={styles.retryButton} onPress={() => {}}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  offlineContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  offlineImage: {
    width: 200,
    height: 200,
    resizeMode: 'contain',
  },
  offlineText: {
    fontSize: 18,
    color: '#dc3545',
    fontWeight: 'bold',
  },
  retryButton: {
    backgroundColor: '#007aff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});