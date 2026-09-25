import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../theme/ThemeProvider';
import { useAuth } from '../context/AuthContext';
import { fonts, type, spacing, radius } from '../theme/typography';
import MaterialIcon from '../components/MaterialIcon';

type FieldProps = {
  icon: string;
  label: string;
  optional?: boolean;
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'number-pad';
  autoCap?: 'none' | 'words' | 'characters';
  maxLength?: number;
  prefix?: React.ReactNode;
};

const Field = ({
  icon,
  label,
  optional,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCap,
  maxLength,
  prefix,
}: FieldProps) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createFieldStyles(colors), [colors]);
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>
        {label}
        {optional ? <Text style={styles.fieldOptional}>  (optional)</Text> : null}
      </Text>
      <View style={[styles.inputWrap, focused && styles.inputWrapFocused]}>
        {prefix}
        <MaterialIcon
          name={icon as any}
          size={20}
          color={focused ? colors.primary : colors.textMuted}
        />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          keyboardType={keyboardType || 'default'}
          autoCapitalize={autoCap || 'none'}
          maxLength={maxLength}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </View>
    </View>
  );
};

export default function SignupScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  const params = useLocalSearchParams();
  const { login } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState((params.phone as string) || '');
  const [homeAddress, setHomeAddress] = useState('');
  const [workAddress, setWorkAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const phoneValid = phone.replace(/\D/g, '').length === 10;
  const isFormValid = name.trim().length > 2 && phoneValid;

  const handleSignup = async () => {
    if (!isFormValid) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const response = await fetch('http://192.168.1.34:4000/api/auth/customer/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, name, email, homeAddress, workAddress })
      });
      const data = await response.json();
      if (data.success) {
        await login(data.user, data.token);
        router.replace('/(tabs)/home');
      } else {
        setErrorMsg(data.error || 'Registration failed');
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
            <MaterialIcon name="arrow-back" size={24} color={colors.onSurface} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Sign up</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient
            colors={[colors.primary, colors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={styles.heroIcon}>
              <MaterialIcon name="delivery-dining" size={36} color={colors.primary} />
            </View>
            <Text style={styles.heroEyebrow}>EMATIX</Text>
            <Text style={styles.heroTitle}>Create your account</Text>
            <Text style={styles.heroSubtitle}>
              Book quick and safe deliveries across the city in under a minute.
            </Text>
          </LinearGradient>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionBadge}>
                <MaterialIcon name="person-outline" size={18} color={colors.primary} />
              </View>
              <View style={styles.sectionHeaderText}>
                <Text style={styles.sectionTitle}>Personal details</Text>
                <Text style={styles.sectionSubtitle}>How we identify you</Text>
              </View>
            </View>

            <Field
              icon="person-outline"
              label="Full Name"
              value={name}
              onChangeText={setName}
              placeholder="e.g. Rahul Sharma"
              autoCap="words"
            />
            <Field
              icon="mail-outline"
              label="Email Address"
              optional
              value={email}
              onChangeText={setEmail}
              placeholder="your@email.com"
              keyboardType="email-address"
            />
            <Field
              icon="phone"
              label="Mobile Number"
              value={phone}
              onChangeText={(t) => setPhone(t.replace(/\D/g, ''))}
              placeholder="98765 43210"
              keyboardType="phone-pad"
              maxLength={10}
              prefix={
                <View style={styles.countryCode}>
                  <Text style={styles.countryCodeText}>+91</Text>
                </View>
              }
            />
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionBadge}>
                <MaterialIcon name="place" size={18} color={colors.primary} />
              </View>
              <View style={styles.sectionHeaderText}>
                <Text style={styles.sectionTitle}>Saved addresses</Text>
                <Text style={styles.sectionSubtitle}>Optional — speeds up booking</Text>
              </View>
            </View>

            <Field
              icon="home"
              label="Home Address"
              optional
              value={homeAddress}
              onChangeText={setHomeAddress}
              placeholder="e.g. 42, Gandhi Street, Velachery"
            />
            <Field
              icon="work"
              label="Work Address"
              optional
              value={workAddress}
              onChangeText={setWorkAddress}
              placeholder="e.g. Tidel Park, Taramani"
            />
          </View>

          {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={!isFormValid || loading}
            onPress={handleSignup}
          >
            <LinearGradient
              colors={
                isFormValid
                  ? [colors.primary, colors.secondary]
                  : [colors.surfaceContainerHigh, colors.surfaceContainerHigh]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.primaryBtn}
            >
              <Text style={styles.primaryBtnText}>
                {loading ? 'Creating account...' : 'Create Account'}
              </Text>
              <MaterialIcon name="arrow-forward" size={18} color={colors.onPrimary} />
            </LinearGradient>
          </TouchableOpacity>
          <Text style={styles.termsText}>
            By creating an account you agree to Ematix{'\u2019'}s{' '}
            <Text style={styles.termsLink}>Terms</Text> &amp; <Text style={styles.termsLink}>Privacy Policy</Text>.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.marginMobile,
    paddingVertical: spacing.stackLg,
  },
  backBtn: {
    padding: spacing.stackXs,
    marginLeft: -spacing.stackXs,
  },
  headerTitle: {
    ...type.headlineSm,
    color: colors.onSurface,
  },
  scrollContent: {
    padding: spacing.marginMobile,
    paddingTop: spacing.stackXs,
    paddingBottom: spacing.stackXl,
  },
  hero: {
    borderRadius: radius.xxl,
    padding: spacing.stackXl,
    marginBottom: spacing.stackXl,
    overflow: 'hidden',
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.onPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.stackLg,
  },
  heroEyebrow: {
    ...type.labelSm,
    color: colors.inversePrimary,
    letterSpacing: 2,
    marginBottom: spacing.stackXs,
  },
  heroTitle: {
    ...type.headlineLg,
    color: colors.onPrimary,
    marginBottom: spacing.stackSm,
  },
  heroSubtitle: {
    ...type.bodyMd,
    color: colors.inversePrimary,
    lineHeight: 20,
  },
  sectionCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.xl,
    padding: spacing.cardPadding,
    marginBottom: spacing.stackLg,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.stackSm,
    marginBottom: spacing.stackLg,
  },
  sectionBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.lightBlueTint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionTitle: {
    ...type.headlineSm,
    color: colors.onSurface,
  },
  sectionSubtitle: {
    ...type.bodySm,
    color: colors.textMuted,
  },
  countryCode: {
    marginRight: spacing.stackXs,
  },
  countryCodeText: {
    ...type.labelMd,
    color: colors.onSurface,
  },
  errorText: {
    ...type.bodySm,
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing.stackSm,
  },
  footer: {
    padding: spacing.marginMobile,
    paddingBottom: Platform.OS === 'ios' ? spacing.stackXl : spacing.marginMobile,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainer,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.stackSm,
    paddingVertical: spacing.stackMd,
    borderRadius: radius.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 4,
  },
  primaryBtnText: {
    ...type.labelLg,
    color: colors.onPrimary,
  },
  termsText: {
    ...type.bodySm,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.stackLg,
    lineHeight: 18,
  },
  termsLink: {
    color: colors.primary,
    fontFamily: fonts.semibold,
  },
});

const createFieldStyles = (colors: any) => StyleSheet.create({
  fieldGroup: {
    marginBottom: spacing.stackLg,
  },
  fieldLabel: {
    ...type.labelMd,
    color: colors.onSurface,
    marginBottom: spacing.stackSm,
  },
  fieldOptional: {
    ...type.bodySm,
    color: colors.textMuted,
    fontFamily: fonts.regular,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.stackSm,
    backgroundColor: colors.surfaceGray,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.stackMd,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  inputWrapFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    ...type.bodyLg,
    color: colors.onSurface,
    paddingVertical: spacing.stackMd,
  },
});