import React, { useState } from 'react';
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
import { useTheme } from '../../theme/ThemeProvider';
import { fonts, type, spacing, radius } from '../../theme/typography';
import SharedHeader from '../../components/SharedHeader';
import MaterialIcon from '../../components/MaterialIcon';
import { SAVED_PLACES } from '../../data/mockData';

const STATS = [
  { label: 'Trips', value: '48', icon: 'local-taxi' },
  { label: 'Deliveries', value: '23', icon: 'inventory-2' },
  { label: 'Ematix Points', value: '1,240', icon: 'stars' },
] as const;

const FAQS = [
  {
    q: 'How do I book a ride with Ematix?',
    a: 'Tap "Book a Ride" on the home screen, choose pickup & drop-off, then pick an Auto or Cab and confirm your fare.',
  },
  {
    q: 'Can Ematix deliver a parcel for me?',
    a: 'Yes. Choose "Send Parcel", set the package details and a Two-wheeler or Auto will handle it door-to-door with live tracking.',
  },
  {
    q: 'How does Ask Ematix plan trips?',
    a: 'Tell it your destination or weekend plan and it builds a stop-by-stop itinerary with suggested vehicles and fares — each leg bookable in one tap.',
  },
] as const;

const EMERGENCY_CONTACTS = [
  { name: 'Priya R.', relation: 'Sister', phone: '+91 98100 22334' },
  { name: 'Rahul M.', relation: 'Friend', phone: '+91 90001 12233' },
] as const;

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

  const [sheet, setSheet] = useState<SheetId>(null);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [userName, setUserName] = useState('Alex Johnson');
  const [userPhone, setUserPhone] = useState('+91 98765 43210');
  const [editName, setEditName] = useState(userName);
  const [editPhone, setEditPhone] = useState(userPhone);

  const [notifPrefs, setNotifPrefs] = useState({
    rides: true,
    deliveries: true,
    offers: false,
    safety: true,
  });
  const [prefs, setPrefs] = useState({
    receipts: true,
    shareLive: false,
    language: 'English',
  });
  const [payments, setPayments] = useState([
    { id: 'card', type: 'card' as const, title: 'HDFC Visa \u2022\u2022\u2022\u2022 4829', sub: 'Expires 08 / 27' },
    { id: 'upi', type: 'upi' as const, title: 'UPI \u2022 alex@okhdfc', sub: 'Default payment method' },
  ]);
  const [faqOpen, setFaqOpen] = useState<number | null>(0);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  };

  const removePayment = (id: string) => {
    setPayments((p) => p.filter((x) => x.id !== id));
    showToast('Payment method removed');
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
            <View style={styles.ratingWrap}>
              <MaterialIcon name="star" size={13} color="#f4b400" />
              <Text style={styles.ratingText}>4.9 rated</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.editBtn} activeOpacity={0.8} onPress={() => setSheet('edit')}>
            <MaterialIcon name="edit" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {STATS.map((s) => (
            <View key={s.label} style={styles.statTile}>
              <MaterialIcon name={s.icon} size={20} color={colors.primary} />
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Account */}
        <View style={styles.optionsGroup}>
          <Text style={styles.groupTitle}>Account</Text>
          <Row icon="account-balance-wallet" label="Wallet" sublabel="Balance & top-up" onPress={() => router.push('/wallet')} />
          <Row icon="credit-card" label="Payment Methods" sublabel={payments.length ? `${payments.length} linked` : 'None'} onPress={() => setSheet('payments')} />
          <Row icon="location-on" label="Saved Addresses" sublabel={`${SAVED_PLACES.length} saved`} onPress={() => setSheet('addresses')} />
          <Row icon="notifications-none" label="Notifications" onPress={() => setSheet('notifications')} />
          <Row icon="settings" label="Settings" sublabel="Appearance, language & more" onPress={() => router.push('/settings')} last />
        </View>

        {/* Safety & Support */}
        <View style={styles.optionsGroup}>
          <Text style={styles.groupTitle}>Safety & Support</Text>
          <Row icon="shield" label="Emergency Contacts" sublabel={`${EMERGENCY_CONTACTS.length} added`} onPress={() => setSheet('emergency')} />
          <Row icon="help-outline" label="Help Center" onPress={() => setSheet('help')} />
          <Row icon="tune" label="Preferences" onPress={() => setSheet('preferences')} last />
        </View>

        {/* Invite / Rewards banner */}
        <TouchableOpacity style={styles.rewardsCard} activeOpacity={0.85} onPress={() => showToast('Referral code copied: ALEX120')}>
          <View style={styles.rewardsIconWrap}>
            <MaterialIcon name="card-giftcard" size={22} color={colors.onPrimary} />
          </View>
          <View style={styles.rewardsTextWrap}>
            <Text style={styles.rewardsTitle}>Invite friends, earn ₹120</Text>
            <Text style={styles.rewardsSub}>Give ₹50 & get ₹120 on their first ride</Text>
          </View>
          <MaterialIcon name="chevron-right" size={20} color={colors.onSurfaceVariant} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} activeOpacity={0.85} onPress={() => setLogoutOpen(true)}>
          <MaterialIcon name="logout" size={18} color={colors.accentRed} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>Ematix v1.0.0</Text>
      </ScrollView>

      {/* Edit Profile */}
      <Sheet visible={sheet === 'edit'} title="Edit Profile" onClose={() => setSheet(null)}>
        <Text style={styles.fieldLabel}>Full name</Text>
        <TextInput style={styles.input} value={editName} onChangeText={setEditName} placeholder="Full name" placeholderTextColor={colors.textMuted} />
        <Text style={[styles.fieldLabel, { marginTop: spacing.stackMd }]}>Mobile number</Text>
        <TextInput style={styles.input} value={editPhone} onChangeText={setEditPhone} placeholder="Mobile number" placeholderTextColor={colors.textMuted} keyboardType="phone-pad" />
        <TouchableOpacity
          style={styles.primaryBtn}
          activeOpacity={0.85}
          onPress={() => {
            setUserName(editName.trim() || userName);
            setUserPhone(editPhone.trim() || userPhone);
            setSheet(null);
            showToast('Profile updated');
          }}
        >
          <Text style={styles.primaryBtnText}>Save changes</Text>
        </TouchableOpacity>
      </Sheet>

      {/* Payment Methods */}
      <Sheet visible={sheet === 'payments'} title="Payment Methods" onClose={() => setSheet(null)}>
        {payments.length === 0 ? (
          <Text style={styles.emptyText}>No payment methods added yet.</Text>
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
                <Text style={styles.removeText}>Remove</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
        <TouchableOpacity
          style={styles.addBtn}
          activeOpacity={0.85}
          onPress={() => showToast('New payment method coming soon')}
        >
          <MaterialIcon name="add" size={18} color={colors.primary} />
          <Text style={styles.addBtnText}>Add payment method</Text>
        </TouchableOpacity>
      </Sheet>

      {/* Saved Addresses */}
      <Sheet visible={sheet === 'addresses'} title="Saved Addresses" onClose={() => setSheet(null)}>
        {SAVED_PLACES.map((p: any, i: number) => (
          <View key={p.title} style={styles.addressCard}>
            <View style={styles.addressIconWrap}>
              <MaterialIcon name={p.tagType === 'home' ? 'home' : p.tagType === 'work' ? 'corporate-fare' : 'sports-tennis'} size={18} color={colors.primary} />
            </View>
            <View style={styles.paymentTextWrap}>
              <Text style={styles.paymentTitle}>{p.title}</Text>
              <Text style={styles.paymentSub}>{p.subtitle}</Text>
            </View>
            <TouchableOpacity style={styles.defaultBtn} activeOpacity={0.85} onPress={() => showToast(`${p.title} set as default`)}>
              <Text style={styles.defaultBtnText}>{i === 0 ? 'Default' : 'Set'}</Text>
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity style={styles.addBtn} activeOpacity={0.85} onPress={() => showToast('Add address coming soon')}>
          <MaterialIcon name="add" size={18} color={colors.primary} />
          <Text style={styles.addBtnText}>Add new address</Text>
        </TouchableOpacity>
      </Sheet>

      {/* Notifications */}
      <Sheet visible={sheet === 'notifications'} title="Notifications" onClose={() => setSheet(null)}>
        <ToggleRow label="Ride updates" sublabel="Booking, driver & fare alerts" value={notifPrefs.rides} onValueChange={(v) => setNotifPrefs((s) => ({ ...s, rides: v }))} />
        <ToggleRow label="Delivery updates" sublabel="Pickup, transit & drop-off alerts" value={notifPrefs.deliveries} onValueChange={(v) => setNotifPrefs((s) => ({ ...s, deliveries: v }))} />
        <ToggleRow label="Offers & promos" sublabel="Discounts and cashback" value={notifPrefs.offers} onValueChange={(v) => setNotifPrefs((s) => ({ ...s, offers: v }))} />
        <ToggleRow label="Safety alerts" sublabel="Route & emergency notifications" value={notifPrefs.safety} onValueChange={(v) => setNotifPrefs((s) => ({ ...s, safety: v }))} />
      </Sheet>

      {/* Emergency Contacts */}
      <Sheet visible={sheet === 'emergency'} title="Emergency Contacts" onClose={() => setSheet(null)}>
        {EMERGENCY_CONTACTS.map((c) => (
          <TouchableOpacity key={c.phone} style={[styles.paymentCard, styles.optionRowLast]} activeOpacity={0.7} onPress={() => showToast(`Calling ${c.name} \u2026`)}>
            <View style={styles.avatarWrapSm}>
              <MaterialIcon name="person" size={18} color={colors.onPrimary} />
            </View>
            <View style={styles.paymentTextWrap}>
              <Text style={styles.paymentTitle}>{c.name}</Text>
              <Text style={styles.paymentSub}>{c.relation} \u2022 {c.phone}</Text>
            </View>
            <MaterialIcon name="call" size={20} color={colors.primary} />
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.addBtn} activeOpacity={0.85} onPress={() => showToast('Add SOS contact coming soon')}>
          <MaterialIcon name="add" size={18} color={colors.primary} />
          <Text style={styles.addBtnText}>Add emergency contact</Text>
        </TouchableOpacity>
        <View style={styles.safetyNote}>
          <MaterialIcon name="warning" size={16} color={colors.accentRed} />
          <Text style={styles.safetyNoteText}>
            In an active ride, Shakti SOS shares your live location with these contacts.
          </Text>
        </View>
      </Sheet>

      {/* Help Center */}
      <Sheet visible={sheet === 'help'} title="Help Center" onClose={() => setSheet(null)}>
        {FAQS.map((f, i) => {
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
        <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.85} onPress={() => showToast('Support request sent')}>
          <Text style={styles.primaryBtnText}>Contact support</Text>
        </TouchableOpacity>
      </Sheet>

      {/* Preferences */}
      <Sheet visible={sheet === 'preferences'} title="Preferences" onClose={() => setSheet(null)}>
        <Text style={styles.fieldLabel}>Appearance</Text>
        <View style={{ marginTop: spacing.stackSm }}>
          <ToggleRow
            label={`Use dark theme`}
            sublabel={isDark ? 'Dark mode is on' : 'Switch to a darker look'}
            value={isDark}
            onValueChange={toggleTheme}
          />
        </View>
        <Text style={[styles.fieldLabel, { marginTop: spacing.stackLg }]}>App language</Text>
        <View style={styles.langRow}>
          {['English', 'தமிழ்', 'हिन्दी'].map((lang) => (
            <TouchableOpacity
              key={lang}
              style={[styles.langChip, prefs.language === lang && styles.langChipActive]}
              activeOpacity={0.85}
              onPress={() => setPrefs((s) => ({ ...s, language: lang }))}
            >
              <Text style={[styles.langChipText, prefs.language === lang && styles.langChipTextActive]}>{lang}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={{ marginTop: spacing.stackMd }}>
          <ToggleRow label="Send trip receipts on WhatsApp" sublabel="After every ride & delivery" value={prefs.receipts} onValueChange={(v) => setPrefs((s) => ({ ...s, receipts: v }))} />
          <ToggleRow label="Share live location during rides" sublabel="Only with your emergency contacts" value={prefs.shareLive} onValueChange={(v) => setPrefs((s) => ({ ...s, shareLive: v }))} />
        </View>
      </Sheet>

      {/* Logout confirm */}
      <Modal visible={logoutOpen} transparent animationType="fade" onRequestClose={() => setLogoutOpen(false)}>
        <View style={styles.alertBackdrop}>
          <View style={styles.alertCard}>
            <View style={styles.alertIconWrap}>
              <MaterialIcon name="logout" size={24} color={colors.accentRed} />
            </View>
            <Text style={styles.alertTitle}>Log out of Ematix?</Text>
            <Text style={styles.alertBody}>You can sign back in anytime. Your rides, deliveries and saved places stay on this device.</Text>
            <TouchableOpacity style={styles.alertCancel} activeOpacity={0.85} onPress={() => setLogoutOpen(false)}>
              <Text style={styles.alertCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.alertDanger}
              activeOpacity={0.85}
              onPress={() => {
                setLogoutOpen(false);
                router.replace('/login');
              }}
            >
              <Text style={styles.alertDangerText}>Log Out</Text>
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