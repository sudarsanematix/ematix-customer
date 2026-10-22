import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Switch,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/ThemeProvider';
import { fonts, type, spacing, radius } from '../../theme/typography';
import SharedHeader from '../../components/SharedHeader';
import MaterialIcon from '../../components/MaterialIcon';
import { useAuth } from '../../context/AuthContext';
import { authedFetch } from '../../utils/api';
import { changeAppLanguage } from '../../i18n';
import { SUPPORTED_LANGUAGES, type AppLanguage } from '../../i18n/languages';

// Number formatting for the stat tiles. `toLocaleString` keeps the thousands
// separators the old mock values used to carry.
const formatCount = (n: number) => n.toLocaleString('en-IN');

type SheetId =
  | 'edit'
  | 'payments'
  | 'addresses'
  | 'notifications'
  | 'emergency'
  | 'help'
  | 'preferences'
  | null;

function Sheet({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.sheetWrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8} activeOpacity={0.7}>
              <MaterialIcon name="close" size={20} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>
          <ScrollView bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetContent}>
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Row({
  icon,
  label,
  sublabel,
  onPress,
  last,
}: {
  icon: React.ComponentProps<typeof MaterialIcon>['name'];
  label: string;
  sublabel?: string;
  onPress: () => void;
  last?: boolean;
}) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return (
    <TouchableOpacity
      style={[styles.optionRow, last && styles.optionRowLast]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View style={styles.optionIconWrap}>
        <MaterialIcon name={icon} size={20} color={colors.primary} />
      </View>
      <View style={styles.optionTextWrap}>
        <Text style={styles.optionText}>{label}</Text>
        {sublabel ? <Text style={styles.optionSub}>{sublabel}</Text> : null}
      </View>
      <MaterialIcon name="chevron-right" size={20} color={colors.outlineVariant} />
    </TouchableOpacity>
  );
}

function ToggleRow({
  label,
  sublabel,
  value,
  onValueChange,
}: {
  label: string;
  sublabel?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return (
    <View style={[styles.optionRow, styles.optionRowLast]}>
      <View style={styles.optionTextWrap}>
        <Text style={styles.optionText}>{label}</Text>
        {sublabel ? <Text style={styles.optionSub}>{sublabel}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: colors.primaryContainer, false: colors.surfaceContainerHigh }}
        thumbColor={value ? colors.onPrimary : colors.surfaceContainerLowest}
      />
    </View>
  );
}

