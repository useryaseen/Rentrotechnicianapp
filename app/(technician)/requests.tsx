import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import useAuthStore from '@/store/authStore';
import technicianApi from '@/api/technicianApi';
import { Link } from 'expo-router';

export default function Requests() {
  const authStore = useAuthStore();
  const { profile } = authStore;
  const { apiUsername } = profile ?? {};

  if (!profile) {
    return <ActivityIndicator size="large" />;
  }

  // For now, we'll just render a placeholder.
  // We'll implement the actual requests screen later.

  return (
    <View style={styles.container}>
      <Text>Requests Screen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
});