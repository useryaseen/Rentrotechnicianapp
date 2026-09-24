import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import useAuthStore from '@/store/authStore';
import { useLocalSearchParams, useRouter } from 'expo-router';
import technicianApi from '@/api/technicianApi';
import { useState } from 'react';

export default function EndTask() {
  const { uuid } = useLocalSearchParams<{ uuid: string }>();
  const authStore = useAuthStore();
  const { profile } = authStore;
  const { apiUsername, techId } = profile ?? {};
  const router = useRouter();

  if (!profile) {
    return <ActivityIndicator size="large" />;
  }

  // For now, we'll just render a placeholder.
  // We'll implement the actual end task screen later.

  return (
    <View style={styles.container}>
      <Text>End Task Screen</Text>
      <Text>Task UUID: {uuid}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
});