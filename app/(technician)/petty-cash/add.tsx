import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import useAuthStore from '@/store/authStore';
import pettyCashApi from '@/api/pettyCashService';
import { useState } from 'react';
import { Link, useRouter } from 'expo-router';

export default function AddPettyCash() {
  const authStore = useAuthStore();
  const { profile } = authStore;
  const { apiUsername } = profile ?? {}; // raw username

  if (!profile) {
    return <ActivityIndicator size="large" />;
  }

  // For now, we'll just render a placeholder.
  // We'll implement the actual add petty cash screen later.

  return (
    <View style={styles.container}>
      <Text>Add Petty Cash Screen</Text>
      <Link href="/(technician)/petty-cash">
        <Text>Back to Petty Cash</Text>
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