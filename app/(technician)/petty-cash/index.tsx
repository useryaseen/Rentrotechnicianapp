import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import useAuthStore from '@/store/authStore';
import pettyCashApi from '@/api/pettyCashService';
import { Link } from 'expo-router';

export default function PettyCash() {
  const authStore = useAuthStore();
  const { profile } = authStore;
  const { apiUsername } = profile ?? {}; // Note: for petty cash, we use the raw username (apiUsername is the same as the login username?)

  if (!profile) {
    return <ActivityIndicator size="large" />;
  }

  // For now, we'll just render a placeholder.
  // We'll implement the actual petty cash screen later.

  return (
    <View style={styles.container}>
      <Text>Petty Cash Screen</Text>
      <Link href="/(technician)/petty-cash/add">
        <Text>Add Petty Cash</Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
});