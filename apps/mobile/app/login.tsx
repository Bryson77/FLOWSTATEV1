import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mail, Lock, Eye, EyeOff, ArrowRight, User as UserIcon, AtSign, Sparkles } from 'lucide-react-native';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { getSafeErrorMessage } from '../lib/errors';
import { useThemeColors, type ThemeColors } from '../lib/theme';
import { RebrandingModal } from '../components/RebrandingModal';

export default function MobileLoginScreen() {
  const insets = useSafeAreaInsets();
  const theme = useThemeColors();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showRebrandingDetails, setShowRebrandingDetails] = useState(false);

  const sanitizeUsername = (val: string) => {
    return val.toLowerCase().replace(/[^a-z0-9_]/g, '');
  };

  const handleAuth = async () => {
    if (!email.trim()) {
      setErrorMsg('Fill this in: Email address is required.');
      return;
    }
    if (!password.trim()) {
      setErrorMsg('Fill this in: Password is required.');
      return;
    }

    if (isSignUp) {
      if (!fullName.trim()) {
        setErrorMsg('Fill this in: Full name is required.');
        return;
      }
      const cleanUser = sanitizeUsername(username);
      if (!cleanUser) {
        setErrorMsg('Fill this in: Username is required.');
        return;
      }
      if (cleanUser.length < 3) {
        setErrorMsg('Username must be at least 3 characters.');
        return;
      }
      if (cleanUser.length > 20) {
        setErrorMsg('Username cannot exceed 20 characters.');
        return;
      }
    }

    setLoading(true);
    setErrorMsg('');

    const userTimezone =
      typeof Intl !== 'undefined'
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : 'Africa/Johannesburg';

    try {
      if (isSignUp) {
        const cleanUser = sanitizeUsername(username);

        // Check if username is already taken
        const { data: existing } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', cleanUser)
          .maybeSingle();

        if (existing) {
          setErrorMsg('This username is already taken. Please choose another.');
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password: password.trim(),
          options: {
            data: {
              full_name: fullName.trim(),
              username: cleanUser,
              timezone: userTimezone,
            },
          },
        });
        if (error) throw error;

        // If user returned immediately, ensure profiles table has the username
        if (data?.user?.id) {
          await supabase
            .from('profiles')
            .update({
              username: cleanUser,
              full_name: fullName.trim(),
              timezone: userTimezone,
            } as any)
            .eq('id', data.user.id);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password: password.trim(),
        });
        if (error) throw error;
      }

      router.replace('/(tabs)');
    } catch (err: any) {
      console.error('Mobile auth error:', err);
      setErrorMsg(getSafeErrorMessage(err, 'Authentication failed. Something went wrong.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Saktus Brand Emblem */}
          <View style={styles.header}>
            <Image
              source={require('../assets/icon.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.brandTitle}>Saktus</Text>

            {/* Rebranding Notice Badge */}
            <Pressable
              onPress={() => setShowRebrandingDetails(true)}
              style={({ pressed }) => [
                styles.rebrandBadge,
                pressed && { transform: [{ scale: 0.97 }], opacity: 0.85 },
              ]}
            >
              <Sparkles size={12} color={theme.textPrimary} />
              <Text style={styles.rebrandBadgeText}>We&apos;re rebranding!</Text>
              <Text style={styles.rebrandBadgeSub}>Flowstateproductivity → Saktus</Text>
            </Pressable>

            <Text style={styles.brandSubtitle}>
              {isSignUp ? 'Create your student account' : 'Productivity app for students'}
            </Text>
            <Text style={styles.brandDescription}>
              {isSignUp
                ? 'Join Saktus to organize your schedule, flashcards, and study sessions.'
                : 'Sign in to access your calendar, flashcards, and timer.'}
            </Text>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            {errorMsg ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMsg}</Text>
                {!isSignUp && (
                  <Pressable
                    onPress={() => {
                      setIsSignUp(true);
                      setErrorMsg('');
                    }}
                    style={styles.errorActionRow}
                  >
                    <Text style={styles.errorActionMuted}>New here?</Text>
                    <Text style={styles.errorActionHighlight}>Create an account</Text>
                  </Pressable>
                )}
              </View>
            ) : null}

            {isSignUp && (
              <>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>FULL NAME</Text>
                  <View style={styles.inputRow}>
                    <UserIcon size={16} color={theme.textMuted} />
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. Alex Ndlovu"
                      placeholderTextColor={theme.textMuted}
                      value={fullName}
                      onChangeText={setFullName}
                    />
                  </View>
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>USERNAME</Text>
                  <View style={styles.inputRow}>
                    <AtSign size={16} color={theme.textMuted} />
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. alex_dev"
                      placeholderTextColor={theme.textMuted}
                      value={username}
                      onChangeText={(val: string) => setUsername(sanitizeUsername(val))}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </View>
              </>
            )}

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>EMAIL ADDRESS</Text>
              <View style={styles.inputRow}>
                <Mail size={16} color={theme.textMuted} />
                <TextInput
                  style={styles.input}
                  placeholder="student@university.ac.za"
                  placeholderTextColor={theme.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>PASSWORD</Text>
              <View style={styles.inputRow}>
                <Lock size={16} color={theme.textMuted} />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••••••"
                  placeholderTextColor={theme.textMuted}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  autoCapitalize="none"
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                  {showPassword ? (
                    <EyeOff size={16} color={theme.textMuted} />
                  ) : (
                    <Eye size={16} color={theme.textMuted} />
                  )}
                </Pressable>
              </View>
            </View>

            <Pressable
              onPress={handleAuth}
              disabled={loading}
              style={({ pressed }: { pressed: boolean }) => [
                styles.authButton,
                { transform: [{ scale: pressed ? 0.97 : 1 }] },
              ]}
            >
              {loading ? (
                <View style={styles.skeletonBar} />
              ) : (
                <View style={styles.btnRow}>
                  <Text style={styles.authButtonText}>
                    {isSignUp ? 'Create Account' : 'Sign In'}
                  </Text>
                  <ArrowRight size={16} color={theme.buttonPrimaryText} />
                </View>
              )}
            </Pressable>
          </View>

          {/* Toggle button */}
          <View style={styles.toggleRow}>
            <Text style={styles.toggleText}>
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            </Text>
            <Pressable
              onPress={() => {
                setIsSignUp(!isSignUp);
                setErrorMsg('');
              }}
            >
              <Text style={styles.toggleHighlight}>
                {isSignUp ? 'Sign in' : 'Sign up'}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {showRebrandingDetails && (
        <RebrandingModal
          visible={showRebrandingDetails}
          onClose={() => setShowRebrandingDetails(false)}
        />
      )}
    </SafeAreaView>
  );
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: 24,
      gap: 20,
    },
    header: {
      alignItems: 'center',
      gap: 6,
    },
    logoImage: {
      width: 60,
      height: 60,
      borderRadius: 16,
      marginBottom: 8,
    },
    brandTitle: {
      color: theme.textPrimary,
      fontSize: 26,
      fontWeight: '700',
      letterSpacing: -0.5,
    },
    rebrandBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 100,
      marginTop: 2,
      marginBottom: 4,
    },
    rebrandBadgeText: {
      color: theme.textPrimary,
      fontSize: 11,
      fontWeight: '700',
    },
    rebrandBadgeSub: {
      color: theme.textMuted,
      fontSize: 10,
      fontWeight: '500',
    },
    brandSubtitle: {
      color: theme.textPrimary,
      fontSize: 15,
      fontWeight: '600',
      marginTop: 2,
      textAlign: 'center',
    },
    brandDescription: {
      color: theme.textMuted,
      fontSize: 13,
      textAlign: 'center',
      maxWidth: 300,
      lineHeight: 18,
    },
    card: {
      backgroundColor: theme.card,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 20,
      gap: 14,
    },
    errorBox: {
      backgroundColor: theme.errorBg,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.errorText,
      padding: 10,
    },
    errorText: {
      color: theme.errorText,
      fontSize: 12,
    },
    errorActionRow: {
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: theme.borderSubtle,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    errorActionMuted: {
      fontSize: 11,
      color: theme.textMuted,
    },
    errorActionHighlight: {
      fontSize: 11,
      color: theme.textPrimary,
      fontWeight: '600',
      textDecorationLine: 'underline',
    },
    field: {
      gap: 6,
    },
    fieldLabel: {
      color: theme.textMuted,
      fontSize: 10,
      fontWeight: '600',
      letterSpacing: 0.5,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 14,
      height: 48,
      gap: 10,
    },
    input: {
      flex: 1,
      color: theme.textPrimary,
      fontSize: 14,
    },
    authButton: {
      backgroundColor: theme.buttonPrimaryBg,
      borderRadius: 12,
      height: 48,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 6,
    },
    btnRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    authButtonText: {
      color: theme.buttonPrimaryText,
      fontSize: 14,
      fontWeight: '600',
    },
    skeletonBar: {
      width: 80,
      height: 14,
      backgroundColor: theme.border,
      borderRadius: 4,
    },
    toggleRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
    toggleText: {
      color: theme.textMuted,
      fontSize: 13,
    },
    toggleHighlight: {
      color: theme.textPrimary,
      fontSize: 13,
      fontWeight: '600',
      textDecorationLine: 'underline',
    },
  });
