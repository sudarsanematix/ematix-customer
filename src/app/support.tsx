import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../theme/ThemeProvider';
import { type, spacing, radius } from '../theme/typography';
import SharedHeader from '../components/SharedHeader';
import MaterialIcon from '../components/MaterialIcon';
import { authedFetch } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const TICKET_CATEGORIES = [
  'Ride Issue',
  'Payment & Refunds',
  'Lost Item',
  'Account & App',
  'Safety Concern',
  'Other',
];

export default function SupportTicketScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  const { token } = useAuth();

  const [category, setCategory] = useState(TICKET_CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [categoryDropdown, setCategoryDropdown] = useState(false);

  const handleSubmit = async () => {
    if (!description.trim()) {
      setErrorMsg('Please describe your issue in detail.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      await authedFetch('/api/tickets', token, {
        method: 'POST',
        body: {
          subject: category,
          description: description.trim(),
          category,
          severity: category === 'Safety Concern' ? 'high' : 'medium',
        },
      });

      setSuccess(true);
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to submit ticket. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <SafeAreaView style={styles.container}>
        <SharedHeader title="Support" currentScreen="support" />
        <View style={styles.successView}>
          <MaterialIcon name="check-circle" size={80} color={colors.primary} />
          <Text style={styles.successTitle}>Ticket Raised Successfully!</Text>
          <Text style={styles.successBody}>
            Our support team will review your request and get back to you shortly. You can check the status in the Help Center.
          </Text>
          <TouchableOpacity style={styles.successBtn} onPress={() => router.replace('/(tabs)/profile')} activeOpacity={0.85}>
            <Text style={styles.primaryBtnText}>Back to Profile</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <SharedHeader title="Contact Support" currentScreen="support" />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.headerTitle}>How can we help you?</Text>
        <Text style={styles.headerSub}>Please describe your issue and we'll resolve it as soon as possible.</Text>

        {errorMsg ? (
          <View style={styles.errorBox}>
            <MaterialIcon name="error-outline" size={16} color={colors.accentRed} />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        <Text style={styles.label}>Select Category</Text>
        <TouchableOpacity style={styles.picker} activeOpacity={0.8} onPress={() => setCategoryDropdown(!categoryDropdown)}>
          <Text style={styles.pickerText}>{category}</Text>
          <MaterialIcon name={categoryDropdown ? 'expand-less' : 'expand-more'} size={20} color={colors.textMuted} />
        </TouchableOpacity>

        {categoryDropdown && (
          <View style={styles.dropdownMenu}>
            {TICKET_CATEGORIES.map((cat, i) => (
              <TouchableOpacity
                key={cat}
                style={[styles.dropdownItem, i === TICKET_CATEGORIES.length - 1 && { borderBottomWidth: 0 }]}
                onPress={() => {
                  setCategory(cat);
                  setCategoryDropdown(false);
                }}
              >
                <Text style={styles.dropdownItemText}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={styles.label}>Describe your issue</Text>
        <TextInput
          style={styles.textArea}
          placeholder="I noticed a problem with..."
          placeholderTextColor={colors.textMuted}
          multiline
          textAlignVertical="top"
          value={description}
          onChangeText={setDescription}
        />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.primaryBtn} onPress={handleSubmit} disabled={isSubmitting} activeOpacity={0.85}>
          {isSubmitting ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <Text style={styles.primaryBtnText}>Submit Ticket</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing.marginMobile, paddingBottom: 100 },
  headerTitle: { ...type.headlineMd, color: colors.onSurface, marginBottom: spacing.stackXs },
  headerSub: { ...type.bodyMd, color: colors.onSurfaceVariant, marginBottom: spacing.stackLg },
  label: { ...type.labelLg, color: colors.onSurface, marginBottom: spacing.stackSm },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainerLowest,
    padding: spacing.stackMd,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
    marginBottom: spacing.stackLg,
  },
  pickerText: { ...type.bodyLg, color: colors.onSurface },
  dropdownMenu: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
    marginTop: -spacing.stackMd,
    marginBottom: spacing.stackLg,
    overflow: 'hidden',
  },
  dropdownItem: {
    padding: spacing.stackMd,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainer,
  },
  dropdownItemText: { ...type.bodyLg, color: colors.onSurface },
  textArea: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
    borderRadius: radius.md,
    padding: spacing.stackMd,
    height: 150,
    ...type.bodyLg,
    color: colors.onSurface,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.marginMobile,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainer,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 200,
  },
  primaryBtnText: { ...type.labelLg, color: colors.onPrimary, fontSize: 16 },
  successView: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.marginMobile,
  },
  successTitle: { ...type.headlineMd, color: colors.onSurface, marginTop: spacing.stackLg, marginBottom: spacing.stackSm, textAlign: 'center' },
  successBody: { ...type.bodyLg, color: colors.onSurfaceVariant, textAlign: 'center', marginBottom: spacing.stackXl },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorContainer,
    padding: spacing.stackMd,
    borderRadius: radius.sm,
    marginBottom: spacing.stackLg,
  },
  errorText: { ...type.bodyMd, color: colors.onErrorContainer, marginLeft: spacing.stackSm },
});
