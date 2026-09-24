import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import useAuthStore from '@/store/authStore';
import technicianApi from '@/api/technicianApi';
import { useCallback } from 'react';

export default function CompletedServices() {
  const authStore = useAuthStore();
  const { profile } = authStore;
  const { techId } = profile ?? {};

  if (!profile) {
    return <ActivityIndicator size="large" />;
  }

  // For now, we'll just render a placeholder.
  // We'll implement the actual completed services screen later.

  return (
    <View style={styles.container}>
      <Text>Completed Services Screen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
});