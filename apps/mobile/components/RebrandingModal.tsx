import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Sparkles, ArrowRight, X, ShieldCheck, Globe } from 'lucide-react-native';
import { useThemeColors, type ThemeColors } from '../lib/theme';

const REBRANDING_POPUP_STORAGE_KEY = '@saktus_rebranding_popup_seen_count_v1';
const MAX_POPUP_COUNT = 2;

interface RebrandingModalProps {
  visible?: boolean;
  onClose?: () => void;
}

export function RebrandingModal({ visible: controlledVisible, onClose }: RebrandingModalProps) {
  const theme = useThemeColors();
  const [internalVisible, setInternalVisible] = useState(false);
  const [seenCount, setSeenCount] = useState<number>(0);
  const [hasCheckedStorage, setHasCheckedStorage] = useState(false);

  useEffect(() => {
    async function checkPopupCount() {
      try {
        const stored = await AsyncStorage.getItem(REBRANDING_POPUP_STORAGE_KEY);
        const count = stored ? parseInt(stored, 10) : 0;
        setSeenCount(count);
        // Only pop up automatically if count < 2
        if (count < MAX_POPUP_COUNT) {
          setInternalVisible(true);
        }
      } catch (err) {
        console.error('Failed to read rebranding popup count:', err);
      } finally {
        setHasCheckedStorage(true);
      }
    }

    if (controlledVisible === undefined) {
      checkPopupCount();
    }
  }, [controlledVisible]);

  const isVisible = controlledVisible !== undefined ? controlledVisible : internalVisible;

  const handleDismiss = async () => {
    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
    } catch {}

    // Increment count if it's currently below MAX_POPUP_COUNT
    const nextCount = Math.min(seenCount + 1, MAX_POPUP_COUNT);
    setSeenCount(nextCount);
    try {
      await AsyncStorage.setItem(REBRANDING_POPUP_STORAGE_KEY, String(nextCount));
    } catch (err) {
      console.error('Failed to update rebranding popup count:', err);
    }

    setInternalVisible(false);
    if (onClose) {
      onClose();
    }
  };

  if (!isVisible && controlledVisible === undefined && !hasCheckedStorage) {
    return null;
  }

  const styles = createStyles(theme);

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={handleDismiss}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header Badge & Close Button */}
          <View style={styles.headerRow}>
            <View style={styles.badge}>
              <Sparkles size={13} color={theme.buttonPrimaryText} />
              <Text style={styles.badgeText}>We&apos;re rebranding!</Text>
            </View>

            <Pressable
              onPress={handleDismiss}
              hitSlop={10}
              style={({ pressed }) => [
                styles.closeButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <X size={16} color={theme.textMuted} />
            </Pressable>
          </View>

          {/* Heading */}
          <View style={styles.titleWrap}>
            <Text style={styles.title}>From Flowstateproductivity to Saktus</Text>
            <Text style={styles.subtitle}>
              We are rebranding. Your full account, timetable, flashcards, and study streaks continue seamlessly.
            </Text>
          </View>

          {/* Solid Information Pill / Box */}
          <View style={styles.infoBox}>
            <View style={styles.infoRow}>
              <Globe size={15} color={theme.textPrimary} />
              <Text style={styles.infoRowTitle}>Active Domain</Text>
            </View>
            <Text style={styles.infoDomainText}>flowstateproductivity.xyz</Text>
            <Text style={styles.infoSubText}>
              We are using our current domain while our new domain setup completes. Web access and login are live at app.flowstateproductivity.xyz/login.
            </Text>
          </View>

          {/* Counter info and Got It button */}
          <View style={styles.footerRow}>
            <Text style={styles.counterText}>
              {seenCount < MAX_POPUP_COUNT
                ? `Notice ${seenCount + 1} of ${MAX_POPUP_COUNT}`
                : 'Notice confirmed'}
            </Text>

            <Pressable
              onPress={handleDismiss}
              style={({ pressed }) => [
                styles.dismissButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.dismissButtonText}>Got it</Text>
              <ArrowRight size={14} color={theme.buttonPrimaryText} />
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
    },
    card: {
      width: '100%',
      maxWidth: 380,
      backgroundColor: theme.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 22,
      gap: 16,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.35,
      shadowRadius: 18,
      elevation: 10,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: theme.buttonPrimaryBg,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 100,
    },
    badgeText: {
      color: theme.buttonPrimaryText,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.3,
      textTransform: 'uppercase',
    },
    closeButton: {
      padding: 6,
      borderRadius: 16,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.borderSubtle,
    },
    buttonPressed: {
      transform: [{ scale: 0.96 }],
      opacity: 0.85,
    },
    titleWrap: {
      gap: 6,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.textPrimary,
      letterSpacing: -0.3,
      lineHeight: 24,
    },
    subtitle: {
      fontSize: 13,
      color: theme.textMuted,
      lineHeight: 18,
    },
    infoBox: {
      backgroundColor: theme.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 14,
      gap: 6,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    infoRowTitle: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.textPrimary,
    },
    infoDomainText: {
      fontSize: 12,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      color: theme.textPrimary,
      fontWeight: '700',
      marginTop: 2,
    },
    infoSubText: {
      fontSize: 11,
      color: theme.textMuted,
      lineHeight: 16,
      marginTop: 2,
    },
    footerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 4,
    },
    counterText: {
      fontSize: 11,
      color: theme.textMuted,
      fontWeight: '500',
    },
    dismissButton: {
      backgroundColor: theme.buttonPrimaryBg,
      borderRadius: 12,
      paddingHorizontal: 18,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    dismissButtonText: {
      color: theme.buttonPrimaryText,
      fontSize: 13,
      fontWeight: '600',
    },
  });