export default function ProfileScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { user, token, logout, login, refresh, stats, rating, isRefreshing } = useAuth();

  // The FAQs are copy rather than data, so they are read from the dictionary
  // at render time instead of being frozen at module load.
  const faqs = [
    { q: t('profile.faqBookRideQ'), a: t('profile.faqBookRideA') },
    { q: t('profile.faqParcelQ'), a: t('profile.faqParcelA') },
    { q: t('profile.faqAskQ'), a: t('profile.faqAskA') },
  ];

  const [sheet, setSheet] = useState<SheetId>(null);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [addAddressVisible, setAddAddressVisible] = useState(false);
  const [newAddressName, setNewAddressName] = useState('');
  const [newAddressText, setNewAddressText] = useState('');

  const [addContactVisible, setAddContactVisible] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactRelation, setNewContactRelation] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');

  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Preferences are server-owned. Local state only exists so a toggle feels
  // instant; every change is persisted and the server copy wins on refresh.
  const [notifPrefs, setNotifPrefs] = useState({
    rides: true,
    deliveries: true,
    offers: false,
    safety: true,
  });
  const [prefs, setPrefs] = useState({
    receipts: true,
    shareLive: false,
    language: 'en' as AppLanguage,
  });

  // Adopt the persisted preferences whenever a new server copy arrives. This
  // runs during render rather than in an effect (React's "adjust state when a
  // prop changes" pattern) so it does not trigger a cascading render.
  const [syncedPreferences, setSyncedPreferences] = useState(user?.preferences);
  if (user?.preferences !== syncedPreferences) {
    setSyncedPreferences(user?.preferences);
    const p = user?.preferences;
    if (p) {
      setNotifPrefs({
        rides: p.notifications.rides,
        deliveries: p.notifications.deliveries,
        offers: p.notifications.offers,
        safety: p.notifications.safety,
      });
      setPrefs({
        receipts: p.receipts,
        shareLive: p.shareLiveLocation,
        language: p.language,
      });
    }
  }

  // Load stats and the authoritative profile the first time this screen mounts.
  useEffect(() => {
    refresh();
  }, [refresh]);

  const userName = user?.name || t('common.guest');
  const userPhone = user?.phone || t('profile.noPhone');
  const [payments, setPayments] = useState([
    { id: 'card', type: 'card' as const, title: 'HDFC Visa \u2022\u2022\u2022\u2022 4829', sub: t('profile.paymentExpires', { date: '08 / 27' }) },
    { id: 'upi', type: 'upi' as const, title: 'UPI \u2022 alex@okhdfc', sub: t('profile.defaultPaymentMethod') },
  ]);
  const [faqOpen, setFaqOpen] = useState<number | null>(0);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  };

  const removePayment = (id: string) => {
    setPayments((p) => p.filter((x) => x.id !== id));
    showToast(t('profile.paymentMethodRemoved'));
  };

  const saveProfile = async () => {
    if (!token) return;
    setSavingProfile(true);
    try {
      const data = await authedFetch('/api/profile/customer/profile', token, {
        method: 'PUT',
        body: { name: editName.trim(), email: editEmail.trim() },
      });
      if (data?.user) {
        await login(data.user, token);
        setSheet(null);
        showToast(t('profile.profileUpdated'));
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : t('errors.couldNotSaveProfile'));
    } finally {
      setSavingProfile(false);
    }
  };

  // Preferences are written optimistically then reconciled with the server
  // response, so a rejected write snaps back to the authoritative values.
  const persistPreferences = async (patch: Record<string, unknown>) => {
    if (!token) return;
    try {
      const data = await authedFetch('/api/profile/customer/preferences', token, {
        method: 'PUT',
        body: patch,
      });
      if (data?.user) await login(data.user, token);
    } catch {
      showToast(t('errors.couldNotSavePreference'));
      refresh();
    }
  };

  const setNotifPref = (key: 'rides' | 'deliveries' | 'offers' | 'safety', value: boolean) => {
    setNotifPrefs((s) => {
      const next = { ...s, [key]: value };
      persistPreferences({ notifications: { [key]: value } });
      return next;
    });
  };

  const setPref = (key: 'receipts' | 'shareLive', value: boolean) => {
    setPrefs((s) => {
      const next = { ...s, [key]: value };
      persistPreferences({ [key === 'shareLive' ? 'shareLiveLocation' : key]: value });
      return next;
    });
  };

  // The language is owned by the i18n singleton, so the chip reflects what is
  // on screen rather than what the account happens to hold. The account copy
  // is written after the switch and never holds it up.
  const activeLanguage = (i18n.language.split('-')[0] || 'en') as AppLanguage;

  const selectLanguage = async (language: AppLanguage) => {
    setPrefs((s) => ({ ...s, language }));
    await changeAppLanguage(language, async (code) => {
      if (!token) return;
      const data = await authedFetch('/api/profile/customer/preferences', token, {
        method: 'PUT',
        body: { language: code },
      });
      if (data?.user) await login(data.user, token);
    });
  };

  const saveNewAddress = async () => {
    if (!newAddressName.trim() || !newAddressText.trim()) {
      showToast(t('profile.addressRequired'));
      return;
    }

    let lat, lng;
    try {
      const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(newAddressText.trim())}.json?access_token=${MAPBOX_TOKEN}&limit=1`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.features && data.features.length > 0) {
        lng = data.features[0].center[0];
        lat = data.features[0].center[1];
      }
    } catch (e) {
      console.warn('Geocoding failed for saved address', e);
    }

    try {
      const currentLocs = user?.savedLocations || [];
      const updated = [...currentLocs, { name: newAddressName.trim(), address: newAddressText.trim(), lat, lng }];
      const data = await authedFetch('/api/auth/customer/saved-locations', token, {
        method: 'POST',
        body: { savedLocations: updated },
      });
      if (data?.success && data.user && token) {
        await login(data.user, token);
        setAddAddressVisible(false);
        setNewAddressName('');
        setNewAddressText('');
        showToast(t('profile.addressSaved'));
      } else {
        showToast(t('errors.couldNotSaveAddress'));
      }
    } catch {
      showToast(t('errors.networkShort'));
    }
  };

  const removeAddress = async (nameToRemove: string) => {
    try {
      const currentLocs = user?.savedLocations || [];
      const updated = currentLocs.filter((l: any) => l.name !== nameToRemove);
      const data = await authedFetch('/api/auth/customer/saved-locations', token, {
        method: 'POST',
        body: { savedLocations: updated },
      });
      if (data?.success && data.user && token) {
        await login(data.user, token);
        showToast(t('profile.addressRemoved'));
      }
    } catch {
      showToast(t('errors.networkShort'));
    }
  };

  const saveNewContact = async () => {
    if (!newContactName.trim() || !newContactPhone.trim()) {
      showToast(t('profile.contactRequired'));
      return;
    }
    try {
      const currentContacts = user?.emergencyContacts || [];
      const updated = [...currentContacts, { name: newContactName.trim(), relation: newContactRelation.trim() || 'Friend', phone: newContactPhone.trim() }];
      const data = await authedFetch('/api/auth/customer/emergency-contacts', token, {
        method: 'POST',
        body: { emergencyContacts: updated },
      });
      if (data?.success && data.user && token) {
        await login(data.user, token);
        setAddContactVisible(false);
        setNewContactName('');
        setNewContactRelation('');
        setNewContactPhone('');
        showToast(t('profile.contactSaved'));
      } else {
        showToast(t('errors.couldNotSaveContact'));
      }
    } catch {
      showToast(t('errors.networkShort'));
    }
  };

  const removeContact = async (phoneToRemove: string) => {
    try {
      const currentContacts = user?.emergencyContacts || [];
      const updated = currentContacts.filter((c: any) => c.phone !== phoneToRemove);
      const data = await authedFetch('/api/auth/customer/emergency-contacts', token, {
        method: 'POST',
        body: { emergencyContacts: updated },
      });
      if (data?.success && data.user && token) {
        await login(data.user, token);
        showToast(t('profile.contactRemoved'));
      }
    } catch {
      showToast(t('errors.networkShort'));
    }
  };

  return (
    <View style={styles.container}>
      <SharedHeader currentScreen="profile" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Card */}
        <View style={styles.userCard}>
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarFallback}>{userName.charAt(0)}</Text>
            <View style={styles.avatarBadge}>
              <MaterialIcon name="verified" size={12} color={colors.onPrimary} />
            </View>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{userName}</Text>
            <Text style={styles.userPhone}>{userPhone}</Text>
            {rating?.rating != null ? (
              <View style={styles.ratingWrap}>
                <MaterialIcon name="star" size={13} color="#f4b400" />
                <Text style={styles.ratingText}>{t('profile.rated', { rating: rating.rating.toFixed(1) })}</Text>
              </View>
            ) : null}
          </View>
          <TouchableOpacity style={styles.editBtn} activeOpacity={0.8} onPress={() => {
            setEditName(user?.name || '');
            setEditEmail(user?.email || '');
            setSheet('edit');
          }}>
            <MaterialIcon name="edit" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {([
            { label: t('profile.statTrips'), value: stats?.rides, icon: 'local-taxi' },
            { label: t('profile.statDeliveries'), value: stats?.deliveries, icon: 'inventory-2' },
            { label: t('profile.statTotalSpent'), value: stats?.lifetimeSpend, icon: 'account-balance-wallet', prefix: '\u20b9' },
          ] as const).map((s) => (
            <View key={s.label} style={styles.statTile}>
              <MaterialIcon name={s.icon} size={20} color={colors.primary} />
              <Text style={styles.statValue}>
                {isRefreshing && s.value === undefined ? '--' : `${'prefix' in s ? s.prefix : ''}${formatCount(s.value ?? 0)}`}
              </Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Account */}
        <View style={styles.optionsGroup}>
          <Text style={styles.groupTitle}>{t('profile.groupAccount')}</Text>
          <Row icon="account-balance-wallet" label={t('nav.wallet')} sublabel={t('profile.walletSublabel')} onPress={() => router.push('/wallet')} />
          <Row icon="credit-card" label={t('wallet.paymentMethods')} sublabel={payments.length ? t('profile.paymentsLinked', { count: payments.length }) : t('profile.noneLinked')} onPress={() => setSheet('payments')} />
          <Row icon="location-on" label={t('profile.savedAddresses')} sublabel={t('profile.addressesSaved', { count: user?.savedLocations?.length || 0 })} onPress={() => setSheet('addresses')} />
          <Row icon="notifications-none" label={t('nav.notifications')} onPress={() => setSheet('notifications')} />
          <Row icon="settings" label={t('nav.settings')} sublabel={t('profile.settingsSublabel')} onPress={() => router.push('/settings')} last />
        </View>

        {/* Safety & Support */}
        <View style={styles.optionsGroup}>
          <Text style={styles.groupTitle}>{t('profile.groupSafety')}</Text>
          <Row icon="shield" label={t('profile.emergencyContacts')} sublabel={t('profile.contactsAdded', { count: user?.emergencyContacts?.length || 0 })} onPress={() => setSheet('emergency')} />
          <Row icon="help-outline" label={t('nav.helpCenter')} onPress={() => setSheet('help')} />
          <Row icon="tune" label={t('profile.groupPreferences')} onPress={() => setSheet('preferences')} last />
        </View>

        {/* Invite / Rewards banner */}
        <TouchableOpacity style={styles.rewardsCard} activeOpacity={0.85} onPress={() => showToast(t('profile.referralCopied'))}>
          <View style={styles.rewardsIconWrap}>
            <MaterialIcon name="card-giftcard" size={22} color={colors.onPrimary} />
          </View>
          <View style={styles.rewardsTextWrap}>
            <Text style={styles.rewardsTitle}>{t('profile.referralTitle')}</Text>
            <Text style={styles.rewardsSub}>{t('profile.referralSub')}</Text>
          </View>
          <MaterialIcon name="chevron-right" size={20} color={colors.onSurfaceVariant} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} activeOpacity={0.85} onPress={async () => {
          await logout();
          router.replace('/login');
        }}>
          <MaterialIcon name="logout" size={18} color={colors.accentRed} />
          <Text style={styles.logoutText}>{t('common.logOut')}</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>{t('common.appVersion')}</Text>
      </ScrollView>

      {/* Edit Profile */}
      <Sheet visible={sheet === 'edit'} title={t('profile.editProfile')} onClose={() => setSheet(null)}>
        <Text style={styles.fieldLabel}>{t('profile.fullName')}</Text>
        <TextInput
          style={styles.input}
          value={editName}
          onChangeText={setEditName}
          placeholder={t('profile.fullName')}
          placeholderTextColor={colors.textMuted}
        />
        <Text style={[styles.fieldLabel, { marginTop: spacing.stackMd }]}>{t('profile.email')}</Text>
        <TextInput
          style={styles.input}
          value={editEmail}
          onChangeText={setEditEmail}
          placeholder={t('auth.emailPlaceholder')}
          placeholderTextColor={colors.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Text style={styles.fieldLabel}>{t('profile.mobileNumber')}</Text>
        {/* Phone is the login handle and the unique account key, so it cannot
            be changed from here. */}
        <View style={[styles.input, styles.readOnlyInput]}>
          <Text style={styles.readOnlyText}>{userPhone}</Text>
        </View>
        <Text style={styles.readOnlyHint}>{t('profile.mobileReadOnly')}</Text>
        <TouchableOpacity
          style={styles.primaryBtn}
          activeOpacity={0.85}
          onPress={saveProfile}
          disabled={savingProfile}
        >
          <Text style={styles.primaryBtnText}>{savingProfile ? t('common.saving') : t('profile.saveChanges')}</Text>
        </TouchableOpacity>
      </Sheet>

      {/* Payment Methods */}
      <Sheet visible={sheet === 'payments'} title={t('wallet.paymentMethods')} onClose={() => setSheet(null)}>
        {payments.length === 0 ? (
          <Text style={styles.emptyText}>{t('profile.noPaymentMethods')}</Text>
        ) : (
          payments.map((p) => (
            <View key={p.id} style={styles.paymentCard}>
              <View style={styles.paymentLeft}>
                <View style={[styles.paymentIconWrap, p.type === 'card' && styles.paymentIconDark]}>
                  <MaterialIcon name={p.type === 'card' ? 'credit-card' : 'account-balance-wallet'} size={20} color={p.type === 'card' ? colors.onPrimary : colors.primary} />
                </View>
                <View style={styles.paymentTextWrap}>
                  <Text style={styles.paymentTitle}>{p.title}</Text>
                  <Text style={styles.paymentSub}>{p.sub}</Text>
                </View>
              </View>
              <TouchableOpacity activeOpacity={0.8} onPress={() => removePayment(p.id)} hitSlop={8}>
                <Text style={styles.removeText}>{t('common.remove')}</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
        <TouchableOpacity
          style={styles.addBtn}
          activeOpacity={0.85}
          onPress={() => showToast(t('profile.newPaymentMethodSoon'))}
        >
          <MaterialIcon name="add" size={18} color={colors.primary} />
          <Text style={styles.addBtnText}>{t('profile.addPaymentMethod')}</Text>
        </TouchableOpacity>
      </Sheet>

      {/* Saved Addresses */}
      <Sheet visible={sheet === 'addresses'} title={t('profile.savedAddresses')} onClose={() => setSheet(null)}>
        {user?.savedLocations?.map((p: any, i: number) => (
          <View key={p.name + i} style={styles.addressCard}>
            <View style={styles.addressIconWrap}>
              <MaterialIcon name={p.name.toLowerCase() === 'home' ? 'home' : p.name.toLowerCase() === 'work' ? 'corporate-fare' : 'location-on'} size={18} color={colors.primary} />
            </View>
            <View style={styles.paymentTextWrap}>
              <Text style={styles.paymentTitle}>{p.name}</Text>
              <Text style={styles.paymentSub}>{p.address}</Text>
            </View>
            <TouchableOpacity style={styles.defaultBtn} activeOpacity={0.85} onPress={() => removeAddress(p.name)}>
              <Text style={styles.removeText}>{t('common.remove')}</Text>
            </TouchableOpacity>
          </View>
        ))}
        {(!user?.savedLocations || user.savedLocations.length === 0) && (
          <Text style={styles.emptyText}>{t('profile.noSavedAddresses')}</Text>
        )}
        <TouchableOpacity style={styles.addBtn} activeOpacity={0.85} onPress={() => { setSheet(null); setAddAddressVisible(true); }}>
          <MaterialIcon name="add" size={18} color={colors.primary} />
          <Text style={styles.addBtnText}>{t('profile.addNewAddress')}</Text>
        </TouchableOpacity>
      </Sheet>

      {/* Add Address Form */}
      <Sheet visible={addAddressVisible} title={t('profile.addAddress')} onClose={() => setAddAddressVisible(false)}>
        <Text style={styles.fieldLabel}>{t('profile.addressNameLabel')}</Text>
        <TextInput style={styles.input} value={newAddressName} onChangeText={setNewAddressName} placeholder={t('home.homeTag')} placeholderTextColor={colors.textMuted} />
        <Text style={[styles.fieldLabel, { marginTop: spacing.stackMd }]}>{t('profile.address')}</Text>
        <TextInput style={styles.input} value={newAddressText} onChangeText={setNewAddressText} placeholder={t('profile.addressPlaceholder')} placeholderTextColor={colors.textMuted} />
        <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.85} onPress={saveNewAddress}>
          <Text style={styles.primaryBtnText}>{t('profile.saveAddress')}</Text>
        </TouchableOpacity>
      </Sheet>

      {/* Notifications */}
      <Sheet visible={sheet === 'notifications'} title={t('nav.notifications')} onClose={() => setSheet(null)}>
        <ToggleRow label={t('settings.notifRides')} sublabel={t('profile.notifRidesSublabel')} value={notifPrefs.rides} onValueChange={(v) => setNotifPref('rides', v)} />
        <ToggleRow label={t('settings.notifDeliveries')} sublabel={t('profile.notifDeliveriesSublabel')} value={notifPrefs.deliveries} onValueChange={(v) => setNotifPref('deliveries', v)} />
        <ToggleRow label={t('settings.notifOffers')} sublabel={t('profile.notifOffersSublabel')} value={notifPrefs.offers} onValueChange={(v) => setNotifPref('offers', v)} />
        <ToggleRow label={t('settings.notifSafety')} sublabel={t('profile.notifSafetySublabel')} value={notifPrefs.safety} onValueChange={(v) => setNotifPref('safety', v)} />
      </Sheet>

      {/* Emergency Contacts */}
      <Sheet visible={sheet === 'emergency'} title={t('profile.emergencyContacts')} onClose={() => setSheet(null)}>
        {user?.emergencyContacts?.map((c: any, i: number) => (
          <View key={c.phone + i} style={[styles.paymentCard, styles.optionRowLast]}>
            <View style={styles.avatarWrapSm}>
              <MaterialIcon name="person" size={18} color={colors.onPrimary} />
            </View>
            <View style={styles.paymentTextWrap}>
              <Text style={styles.paymentTitle}>{c.name}</Text>
              <Text style={styles.paymentSub}>{c.relation} \u2022 {c.phone}</Text>
            </View>
            <TouchableOpacity activeOpacity={0.8} onPress={() => removeContact(c.phone)} hitSlop={8}>
              <Text style={styles.removeText}>{t('common.remove')}</Text>
            </TouchableOpacity>
          </View>
        ))}
        {(!user?.emergencyContacts || user.emergencyContacts.length === 0) && (
          <Text style={styles.emptyText}>{t('profile.noEmergencyContacts')}</Text>
        )}
        <TouchableOpacity style={styles.addBtn} activeOpacity={0.85} onPress={() => { setSheet(null); setAddContactVisible(true); }}>
          <MaterialIcon name="add" size={18} color={colors.primary} />
          <Text style={styles.addBtnText}>{t('profile.addEmergencyContact')}</Text>
        </TouchableOpacity>
        <View style={styles.safetyNote}>
          <MaterialIcon name="warning" size={16} color={colors.accentRed} />
          <Text style={styles.safetyNoteText}>{t('profile.sosNote')}</Text>
        </View>
      </Sheet>

      {/* Add Contact Form */}
      <Sheet visible={addContactVisible} title={t('profile.addContact')} onClose={() => setAddContactVisible(false)}>
        <Text style={styles.fieldLabel}>{t('profile.name')}</Text>
        <TextInput style={styles.input} value={newContactName} onChangeText={setNewContactName} placeholder={t('profile.namePlaceholder')} placeholderTextColor={colors.textMuted} />
        <Text style={[styles.fieldLabel, { marginTop: spacing.stackMd }]}>{t('profile.relation')}</Text>
        <TextInput style={styles.input} value={newContactRelation} onChangeText={setNewContactRelation} placeholder={t('profile.relationPlaceholder')} placeholderTextColor={colors.textMuted} />
        <Text style={[styles.fieldLabel, { marginTop: spacing.stackMd }]}>{t('profile.phoneNumber')}</Text>
        <TextInput style={styles.input} value={newContactPhone} onChangeText={setNewContactPhone} placeholder={t('profile.phonePlaceholder')} placeholderTextColor={colors.textMuted} keyboardType="phone-pad" />
        <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.85} onPress={saveNewContact}>
          <Text style={styles.primaryBtnText}>{t('profile.saveContact')}</Text>
        </TouchableOpacity>
      </Sheet>

      {/* Help Center */}
      <Sheet visible={sheet === 'help'} title={t('nav.helpCenter')} onClose={() => setSheet(null)}>
        {faqs.map((f, i) => {
          const open = faqOpen === i;
          return (
            <View key={f.q} style={styles.faqItem}>
              <TouchableOpacity style={styles.faqHeader} activeOpacity={0.7} onPress={() => setFaqOpen(open ? null : i)}>
                <Text style={styles.faqQ}>{f.q}</Text>
                <MaterialIcon name={open ? 'expand-less' : 'expand-more'} size={20} color={colors.onSurfaceVariant} />
              </TouchableOpacity>
              {open && <Text style={styles.faqA}>{f.a}</Text>}
            </View>
          );
        })}
        <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.85} onPress={() => { setSheet(null); router.push('/support'); }}>
          <Text style={styles.primaryBtnText}>{t('profile.contactSupport')}</Text>
        </TouchableOpacity>
      </Sheet>

      {/* Preferences */}
      <Sheet visible={sheet === 'preferences'} title={t('profile.groupPreferences')} onClose={() => setSheet(null)}>
        <Text style={styles.fieldLabel}>{t('settings.groupAppearance')}</Text>
        <View style={{ marginTop: spacing.stackSm }}>
          <ToggleRow
            label={t('settings.useDarkTheme')}
            sublabel={isDark ? t('profile.darkModeOn') : t('profile.darkModeHint')}
            value={isDark}
            onValueChange={toggleTheme}
          />
        </View>
        <Text style={[styles.fieldLabel, { marginTop: spacing.stackLg }]}>{t('language.appLanguage')}</Text>
        <View style={styles.langRow}>
          {SUPPORTED_LANGUAGES.map((lang) => (
            <TouchableOpacity
              key={lang.code}
              style={[styles.langChip, activeLanguage === lang.code && styles.langChipActive]}
              activeOpacity={0.85}
              onPress={() => selectLanguage(lang.code)}
            >
              <Text style={[styles.langChipText, activeLanguage === lang.code && styles.langChipTextActive]}>{lang.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={{ marginTop: spacing.stackMd }}>
          <ToggleRow label={t('profile.receiptsWhatsapp')} sublabel={t('profile.receiptsSublabel')} value={prefs.receipts} onValueChange={(v) => setPref('receipts', v)} />
          <ToggleRow label={t('profile.shareLiveLocation')} sublabel={t('profile.shareLiveSublabel')} value={prefs.shareLive} onValueChange={(v) => setPref('shareLive', v)} />
        </View>
      </Sheet>

      {/* Logout confirm */}
      <Modal visible={logoutOpen} transparent animationType="fade" onRequestClose={() => setLogoutOpen(false)}>
        <View style={styles.alertBackdrop}>
          <View style={styles.alertCard}>
            <View style={styles.alertIconWrap}>
              <MaterialIcon name="logout" size={24} color={colors.accentRed} />
            </View>
            <Text style={styles.alertTitle}>{t('profile.logoutTitle')}</Text>
            <Text style={styles.alertBody}>{t('profile.logoutBody')}</Text>
            <TouchableOpacity style={styles.alertCancel} activeOpacity={0.85} onPress={() => setLogoutOpen(false)}>
              <Text style={styles.alertCancelText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.alertDanger}
              activeOpacity={0.85}
              onPress={() => {
                setLogoutOpen(false);
                router.replace('/login');
              }}
            >
              <Text style={styles.alertDangerText}>{t('common.logOut')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Toast */}
      {toast ? (
        <View style={styles.toast} pointerEvents="none">
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    padding: spacing.marginMobile,
    paddingBottom: 110,
    gap: spacing.stackLg,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    padding: spacing.cardPadding,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  avatarWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.stackMd,
    position: 'relative',
  },
  avatarFallback: {
    color: colors.onPrimary,
    fontSize: 24,
    fontFamily: fonts.extrabold,
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.surfaceContainerLowest,
  },
  userInfo: { flex: 1, minWidth: 0 },
  userName: { ...type.headlineSm, color: colors.onSurface },
  userPhone: { ...type.bodySm, color: colors.textMuted, marginTop: 2 },
  ratingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    alignSelf: 'flex-start',
    marginTop: spacing.stackSm,
  },
  ratingText: { ...type.labelSm, fontSize: 11, color: colors.onSurfaceVariant },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.lg,
    backgroundColor: colors.lightBlueTint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.stackMd,
  },
  statTile: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
    padding: spacing.cardPadding,
    alignItems: 'center',
    gap: spacing.stackXs,
  },
  statValue: { ...type.displayMetric, color: colors.onSurface, fontSize: 20, lineHeight: 24 },
  statLabel: { ...type.labelSm, color: colors.textMuted, textAlign: 'center' },
  optionsGroup: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.xl,
    padding: spacing.cardPadding,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
  },
  groupTitle: {
    ...type.labelSm,
    color: colors.textMuted,
    marginBottom: spacing.stackSm,
    letterSpacing: 0.4,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainer,
  },
  optionRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 4,
  },
  optionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.lightBlueTint,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.stackMd,
  },
  optionTextWrap: { flex: 1, minWidth: 0 },
  optionText: { ...type.labelMd, color: colors.onSurface },
  optionSub: { ...type.bodySm, color: colors.textMuted, marginTop: 2 },
  rewardsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.stackMd,
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.cardPadding,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  rewardsIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rewardsTextWrap: { flex: 1, minWidth: 0 },
  rewardsTitle: { ...type.labelLg, color: colors.onPrimary },
  rewardsSub: { ...type.bodySm, color: colors.onPrimaryContainer, marginTop: 2 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.stackSm,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.accentRed,
    padding: spacing.stackMd,
    borderRadius: radius.lg,
  },
  logoutText: {
    color: colors.accentRed,
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  versionText: {
    textAlign: 'center',
    color: colors.outlineVariant,
    ...type.bodySm,
    marginTop: spacing.stackXs,
  },
  sheetWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    maxHeight: '86%',
    paddingTop: spacing.stackSm,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.surfaceContainerHigh,
    marginBottom: spacing.stackSm,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.sheetPadding,
    paddingBottom: spacing.stackSm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainer,
  },
  sheetTitle: { ...type.headlineSm, color: colors.onSurface },
  sheetContent: {
    padding: spacing.sheetPadding,
    paddingBottom: 36,
    gap: spacing.stackSm,
  },
  fieldLabel: { ...type.labelSm, color: colors.textMuted, marginBottom: spacing.stackSm },
  input: {
    ...type.bodyMd,
    color: colors.onSurface,
    backgroundColor: colors.surfaceGray,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.stackMd,
    paddingVertical: spacing.stackMd,
  },
  primaryBtn: {
    backgroundColor: colors.primaryContainer,
    paddingVertical: spacing.stackMd,
    borderRadius: radius.lg,
    alignItems: 'center',
    marginTop: spacing.stackLg,
  },
  primaryBtnText: { ...type.labelMd, color: colors.onPrimary },
  readOnlyInput: {
    justifyContent: 'center',
    opacity: 0.7,
  },
  readOnlyText: { ...type.bodyMd, color: colors.onSurfaceVariant },
  readOnlyHint: {
    ...type.bodySm,
    color: colors.textMuted,
    marginTop: spacing.stackSm,
  },
  emptyText: { ...type.bodyMd, color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.stackLg },
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.stackMd,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
    borderRadius: radius.xl,
    padding: spacing.cardPadding,
    marginBottom: spacing.stackSm,
  },
  paymentLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.stackMd, minWidth: 0 },
  paymentIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    backgroundColor: colors.lightBlueTint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentIconDark: { backgroundColor: colors.primary },
  paymentTextWrap: { flex: 1, minWidth: 0 },
  paymentTitle: { ...type.labelMd, color: colors.onSurface },
  paymentSub: { ...type.bodySm, color: colors.textMuted, marginTop: 2 },
  removeText: { ...type.labelMd, color: colors.accentRed, fontSize: 12 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.stackSm,
    borderWidth: 1,
    borderColor: colors.primaryContainer,
    borderStyle: 'dashed',
    borderRadius: radius.lg,
    paddingVertical: spacing.stackMd,
    marginTop: spacing.stackSm,
  },
  addBtnText: { ...type.labelMd, color: colors.primary },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.stackMd,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
    borderRadius: radius.xl,
    padding: spacing.cardPadding,
    marginBottom: spacing.stackSm,
  },
  addressIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    backgroundColor: colors.lightBlueTint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultBtn: {
    backgroundColor: colors.lightBlueTint,
    paddingHorizontal: spacing.stackMd,
    paddingVertical: 6,
    borderRadius: 999,
  },
  defaultBtnText: { ...type.labelSm, color: colors.primary, fontSize: 11 },
  avatarWrapSm: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  safetyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.stackSm,
    backgroundColor: colors.surfaceGray,
    borderRadius: radius.lg,
    padding: spacing.stackMd,
    marginTop: spacing.stackMd,
  },
  safetyNoteText: { ...type.bodySm, color: colors.onSurfaceVariant, flex: 1 },
  faqItem: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.stackMd,
    marginBottom: spacing.stackSm,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.stackMd,
    gap: spacing.stackSm,
  },
  faqQ: { ...type.labelMd, color: colors.onSurface, flex: 1 },
  faqA: {
    ...type.bodySm,
    color: colors.onSurfaceVariant,
    paddingBottom: spacing.stackMd,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainer,
    paddingTop: spacing.stackSm,
    lineHeight: 18,
  },
  langRow: { flexDirection: 'row', gap: spacing.stackSm, flexWrap: 'wrap' },
  langChip: {
    paddingHorizontal: spacing.stackMd,
    paddingVertical: spacing.stackSm,
    borderRadius: 999,
    backgroundColor: colors.surfaceGray,
  },
  langChipActive: { backgroundColor: colors.primaryContainer },
  langChipText: { ...type.labelMd, color: colors.onSurfaceVariant },
  langChipTextActive: { color: colors.onPrimary },
  alertBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.sheetPadding,
  },
  alertCard: {
    width: '100%',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.xl,
    padding: spacing.sheetPadding,
    alignItems: 'center',
  },
  alertIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFEAEA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.stackMd,
  },
  alertTitle: { ...type.headlineSm, color: colors.onSurface },
  alertBody: {
    ...type.bodyMd,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.stackSm,
    lineHeight: 20,
  },
  alertCancel: {
    width: '100%',
    paddingVertical: spacing.stackMd,
    borderRadius: radius.lg,
    alignItems: 'center',
    backgroundColor: colors.surfaceGray,
    marginTop: spacing.stackLg,
  },
  alertCancelText: { ...type.labelMd, color: colors.onSurface },
  alertDanger: {
    width: '100%',
    paddingVertical: spacing.stackMd,
    borderRadius: radius.lg,
    alignItems: 'center',
    backgroundColor: '#C52A2E',
    marginTop: spacing.stackSm,
  },
  alertDangerText: { ...type.labelMd, color: colors.onPrimary },
  toast: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    backgroundColor: colors.inverseSurface,
    paddingHorizontal: spacing.stackLg,
    paddingVertical: spacing.stackMd,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  toastText: { ...type.labelMd, color: colors.inverseOnSurface },
});
