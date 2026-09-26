import React from 'react';
import { Alert, Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import useAuthStore from '@/store/authStore';
import useNotificationStore from '@/store/notificationStore';
import { colors, fontSize, radius, spacing, fonts } from '@/theme';
import { initialsOf } from '@/lib/format';

const logo = require('../../assets/rentROLogo.png');

// Routes that exist but are reached from inside a tab, not from the tab bar.
const HIDDEN_ROUTES = [
  'services',
  'requests',
  'tasks/[uuid]',
  'tasks/[uuid]/end',
  'installations/[uuid]/end',
  'petty-cash/add',
];

/** Tab icon with a soft pill behind it when the tab is active. */
function TabIcon({
  name,
  color,
  focused,
}: {
  name: React.ComponentProps<typeof Feather>['name'];
  color: string;
  focused: boolean;
}) {
  return (
    <View style={[styles.tabIcon, focused && styles.tabIconActive]}>
      <Feather name={name} size={20} color={color} />
    </View>
  );
}

/** Single-line tab label that never wraps or gets clipped. */
function TabLabel({ children, color, focused }: { children: string; color: string; focused: boolean }) {
  return (
    <Text
      numberOfLines={1}
      allowFontScaling={false}
      style={[styles.tabLabel, { color }, focused && styles.tabLabelActive]}
    >
      {children}
    </Text>
  );
}

function AppHeader() {
  const { profile, displayName: jwtDisplayName, logout } = useAuthStore();
  const unreadCount = useNotificationStore((s: any) => s.unreadCount);
  const router = useRouter();
  const displayName = profile?.displayName ?? jwtDisplayName ?? '';

  const doLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      doLogout();
      return;
    }
    Alert.alert('Log out?', 'You will need to sign in again to see your tasks.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: doLogout },
    ]);
  };

  return (
    <SafeAreaView edges={['top']} style={styles.headerSafe}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initialsOf(displayName)}</Text>
        </View>
        <View style={styles.headerText}>
          <Image source={logo} style={styles.logo} resizeMode="contain" />
          <Text style={styles.name} numberOfLines={1}>
            {displayName} <Text style={styles.techId}>· Tech ID {profile?.techId}</Text>
          </Text>
        </View>
        <View style={styles.iconBtn}>
          <Feather name="bell" size={20} color={colors.ink} />
          {unreadCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          ) : null}
        </View>
        <Pressable
          onPress={handleLogout}
          style={styles.iconBtn}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel="Log out"
        >
          <Feather name="log-out" size={20} color={colors.danger} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

export default function TechnicianLayout() {
  const profile = useAuthStore((s: any) => s.profile);
  const insets = useSafeAreaInsets();
  // Explicit height so the icon + label always fit above the system navigation bar.
  const tabBarBottom = Math.max(insets.bottom, 8);

  // Redirect to login if the profile is missing
  if (!profile?.techId) {
    return <Redirect href="/login" />;
  }

  return (
    <View style={styles.root}>
      <AppHeader />
      <Tabs
        initialRouteName="dashboard"
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.faint,
          tabBarLabelPosition: 'below-icon',
          // Labels are rendered by TabLabel on one line; system font scaling would push them out of the bar.
          tabBarAllowFontScaling: false,
          tabBarLabel: ({ children, color, focused }) => (
            <TabLabel color={String(color)} focused={focused}>
              {children}
            </TabLabel>
          ),
          tabBarIconStyle: { width: 56, height: 30 },
          tabBarItemStyle: { paddingTop: 2, paddingBottom: 0 },
          tabBarStyle: {
            height: 66 + tabBarBottom,
            paddingTop: 6,
            paddingBottom: tabBarBottom,
            backgroundColor: colors.surface,
            borderTopWidth: 0,
            shadowColor: '#1e293b',
            shadowOpacity: 0.08,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: -4 },
            elevation: 12,
          },
          sceneStyle: { backgroundColor: colors.background },
        }}
      >
        {/* Without a title the tab bar falls back to the route name ("tasks/index"). */}
        <Tabs.Screen
          name="tasks/index"
          options={{
            title: 'My Tasks',
            tabBarIcon: ({ color, focused }) => <TabIcon name="clipboard" color={String(color)} focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="dashboard"
          options={{
            title: 'Dashboard',
            tabBarIcon: ({ color, focused }) => <TabIcon name="grid" color={String(color)} focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="completed-services"
          options={{
            title: 'Completed',
            tabBarIcon: ({ color, focused }) => <TabIcon name="check-circle" color={String(color)} focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="petty-cash/index"
          options={{
            title: 'Petty Cash',
            tabBarIcon: ({ color, focused }) => <TabIcon name="credit-card" color={String(color)} focused={focused} />,
          }}
        />
        {HIDDEN_ROUTES.map((name) => (
          <Tabs.Screen
            key={name}
            name={name}
            options={{
              href: null,
              // Full-height forms: hide the tab bar on the end-task and petty-cash forms.
              ...(name.endsWith('/end') || name === 'petty-cash/add'
                ? { tabBarStyle: { display: 'none' as const } }
                : {}),
            }}
          />
        ))}
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  tabIcon: {
    width: 56,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconActive: {
    backgroundColor: colors.primarySoft,
  },
  tabLabel: {
    fontFamily: fonts.medium,
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 3,
    textAlign: 'center',
    includeFontPadding: false,
  },
  tabLabelActive: {
    fontFamily: fonts.semibold,
  },
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerSafe: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary,
    experimental_backgroundImage: 'linear-gradient(135deg, #60a5fa, #1d4ed8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: fonts.semibold,
    color: colors.surface,
    fontSize: fontSize.body,
  },
  headerText: {
    flex: 1,
  },
  logo: {
    width: 110,
    height: 18,
    marginLeft: -4,
  },
  name: {
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    color: colors.ink,
    marginTop: 2,
  },
  techId: {
    fontFamily: fonts.medium,
    color: colors.muted,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 0,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontFamily: fonts.semibold,
    color: colors.surface,
    fontSize: 10,
  },
});
