import { View, Text, Button } from 'react-native';
import useAuthStore from '@/store/authStore';
import useNotificationStore from '@/store/notificationStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Link, Redirect, Slot, useRouter } from 'expo-router';

// We'll create a simple notification toast for now
const NotificationToast = () => {
  const { unreadCount } = useNotificationStore();
  return (
    unreadCount > 0 && (
      <View style={{ position: 'absolute', top: 40, left: 20, right: 20, backgroundColor: '#ff9800', padding: 10, borderRadius: 4, alignItems: 'center' }}>
        <Text style={{ color: '#fff' }}>{unreadCount} new notification{unreadCount > 1 ? 's' : ''}</Text>
      </View>
    )
  );
};

export default function TechnicianLayout() {
  const { displayName, techId, logout } = useAuthStore();
  const router = useRouter();

  // Redirect to login if the profile is missing
  if (!displayName || !techId) {
    return <Redirect href="/login" />;
  }

  // We'll also need to handle the logout
  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: '#f0f0f0' }}>
        {/* We'll put a placeholder logo */}
        <View style={{ width: 40, height: 40, backgroundColor: '#ccc', borderRadius: 20, marginRight: 10 }} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: 'bold' }}>{displayName}</Text>
          <Text style={{ fontSize: 12, color: '#666' }}>Tech ID: {techId}</Text>
        </View>
        <Button title="Logout" onPress={handleLogout} />
      </View>
      <NotificationToast />
      {/* We'll use the new Tabs from expo-router/js-tabs for now */}
      <View style={{ height: 50, backgroundColor: '#f0f0f0', borderBottomWidth: 1, borderColor: '#ddd' }}>
        <View style={{ flexDirection: 'row' }}>
          <View
            style={[
              { flex: 1, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderColor: '#eee' },
              // Active tab styling would go here
            ]}>
            <Link href="/(technician)/tasks">
              <MaterialCommunityIcons name="playlist-check" size={24} />
              <Text>My Tasks</Text>
            </Link>
          </View>
          <View
            style={[
              { flex: 1, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderColor: '#eee' },
            ]}>
            <Link href="/(technician)/dashboard">
              <MaterialCommunityIcons name="view-dashboard" size={24} />
              <Text>Dashboard</Text>
            </Link>
          </View>
          <View
            style={[
              { flex: 1, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderColor: '#eee' },
            ]}>
            <Link href="/(technician)/services">
              <MaterialCommunityIcons name="tools" size={24} />
              <Text>Services</Text>
            </Link>
          </View>
          <View
            style={[
              { flex: 1, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderColor: '#eee' },
            ]}>
            <Link href="/(technician)/requests">
              <MaterialCommunityIcons name="comment-alert" size={24} />
              <Text>Requests</Text>
            </Link>
          </View>
          <View
            style={[
              { flex: 1, alignItems: 'center', justifyContent: 'center' },
            ]}>
            <Link href="/(technician)/petty-cash">
              <MaterialCommunityIcons name="cash" size={24} />
              <Text>Petty Cash</Text>
            </Link>
          </View>
        </View>
      </View>
      {/* Slot for the tab content */}
      <Slot />
    </View>
  );
}