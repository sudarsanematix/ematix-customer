import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../theme/ThemeProvider';
import { fonts, type, spacing, radius } from '../theme/typography';
import MaterialIcon from '../components/MaterialIcon';

const TRANSACTIONS = [
  { id: '1', title: 'Added to Ematix Pay', date: 'Today, 10:45 AM', amount: '+₹500', type: 'credit' },
  { id: '2', title: 'Auto Ride • T. Nagar', date: 'Yesterday, 11:30 PM', amount: '-₹135', type: 'debit' },
  { id: '3', title: 'Package • Guindy', date: 'Sep 17, 8:30 PM', amount: '-₹240', type: 'debit' },
  { id: '4', title: 'Cashback Bonus', date: 'Sep 15, 10:00 AM', amount: '+₹50', type: 'credit' },
];

export default function WalletScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const [addMoneyModalVisible, setAddMoneyModalVisible] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const [amount, setAmount] = useState('500');

  const handleAddMoney = () => {
    setAddMoneyModalVisible(false);
    setTimeout(() => {
      setSuccessVisible(true);
      setTimeout(() => {
        setSuccessVisible(false);
      }, 2500);
    }, 300);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} accessibilityLabel="Go back" accessibilityRole="button" hitSlop={8}>
          <MaterialIcon name="arrow-back" size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ematix Pay</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Current Balance</Text>
          <Text style={styles.balanceAmount}>₹ 1,250.00</Text>
          <View style={styles.balanceMetaRow}>
            <View style={styles.metaBadge}>
              <MaterialIcon name="shield" size={16} color={colors.primaryContainer} />
              <Text style={styles.metaText}>Secure & Instant payments</Text>
            </View>
          </View>
        </View>

        {/* Payment Methods */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Methods</Text>
          <TouchableOpacity style={styles.payoutCard} activeOpacity={0.8}>
            <View style={styles.payoutIconWrap}>
              <MaterialIcon name="credit-card" size={24} color={colors.primary} />
            </View>
            <View style={styles.payoutInfo}>
              <Text style={styles.payoutName}>HDFC Credit Card</Text>
              <Text style={styles.payoutAccount}>•••• •••• 1234</Text>
            </View>
            <MaterialIcon name="chevron-right" size={24} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.payoutCard} activeOpacity={0.8}>
            <View style={styles.payoutIconWrapUPI}>
              <MaterialIcon name="qr-code" size={24} color={colors.primary} />
            </View>
            <View style={styles.payoutInfo}>
              <Text style={styles.payoutName}>Google Pay UPI</Text>
              <Text style={styles.payoutAccount}>user@okaxis</Text>
            </View>
            <MaterialIcon name="chevron-right" size={24} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.addPayoutBtn}>
            <MaterialIcon name="add" size={20} color={colors.primary} />
            <Text style={styles.addPayoutText}>Add Payment Method</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Transactions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          <View style={styles.transactionsList}>
            {TRANSACTIONS.map((txn) => (
              <View key={txn.id} style={styles.txnItem}>
                <View style={styles.txnLeft}>
                  <View style={[
                    styles.txnIconWrap, 
                    { backgroundColor: txn.type === 'credit' ? colors.lightBlueTint : colors.surfaceContainerHigh }
                  ]}>
                    <MaterialIcon 
                      name={txn.type === 'credit' ? "account-balance-wallet" : "local-taxi"} 
                      size={20} 
                      color={txn.type === 'credit' ? colors.primary : colors.textMuted} 
                    />
                  </View>
                  <View style={styles.txnInfo}>
                    <Text style={styles.txnTitle}>{txn.title}</Text>
                    <Text style={styles.txnDate}>{txn.date}</Text>
                  </View>
                </View>
                <Text style={[
                  styles.txnAmount, 
                  { color: txn.type === 'credit' ? '#10B981' : colors.onSurface }
                ]}>
                  {txn.amount}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Floating Add Money Button */}
      <View style={styles.floatingActionRow}>
        <TouchableOpacity 
          style={styles.withdrawBtn}
          activeOpacity={0.9}
          onPress={() => setAddMoneyModalVisible(true)}
        >
          <MaterialIcon name="add-circle" size={24} color={colors.onPrimary} />
          <Text style={styles.withdrawBtnText}>Add Money</Text>
        </TouchableOpacity>
      </View>

      {/* Add Money Modal */}
      <Modal visible={addMoneyModalVisible} transparent animationType="slide" onRequestClose={() => setAddMoneyModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.dragHandle} />
            <Text style={styles.modalTitle}>Add Money to Wallet</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.currencySymbol}>₹</Text>
              <TextInput
                style={styles.amountInput}
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
                autoFocus
                maxLength={5}
              />
            </View>

            <View style={styles.quickAmounts}>
              {['200', '500', '1000'].map(val => (
                <TouchableOpacity 
                  key={val} 
                  style={styles.quickBtn}
                  onPress={() => setAmount(val)}
                >
                  <Text style={styles.quickBtnText}>+₹{val}</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <View style={styles.previewDest}>
              <Text style={styles.destLabel}>Paying via</Text>
              <View style={styles.destRow}>
                <MaterialIcon name="credit-card" size={20} color={colors.primary} />
                <Text style={styles.destText}>HDFC Credit Card (•••• 1234)</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.confirmBtn} onPress={handleAddMoney}>
              <Text style={styles.confirmBtnText}>Proceed to Pay ₹{amount || '0'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setAddMoneyModalVisible(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal visible={successVisible} transparent animationType="fade" onRequestClose={() => setSuccessVisible(false)}>
        <View style={styles.modalOverlayCenter}>
          <View style={styles.successCard}>
            <View style={styles.successIconWrap}>
              <MaterialIcon name="check" size={40} color="#FFF" />
            </View>
            <Text style={styles.successTitle}>Payment Successful!</Text>
            <Text style={styles.successMsg}>₹{amount} has been added to your Ematix Pay wallet.</Text>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.marginMobile,
    paddingVertical: 16,
    backgroundColor: colors.surface,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainerLowest,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    ...type.headlineSm,
    color: colors.onSurface,
  },
  headerSpacer: { width: 40 },
  scrollContent: {
    padding: spacing.marginMobile,
    paddingBottom: 100, // space for floating btn
    gap: spacing.stackXl,
  },
  balanceCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: 24,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  balanceLabel: {
    ...type.labelMd,
    color: colors.onPrimaryContainer,
    marginBottom: 8,
  },
  balanceAmount: {
    ...type.headlineXl,
    fontSize: 40,
    color: '#FFF',
    fontFamily: fonts.extrabold,
    marginBottom: 16,
  },
  balanceMetaRow: {
    flexDirection: 'row',
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    gap: 4,
  },
  metaText: {
    ...type.labelSm,
    color: '#FFF',
  },
  section: {
    gap: spacing.stackLg,
  },
  sectionTitle: {
    ...type.headlineSm,
    color: colors.onSurface,
  },
  payoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    padding: 16,
    borderRadius: radius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  payoutIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.lightBlueTint,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  payoutIconWrapUPI: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  payoutInfo: {
    flex: 1,
  },
  payoutName: {
    ...type.labelLg,
    color: colors.onSurface,
  },
  payoutAccount: {
    ...type.bodyMd,
    color: colors.textMuted,
  },
  addPayoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  addPayoutText: {
    ...type.labelMd,
    color: colors.primary,
  },
  transactionsList: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: 16,
    gap: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  txnItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  txnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  txnIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txnInfo: {
    gap: 2,
  },
  txnTitle: {
    ...type.labelMd,
    color: colors.onSurface,
  },
  txnDate: {
    ...type.bodySm,
    color: colors.textMuted,
  },
  txnAmount: {
    ...type.labelLg,
  },
  floatingActionRow: {
    position: 'absolute',
    bottom: 24,
    left: spacing.marginMobile,
    right: spacing.marginMobile,
  },
  withdrawBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 56,
    borderRadius: 28,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  withdrawBtnText: {
    ...type.headlineSm,
    color: '#FFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.marginMobile,
    paddingBottom: 40,
    alignItems: 'center',
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.outlineVariant,
    marginBottom: 24,
  },
  modalTitle: {
    ...type.headlineSm,
    color: colors.onSurface,
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
    paddingBottom: 8,
    marginBottom: 24,
    width: '60%',
  },
  currencySymbol: {
    ...type.headlineXl,
    color: colors.onSurface,
    marginRight: 8,
  },
  amountInput: {
    ...type.headlineXl,
    color: colors.primary,
    fontFamily: fonts.extrabold,
    minWidth: 100,
    textAlign: 'left',
  },
  quickAmounts: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  quickBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.lightBlueTint,
  },
  quickBtnText: {
    ...type.labelMd,
    color: colors.primary,
  },
  previewDest: {
    width: '100%',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 32,
  },
  destLabel: {
    ...type.labelSm,
    color: colors.textMuted,
    marginBottom: 8,
  },
  destRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  destText: {
    ...type.labelMd,
    color: colors.onSurface,
  },
  confirmBtn: {
    width: '100%',
    backgroundColor: colors.primary,
    height: 56,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  confirmBtnText: {
    ...type.labelLg,
    color: '#FFF',
  },
  cancelBtn: {
    width: '100%',
    height: 56,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    ...type.labelLg,
    color: colors.textMuted,
  },
  modalOverlayCenter: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  successCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 32,
    alignItems: 'center',
    width: '100%',
  },
  successIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#10B981', // green success
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  successTitle: {
    ...type.headlineMd,
    color: colors.onSurface,
    marginBottom: 8,
  },
  successMsg: {
    ...type.bodyMd,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
