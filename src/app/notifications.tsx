import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import SharedHeader from '../components/SharedHeader';
import MaterialIcon, { MaterialIconName } from '../components/MaterialIcon';
import { useTheme } from '../theme/ThemeProvider';
import { fonts, type, spacing, radius } from '../theme/typography';
import { NOTIFICATIONS } from '../data/mockData';

const TYPE_META: Record<string, { icon: MaterialIconName }> = {
  ride: { icon: 'local-taxi' },
  delivery: { icon: 'inventory-2' },
  offer: { icon: 'local-offer' },
  safety: { icon: 'shield' },
};

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const [items, setItems] = useState(NOTIFICATIONS);
  const unreadCount = items.filter((n) => !n.read).length;

  const markAllRead = () => setItems((prev) => prev.map((n) => ({ ...n, read: true })));

  const markRead = (id: string) =>
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));

  return (
    <SafeAreaView style={styles.safeArea}>
      <SharedHeader currentScreen="notifications" title="Notifications" />

      <View style={styles.headerRow}>
        <View style={styles.countRow}>
          <Text style={styles.counterValue}>{unreadCount}</Text>
          <Text style={styles.counterLabel}>{unreadCount === 1 ? 'new update' : 'new updates'}</Text>
        </View>
        <TouchableOpacity
          style={[styles.markAll, unreadCount === 0 && styles.markAllDisabled]}
          activeOpacity={0.7}
          disabled={unreadCount === 0}
          onPress={markAllRead}
        >
          <MaterialIcon name="done-all" size={18} color={unreadCount === 0 ? colors.outlineVariant : colors.primary} />
          <Text style={[styles.markAllText, unreadCount === 0 && styles.markAllTextDisabled]}>Mark all read</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {items.map((n) => {
          const meta = TYPE_META[n.type] || TYPE_META.ride;
          const isErrorStyle = n.type === 'offer';
          return (
            <TouchableOpacity
              key={n.id}
              style={[styles.card, !n.read && styles.cardUnread]}
              activeOpacity={0.8}
              onPress={() => markRead(n.id)}
            >
              {!n.read && <View style={styles.unreadDot} />}
              <View style={[styles.iconWrap, { backgroundColor: isErrorStyle ? '#FFEAEA' : colors.lightBlueTint }]}>
                <MaterialIcon
                  name={meta.icon}
                  size={20}
                  color={isErrorStyle ? colors.accentRed : colors.primary}
                />
              </View>
              <View style={styles.textWrap}>
                <Text style={[styles.title, !n.read && styles.titleUnread]} numberOfLines={2}>
                  {n.title}
                </Text>
                <Text style={styles.message} numberOfLines={3}>
                  {n.message}
                </Text>
                <Text style={styles.time}>{n.time}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.marginMobile,
    marginBottom: spacing.stackLg,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.stackXs,
  },
  counterValue: {
    ...type.headlineMd,
    color: colors.onSurface,
  },
  counterLabel: {
    ...type.bodyMd,
    color: colors.textMuted,
  },
  markAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.stackXs,
    paddingVertical: spacing.stackSm,
    paddingHorizontal: spacing.stackMd,
    borderRadius: radius.full,
    backgroundColor: colors.lightBlueTint,
  },
  markAllDisabled: {
    backgroundColor: colors.surfaceGray,
  },
  markAllText: {
    ...type.labelMd,
    color: colors.primary,
  },
  markAllTextDisabled: {
    color: colors.outlineVariant,
  },
  list: {
    paddingHorizontal: spacing.marginMobile,
    paddingBottom: 100,
    gap: spacing.stackSm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.stackMd,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
    borderRadius: radius.xl,
    padding: spacing.cardPadding,
    position: 'relative',
  },
  cardUnread: {
    borderColor: colors.primaryContainer,
    backgroundColor: colors.surfaceContainerLowest,
  },
  unreadDot: {
    position: 'absolute',
    top: spacing.stackSm,
    right: spacing.stackSm,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accentRed,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    ...type.labelMd,
    color: colors.onSurface,
  },
  titleUnread: {
    fontFamily: fonts.bold,
  },
  message: {
    ...type.bodySm,
    color: colors.textMuted,
    marginTop: spacing.stackXs,
    lineHeight: 18,
  },
  time: {
    ...type.labelSm,
    color: colors.outlineVariant,
    marginTop: spacing.stackSm,
  },
});