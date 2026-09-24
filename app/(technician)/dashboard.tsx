import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import useAuthStore from '@/store/authStore';
import technicianApi from '@/api/technicianApi';

export default function Dashboard() {
  const authStore = useAuthStore();
  const { profile } = authStore;
  const { apiUsername, techId, displayName } = profile ?? {};

  // We'll need to get the apiUsername and techId from the profile.
  // If the profile is not available, we'll show a loading indicator.

  if (!profile) {
    return <ActivityIndicator size="large" />;
  }

  // For now, we'll just render a placeholder.
  // We'll implement the actual dashboard later.

  return (
    <View style={styles.container}>
      <Text>Dashboard Screen</Text>
      <Text>Welcome, {displayName}</Text>
      <Text>Tech ID: {techId}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});