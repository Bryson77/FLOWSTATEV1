import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  User,
  Flame,
  Shield,
  Clock,
  Globe,
  LogOut,
  Edit3,
  Trash2,
  Check,
  X,
  Sparkles,
} from 'lucide-react-native';
import { useAuth } from '../../lib/auth-context';
import { supabase } from '../../lib/supabase';

export default function ProfileScreen() {
  const { user, profile, refreshProfile, signOut } = useAuth();

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editDegree, setEditDegree] = useState('');
  const [editDailyGoal, setEditDailyGoal] = useState('120');
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');

  // Open Edit Modal with current values
  const openEditModal = () => {
    setEditName(profile?.full_name || '');
    setEditUsername(profile?.username || '');
    setEditDegree(profile?.degree || '');
    setEditDailyGoal(String(profile?.daily_study_goal_minutes || 120));
    setEditError('');
    setIsEditModalOpen(true);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    const cleanUser = editUsername.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');

    if (!editName.trim()) {
      setEditError('Please enter your name.');
      return;
    }

    if (cleanUser && cleanUser.length < 3) {
      setEditError('Username must be at least 3 characters.');
      return;
    }

    setSaving(true);
    setEditError('');

    try {
      // Check if username changed and is taken
      if (cleanUser && cleanUser !== profile?.username) {
        const { data: existing } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', cleanUser)
          .neq('id', user.id)
          .maybeSingle();

        if (existing) {
          setEditError('This username is already taken.');
          setSaving(false);
          return;
        }
      }

      const goalMinutes = parseInt(editDailyGoal, 10) || 120;

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editName.trim(),
          username: cleanUser || null,
          degree: editDegree.trim() || null,
          daily_study_goal_minutes: goalMinutes,
        } as any)
        .eq('id', user.id);

      if (error) throw error;

      await refreshProfile();
      setIsEditModalOpen(false);
    } catch (err: any) {
      setEditError(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account & Data',
      'This will permanently delete your student account, courses, flashcards, and study history. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await (supabase.rpc as any)('delete_user_account');
              if (error) throw error;
              await signOut();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete account.');
            }
          },
        },
      ]
    );
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'S';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Student Profile</Text>
          <Pressable
            style={({ pressed }) => [styles.editIconBtn, pressed && styles.pressed]}
            onPress={openEditModal}
          >
            <Edit3 size={16} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Identity Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(profile?.full_name ?? null)}</Text>
          </View>
          <View style={styles.identityDetails}>
            <Text style={styles.fullName}>{profile?.full_name || 'Student'}</Text>
            <Text style={styles.username}>
              {profile?.username ? `@${profile.username}` : 'No username set'}
            </Text>
            {profile?.degree ? (
              <Text style={styles.degreeText}>{profile.degree}</Text>
            ) : (
              <Pressable onPress={openEditModal}>
                <Text style={styles.addDegreeLink}>+ Add your course / school program</Text>
              </Pressable>
            )}
            <View style={styles.tierPill}>
              <Sparkles size={10} color="#A1A1AA" />
              <Text style={styles.tierText}>
                {profile?.tier ? `${profile.tier.toUpperCase()} PLAN` : 'FREE PLAN'}
              </Text>
            </View>
          </View>
        </View>

        {/* Study Statistics Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Flame size={16} color="#F59E0B" />
              <Text style={styles.statLabel}>Current Streak</Text>
            </View>
            <Text style={styles.statValue}>{profile?.study_streak_days || 0}d</Text>
            <Text style={styles.statSub}>Longest: {profile?.longest_streak_days || 0}d</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Shield size={16} color="#10B981" />
              <Text style={styles.statLabel}>Streak Freezes</Text>
            </View>
            <Text style={styles.statValue}>{profile?.streak_freezes_available ?? 1}/3</Text>
            <Text style={styles.statSub}>1 freeze per 7 days</Text>
          </View>
        </View>

        {/* Study Preferences Card */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>PREFERENCES</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Clock size={16} color="#71717A" />
              <View>
                <Text style={styles.settingTitle}>Daily Study Goal</Text>
                <Text style={styles.settingSub}>
                  {profile?.daily_study_goal_minutes || 120} minutes per day
                </Text>
              </View>
            </View>
            <Pressable onPress={openEditModal} style={styles.settingActionBtn}>
              <Text style={styles.settingActionText}>Change</Text>
            </Pressable>
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Globe size={16} color="#71717A" />
              <View>
                <Text style={styles.settingTitle}>Timezone</Text>
                <Text style={styles.settingSub}>
                  {profile?.timezone || 'Africa/Johannesburg'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Account Actions Card */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>ACCOUNT</Text>

          <Pressable
            style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}
            onPress={handleSignOut}
          >
            <View style={styles.settingLeft}>
              <LogOut size={16} color="#FFFFFF" />
              <Text style={styles.actionText}>Sign Out</Text>
            </View>
          </Pressable>

          <View style={styles.divider} />

          <Pressable
            style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}
            onPress={handleDeleteAccount}
          >
            <View style={styles.settingLeft}>
              <Trash2 size={16} color="#EF4444" />
              <Text style={styles.dangerActionText}>Delete Account & Data</Text>
            </View>
          </Pressable>
        </View>

        {/* App Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Saktus · Productivity app for students</Text>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={isEditModalOpen} animationType="slide" transparent>
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <Pressable onPress={() => setIsEditModalOpen(false)} hitSlop={8}>
                <X size={20} color="#71717A" />
              </Pressable>
            </View>

            {editError ? (
              <View style={styles.modalErrorBox}>
                <Text style={styles.modalErrorText}>{editError}</Text>
              </View>
            ) : null}

            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>FULL NAME</Text>
              <TextInput
                style={styles.modalInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="e.g. Alex Ndlovu"
                placeholderTextColor="#52525B"
              />
            </View>

            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>USERNAME (@username)</Text>
              <TextInput
                style={styles.modalInput}
                value={editUsername}
                onChangeText={(val) => setEditUsername(val.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="e.g. alex_dev"
                placeholderTextColor="#52525B"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>DEGREE / SCHOOL PROGRAM</Text>
              <TextInput
                style={styles.modalInput}
                value={editDegree}
                onChangeText={setEditDegree}
                placeholder="e.g. BSc Computer Science"
                placeholderTextColor="#52525B"
              />
            </View>

            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>DAILY STUDY GOAL (MINUTES)</Text>
              <TextInput
                style={styles.modalInput}
                value={editDailyGoal}
                onChangeText={setEditDailyGoal}
                placeholder="120"
                placeholderTextColor="#52525B"
                keyboardType="numeric"
              />
            </View>

            <Pressable
              style={({ pressed }) => [styles.saveBtn, pressed && styles.pressed]}
              onPress={handleSaveProfile}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#000000" />
              ) : (
                <View style={styles.saveBtnRow}>
                  <Check size={16} color="#000000" />
                  <Text style={styles.saveBtnText}>Save Profile</Text>
                </View>
              )}
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  editIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#09090B',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    transform: [{ scale: 0.97 }],
  },
  profileCard: {
    backgroundColor: '#09090B',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#000000',
    fontSize: 22,
    fontWeight: '800',
  },
  identityDetails: {
    flex: 1,
    gap: 3,
  },
  fullName: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  username: {
    color: '#A1A1AA',
    fontSize: 13,
    fontWeight: '500',
  },
  degreeText: {
    color: '#71717A',
    fontSize: 12,
    marginTop: 2,
  },
  addDegreeLink: {
    color: '#3B82F6',
    fontSize: 12,
    marginTop: 2,
  },
  tierPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
  },
  tierText: {
    color: '#A1A1AA',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#09090B',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 16,
    gap: 4,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  statLabel: {
    color: '#71717A',
    fontSize: 11,
    fontWeight: '600',
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },
  statSub: {
    color: '#52525B',
    fontSize: 11,
  },
  sectionCard: {
    backgroundColor: '#09090B',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 16,
    gap: 12,
  },
  sectionHeading: {
    color: '#71717A',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  settingSub: {
    color: '#71717A',
    fontSize: 11,
    marginTop: 2,
  },
  settingActionBtn: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  settingActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  actionRow: {
    paddingVertical: 4,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  dangerActionText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 4,
  },
  footerText: {
    color: '#52525B',
    fontSize: 12,
  },
  footerSubText: {
    color: '#3F3F46',
    fontSize: 11,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#09090B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 24,
    gap: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  modalErrorBox: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: 8,
    padding: 10,
  },
  modalErrorText: {
    color: '#EF4444',
    fontSize: 12,
  },
  modalField: {
    gap: 6,
  },
  modalLabel: {
    color: '#71717A',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  modalInput: {
    backgroundColor: '#000000',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 14,
    height: 44,
    color: '#FFFFFF',
    fontSize: 13,
  },
  saveBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  saveBtnText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '700',
  },
});
