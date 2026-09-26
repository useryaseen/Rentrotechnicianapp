import { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import useAuthStore from '@/store/authStore';
import { colors, spacing, radius, fontSize, shadows, touchTarget, fonts } from '@/theme';

const logo = require('../assets/rentROLogo.png');
const vectorImage = require('../assets/technicianloginpageimage.avif');

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState<'username' | 'password' | null>(null);
  const passwordRef = useRef<TextInput>(null);
  const { login } = useAuthStore();
  const router = useRouter();

  const canSubmit = username.trim().length > 0 && password.length > 0 && !loading;

  const handleLogin = async () => {
    if (!canSubmit) return;
    setError(null);
    setLoading(true);
    try {
      await login(username.trim(), password);
      router.replace('/(technician)/dashboard');
    } catch (e: any) {
      setError(e?.message ?? 'Unable to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      {/* Decorative header background */}
      <View style={styles.hero}>
        <View style={[styles.bubble, styles.bubbleLarge]} />
        <View style={[styles.bubble, styles.bubbleSmall]} />
      </View>

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.heroContent}>
              <View  style={{
    width: "100%",
    
  }}>

              <Image source={logo} style={styles.rentroLogo} resizeMode="contain" />
              </View>
              <Text style={styles.heroTitle}>Welcome back</Text>
              <Text style={styles.heroSubtitle}>Sign in to see today&apos;s jobs</Text>
            </View>

            <View style={styles.card}>
              <Image source={vectorImage} style={styles.logo} resizeMode="contain" />

              <View style={styles.badge}>
                <MaterialCommunityIcons name="account-hard-hat" size={16} color={colors.primary} />
                <Text style={styles.badgeText}>Technician Portal</Text>
              </View>

              {error && (
                <View style={styles.errorBox}>
                  <MaterialCommunityIcons name="alert-circle" size={18} color={colors.danger} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <Text style={styles.label}>Username</Text>
              <View style={[styles.inputRow, focused === 'username' && styles.inputRowFocused]}>
                <MaterialCommunityIcons
                  name="account-outline"
                  size={22}
                  color={focused === 'username' ? colors.primary : colors.faint}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your username"
                  placeholderTextColor={colors.faint}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="username"
                  textContentType="username"
                  returnKeyType="next"
                  onFocus={() => setFocused('username')}
                  onBlur={() => setFocused(null)}
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  editable={!loading}
                />
              </View>

              <Text style={styles.label}>Password</Text>
              <View style={[styles.inputRow, focused === 'password' && styles.inputRowFocused]}>
                <MaterialCommunityIcons
                  name="lock-outline"
                  size={22}
                  color={focused === 'password' ? colors.primary : colors.faint}
                />
                <TextInput
                  ref={passwordRef}
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor={colors.faint}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="password"
                  textContentType="password"
                  returnKeyType="go"
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused(null)}
                  onSubmitEditing={handleLogin}
                  editable={!loading}
                />
                <Pressable
                  onPress={() => setShowPassword((v) => !v)}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                >
                  <MaterialCommunityIcons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={22}
                    color={colors.muted}
                  />
                </Pressable>
              </View>

              <Pressable
                onPress={handleLogin}
                disabled={!canSubmit}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.button,
                  !canSubmit && styles.buttonDisabled,
                  pressed && canSubmit && styles.buttonPressed,
                ]}
              >
                {loading ? (
                  <ActivityIndicator color={colors.surface} />
                ) : (
                  <>
                    <Text style={styles.buttonText}>Sign In</Text>
                    <MaterialCommunityIcons name="arrow-right" size={20} color={colors.surface} />
                  </>
                )}
              </Pressable>
            </View>

            <View style={styles.footer}>
              <MaterialCommunityIcons name="shield-check-outline" size={14} color={colors.faint} />
              <Text style={styles.footerText}>Secure login · Rent RO Technician App</Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  hero: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 340,
    backgroundColor: colors.loginPrimary,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    overflow: 'hidden',
  },
  bubble: {
    position: 'absolute',
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  bubbleLarge: {
    width: 260,
    height: 260,
    top: -90,
    right: -70,
    opacity: 0.55,
  },
  bubbleSmall: {
    width: 140,
    height: 140,
    bottom: -40,
    left: -30,
    opacity: 0.35,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
  },
  heroContent: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  heroTitle: {
    fontFamily: fonts.semibold,
    fontSize: fontSize.xxl,
    letterSpacing: -0.4,
    color: colors.surface,
    marginTop: 35,
  },
  heroSubtitle: {
    fontFamily: fonts.regular,
    fontSize: fontSize.body,
    color: colors.primarySoft,
    marginTop: spacing.xs,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg + 8,
    padding: spacing.xl + 4,
    ...shadows.sheet,
    shadowOffset: { width: 0, height: 8 },
  },
  logo: {
    width: '120%',
    aspectRatio: 1092 / 266,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  rentroLogo: {
    width: 200,
    height: 30,
    marginBottom: spacing.lg,
    position: 'absolute',
    top: 0,
    left: -20,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: spacing.xs + 2,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    marginBottom: spacing.xl,
  },
  badgeText: {
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    color: colors.primary,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  errorText: {
    fontFamily: fonts.medium,
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.danger,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    minHeight: touchTarget + 8,
    paddingHorizontal: spacing.md + 2,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    marginBottom: spacing.lg,
  },
  inputRowFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  input: {
    fontFamily: fonts.regular,
    flex: 1,
    fontSize: fontSize.body,
    color: colors.ink,
    paddingVertical: spacing.md,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: touchTarget + 10,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    marginTop: spacing.sm,
    ...shadows.card,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
  },
  buttonPressed: {
    backgroundColor: colors.primaryDark,
    transform: [{ scale: 0.98 }],
  },
  buttonDisabled: {
    backgroundColor: colors.faint,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    fontFamily: fonts.medium,
    fontSize: fontSize.lg,
    color: colors.surface,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs + 2,
    marginTop: 'auto',
    paddingTop: spacing.xxl,
  },
  footerText: {
    fontFamily: fonts.regular,
    fontSize: fontSize.xs,
    color: colors.faint,
  },
});
