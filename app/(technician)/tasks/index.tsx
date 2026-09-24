import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import useAuthStore from '@/store/authStore';
import technicianApi from '@/api/technicianApi';
import { Link } from 'expo-router';

export default function TasksIndex() {
  const authStore = useAuthStore();
  const { profile } = authStore;
  const { apiUsername } = profile ?? {};

  if (!profile) {
    return <ActivityIndicator size="large" />;
  }

  // For now, we'll just render a placeholder.
  // We'll implement the actual tasks screen later.

  return (
    <View style={styles.container}>
      <Text>Tasks Screen</Text>
      <View style={styles.tabContainer}>
        <Link href="/(technician)/tasks/services" style={styles.tabButton}>
          <Text>Services</Text>
        </Link>
        <Link href="/(technician)/tasks/tickets" style={styles.tabButton}>
          <Text>Tickets</Text>
        </Link>
        <Link href="/(technician)/tasks/installation" style={styles.tabButton}>
          <Text>Installation</Text>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    marginTop: 20,
  },
  tabButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    paddingVertical: 15,
    alignItems: 'center',
    borderRadius: 5,
    marginHorizontal: 5,
  },
});