import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeProvider';
import { fonts, type, spacing, radius } from '../theme/typography';
import MaterialIcon from '../components/MaterialIcon';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  const { login } = useAuth();

  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [resendIn, setResendIn] = useState(30);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [notRegistered, setNotRegistered] = useState(false);

  const phoneValid = phone.replace(/\D/g, '').length === 10;

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const sendCode = async () => {
    if (!phoneValid) return;
    setErrorMsg('');
    setLoading(true);

    setTimeout(() => {
      setNotRegistered(false);
      setOtp('');
      setResendIn(30);
      setStep('otp');
      setLoading(false);
    }, 500);
  };

  const verifyOtp = async () => {
    if (otp.length < 4) return;
    setErrorMsg('');
    setLoading(true);

    try {
      const response = await fetch('http://192.168.1.34:4000/api/auth/customer/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp })
      });

      const data = await response.json();
      if (data.success) {
        await login(data.user, data.token);
        router.replace('/(tabs)/home');
      } else if (data.error === 'USER_NOT_FOUND') {
        setNotRegistered(true);
        setErrorMsg('');
      } else {
        setErrorMsg(data.error || 'Backend verification failed');
      }
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Background Image Header */}
      <View style={styles.headerImageWrap}>
        <Image
          source={require('../../assets/images/login_bg.jpg')}
          style={styles.headerImage}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.6)']}
          locations={[0.3, 1]}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.content}>
              <View style={styles.titleWrap}>
                <View style={styles.logoBadge}>
                  <MaterialIcon name="bolt" size={32} color={colors.onPrimary} />
                </View>
                <Text style={styles.title}>Welcome to Ematix</Text>
                <Text style={styles.subtitle}>
                  {step === 'phone'
                    ? 'Enter your mobile number to get started'
                    : `Enter the 4-digit code sent to +91 ${phone.replace(/\d(?=\d{4})/g, '*')}`}
                </Text>
              </View>

              <View style={styles.formCard}>
                {step === 'phone' ? (
                  <>
                    <View style={styles.phoneRow}>
                      <View style={styles.countryCode}>
                        <Text style={styles.countryCodeText}>+91</Text>
                      </View>
                      <TextInput
                        style={styles.phoneInput}
                        placeholder="98765 43210"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="phone-pad"
                        maxLength={10}
                        value={phone}
                        onChangeText={(t) => setPhone(t.replace(/\D/g, ''))}
                      />
                    </View>

                    <TouchableOpacity
                      style={[styles.primaryBtn, !phoneValid && styles.primaryBtnDisabled]}
                      activeOpacity={0.85}
                      disabled={!phoneValid}
                      onPress={sendCode}
                    >
                      <Text style={styles.primaryBtnText}>Continue</Text>
                      <MaterialIcon name="arrow-forward" size={18} color={colors.onPrimary} />
                    </TouchableOpacity>

                    <View style={styles.signupContainer}>
                      <Text style={styles.signupText}>Don't have an account? </Text>
                      <TouchableOpacity onPress={() => router.push({ pathname: '/signup', params: { phone } })}>
                        <Text style={styles.signupLink}>Sign up</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={styles.otpRow}>
                      {[0, 1, 2, 3].map((i) => (
                        <View key={i} style={[styles.otpBox, otp.length > i && styles.otpBoxFilled]}>
                          <Text style={styles.otpDigit}>{otp[i] ?? ''}</Text>
                        </View>
                      ))}
                      <TextInput
                        style={styles.otpHidden}
                        value={otp}
                        onChangeText={(t) => { setNotRegistered(false); setOtp(t.replace(/\D/g, '').slice(0, 4)); }}
                        keyboardType="number-pad"
                        maxLength={4}
                        autoFocus
                        caretHidden
                      />
                    </View>

                    {resendIn > 0 ? (
                      <Text style={styles.resendText}>Resend code in 00:{String(resendIn).padStart(2, '0')}</Text>
                    ) : (
                      <TouchableOpacity onPress={sendCode} hitSlop={8}>
                        <Text style={styles.resendActive}>Resend code</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={[styles.primaryBtn, otp.length < 4 && styles.primaryBtnDisabled, { marginTop: spacing.stackLg }]}
                      activeOpacity={0.85}
                      disabled={otp.length < 4}
                      onPress={verifyOtp}
                    >
                      <Text style={styles.primaryBtnText}>Verify & Sign In</Text>
                      <MaterialIcon name="check" size={18} color={colors.onPrimary} />
                    </TouchableOpacity>

                    {notRegistered ? (
                      <>
                        <View style={styles.noAccCard}>
                          <MaterialIcon name="person-off" size={24} color={colors.accentRed} />
                          <View style={styles.noAccTextWrap}>
                            <Text style={styles.noAccTitle}>Account not found</Text>
                            <Text style={styles.noAccSub}>
                              You don{'\u2019'}t have an account with +91 {phone}. Create a new one to continue.
                            </Text>
                          </View>
                        </View>
                        <TouchableOpacity
                          style={styles.noAccBtn}
                          activeOpacity={0.85}
                          onPress={() => router.push({ pathname: '/signup', params: { phone } })}
                        >
                          <Text style={styles.noAccBtnText}>Create a new account</Text>
                          <MaterialIcon name="arrow-forward" size={16} color={colors.primary} />
                        </TouchableOpacity>
                      </>
                    ) : errorMsg ? (
                      <Text style={styles.errorText}>{errorMsg}</Text>
                    ) : null}

                    <TouchableOpacity style={styles.backLink} onPress={() => { setNotRegistered(false); setStep('phone'); }} hitSlop={8}>
                      <MaterialIcon name="arrow-back" size={16} color={colors.textMuted} />
                      <Text style={styles.backLinkText}>Change number</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>

              <Text style={styles.termsText}>
                By continuing you agree to Ematix{'\u2019'}s{' '}
                <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
                <Text style={styles.termsLink}>Privacy Policy</Text>.
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  headerImageWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%',
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: spacing.marginMobile,
    paddingBottom: Platform.OS === 'ios' ? 20 : 40,
  },
  scrollContent: {
    flexGrow: 1,
  },
  titleWrap: {
    marginBottom: spacing.stackXl,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.stackLg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  title: {
    ...type.headlineLg,
    color: '#ffffff',
    fontFamily: fonts.bold,
    marginBottom: spacing.stackSm,
  },
  subtitle: {
    ...type.bodyLg,
    color: 'rgba(255,255,255,0.82)',
    lineHeight: 24,
  },
  formCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: radius.xxl,
    padding: spacing.cardPadding,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
    marginBottom: spacing.stackXl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.stackLg,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    height: 60,
  },
  countryCode: {
    paddingHorizontal: spacing.stackLg,
    height: '100%',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.2)',
  },
  countryCodeText: {
    ...type.headlineSm,
    color: '#ffffff',
  },
  phoneInput: {
    flex: 1,
    ...type.headlineSm,
    color: '#ffffff',
    paddingHorizontal: spacing.stackLg,
    height: '100%',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.stackSm,
    backgroundColor: colors.primary,
    paddingVertical: 18,
    borderRadius: radius.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryBtnDisabled: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    shadowColor: 'transparent',
    elevation: 0,
  },
  primaryBtnText: {
    ...type.labelLg,
    fontSize: 16,
    color: '#ffffff',
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.stackLg,
    marginTop: spacing.stackSm,
  },
  otpBox: {
    width: 68,
    height: 72,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpBoxFilled: {
    borderColor: '#ffffff',
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  otpDigit: {
    ...type.headlineLg,
    color: '#ffffff',
  },
  otpHidden: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
    zIndex: 10,
  },
  resendText: {
    ...type.bodySm,
    color: colors.textMuted,
    textAlign: 'center',
  },
  resendActive: {
    ...type.labelMd,
    color: colors.primary,
    textAlign: 'center',
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.stackXs,
    marginTop: spacing.stackXl,
  },
  backLinkText: {
    ...type.labelMd,
    color: colors.textMuted,
  },
  errorText: {
    ...type.bodySm,
    color: colors.accentRed,
    textAlign: 'center',
    marginTop: spacing.stackLg,
  },
  noAccCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.stackMd,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: radius.lg,
    padding: spacing.stackMd,
    marginTop: spacing.stackLg,
  },
  noAccTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  noAccTitle: {
    ...type.labelMd,
    color: '#ffffff',
    fontFamily: fonts.bold,
  },
  noAccSub: {
    ...type.bodySm,
    color: 'rgba(255,255,255,0.72)',
    marginTop: 2,
  },
  noAccBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.stackSm,
    marginTop: spacing.stackMd,
  },
  noAccBtnText: {
    ...type.labelMd,
    color: '#ffffff',
    fontFamily: fonts.semibold,
  },
  termsText: {
    ...type.bodySm,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    color: '#ffffff',
    fontFamily: fonts.semibold,
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.stackLg,
  },
  signupText: {
    ...type.bodyMd,
    color: 'rgba(255,255,255,0.8)',
  },
  signupLink: {
    ...type.labelMd,
    color: '#ffffff',
  },
});