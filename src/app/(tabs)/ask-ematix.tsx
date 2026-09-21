import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  LayoutAnimation,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../theme/ThemeProvider';
import { fonts, type, spacing, radius } from '../../theme/typography';
import SharedHeader from '../../components/SharedHeader';
import MaterialIcon, { MaterialIconName } from '../../components/MaterialIcon';
import TypingIndicator from '../../components/TypingIndicator';
import RealMap, { CHENNAI_REGION } from '../../components/RealMap';
import { TRAVEL_PROMPTS, VISIT_SPOTS, SAMPLE_ITINERARIES } from '../../data/mockData';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  text?: string;
  planId?: string;
};

const INITIAL_GREETING =
  "Hi Alex! I'm your travel & mobility concierge. Tell me how you want to spend your day \u2014 or tap a suggestion below and I'll build a plan you can book instantly.";

const COMPARE_REPLY =
  'For a city tour in Chennai, Autos win in traffic \u2014 ₹85\u2013₹135 per short leg. Cabs suit longer or AC rides at ₹240+. My tip: take Autos between nearby heritage spots and a Cab for the long beach-to-mall leg.';

const NEARBY_REPLY =
  'Good spots near T. Nagar today: Marina Beach (8.4 km), Kapaleeshwarar Temple (3.2 km), San Thome Basilica (5.1 km) and Phoenix Marketcity (6.8 km). Want me to plan the route and book vehicles for each stop?';

const FALLBACK_REPLY =
  "I can plan your day or weekend trip and arrange autos, cabs or parcel deliveries for each leg. Try one of the suggestions: plan a day trip in Chennai, or say \"weekend\" for a 2-day Pondicherry plan.";

let msgId = 0;
const nextId = () => `m${++msgId}`;

const PLAN_BY_ID = (id: string) => SAMPLE_ITINERARIES.find((p: any) => p.id === id);

function resolveReply(text: string): { text?: string; planId?: string } {
  const t = text.toLowerCase();
  if (t.includes('weekend') || t.includes('pondi')) {
    return {
      planId: 'pondicherryWeekend',
      text: "Here's your 2-day Pondicherry plan \u2014 4 stops, ~₹500 total across cab & auto legs. Book each leg right here as you go.",
    };
  }
  if (t.includes('food') || t.includes('dine') || t.includes('restaurant')) {
    return {
      text: "Chennai has amazing food! If you love South Indian, try Murugan Idli Shop in T. Nagar or Ratna Cafe in Triplicane. Shall I book an auto to Ratna Cafe right now for ₹85?",
    };
  }
  if (t.includes('chennai') || t.includes('day trip') || t.includes('plan') || t.includes('trip')) {
    return {
      planId: 'chennaiDay',
      text: "Here's your Chennai Heritage Day Tour \u2014 4 stops, ~₹551 across auto & cab legs. I've plotted the route for you below. Tap Book on any stop to start that ride.",
    };
  }
  if (t.includes('near')) return { text: NEARBY_REPLY };
  if (t.includes('auto') || t.includes('cab') || t.includes('compare')) return { text: COMPARE_REPLY };
  return { text: FALLBACK_REPLY };
}

function PromptChips({ onPress }: { onPress: (p: any) => void }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return (
    <View style={styles.promptWrap}>
      <Text style={styles.promptLabel}>Suggestions</Text>
      <View style={styles.promptChips}>
        {TRAVEL_PROMPTS.map((p) => (
          <TouchableOpacity key={p.id} style={styles.promptChip} activeOpacity={0.8} onPress={() => onPress(p)}>
            <MaterialIcon name={p.icon as MaterialIconName} size={16} color={colors.primary} />
            <Text style={styles.promptChipText}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function TypingBubble() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return (
    <View style={styles.row}>
      <View style={styles.assistantAvatar}>
        <MaterialIcon name="auto-awesome" size={14} color={colors.onPrimary} />
      </View>
      <View style={[styles.bubble, styles.assistantBubble, { padding: 0, paddingLeft: 8 }]}>
        <TypingIndicator />
      </View>
    </View>
  );
}

function PlanCard({
  plan,
  activeDay,
  setActiveDay,
}: {
  plan: any;
  activeDay: number;
  setActiveDay: (i: number) => void;
}) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  const day = plan.days[activeDay];

  return (
    <View style={styles.planCard}>
      <View style={styles.planHeader}>
        <View style={styles.planIconWrap}>
          <MaterialIcon name="route" size={20} color={colors.onPrimary} />
        </View>
        <View style={styles.planHeaderText}>
          <Text style={styles.planTitle}>{plan.title}</Text>
          <Text style={styles.planMeta}>
            {plan.totalStops} stops {'\u2022'} ~₹{plan.totalFare} est. total
          </Text>
        </View>
      </View>

      {plan.days.length > 1 && (
        <View style={styles.dayTabs}>
          {plan.days.map((d: any, i: number) => (
            <TouchableOpacity
              key={d.label}
              style={[styles.dayTab, activeDay === i && styles.dayTabActive]}
              activeOpacity={0.85}
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setActiveDay(i);
              }}
            >
              <Text style={[styles.dayTabText, activeDay === i && styles.dayTabTextActive]}>{d.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Mini Map Route View */}
      <View style={styles.miniMapContainer}>
        <RealMap interactive={false} style={styles.miniMap}>
          {day.stops.map((stop: any, idx: number) => {
            const spot = VISIT_SPOTS.find((s: any) => s.id === stop.spotId);
            if (!spot) return null;
            // Simulated absolute positions on map for visuals
            const top = `${30 + idx * 15}%` as any;
            const left = `${20 + idx * 12}%` as any;
            return (
              <View key={'map'+stop.id} style={[styles.mapPinWrap, { top, left }]}>
                <View style={styles.mapPinIcon}>
                  <MaterialIcon name={spot.icon as MaterialIconName} size={12} color="#FFF" />
                </View>
                {idx < day.stops.length - 1 && (
                  <View style={styles.mapRouteLine} />
                )}
              </View>
            );
          })}
        </RealMap>
      </View>

      <View style={styles.stopList}>
        {day.stops.map((stop: any, idx: number) => {
          const spot = VISIT_SPOTS.find((s: any) => s.id === stop.spotId);
          if (!spot) return null;
          const bookRoute = stop.action === 'ride' ? '/destination-search' : '/package-details';
          return (
            <View key={stop.id} style={styles.stopRow}>
              <View style={styles.stopTimeWrap}>
                <Text style={styles.stopTime}>{stop.time}</Text>
                {idx < day.stops.length - 1 && <View style={styles.timelineLine} />}
              </View>
              <View style={styles.stopIconWrap}>
                <MaterialIcon name={spot.icon as MaterialIconName} size={18} color={colors.primary} />
              </View>
              <View style={styles.stopInfo}>
                <Text style={styles.stopName}>{spot.name}</Text>
                <Text style={styles.stopArea} numberOfLines={1}>
                  {spot.area} {'\u2022'} {spot.duration}
                </Text>
                <View style={styles.vehiclePill}>
                  <MaterialIcon name="directions-subway" size={12} color={colors.onSurfaceVariant} />
                  <Text style={styles.vehicleText}>
                    {stop.vehicle} {'\u2022'} ₹{stop.fare}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.bookBtn}
                activeOpacity={0.85}
                onPress={() => router.push(bookRoute as never)}
              >
                <Text style={styles.bookBtnText}>Book</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      <View style={styles.planFooter}>
        <View style={styles.planFooterLeft}>
          <MaterialIcon name="wb-sunny" size={14} color={colors.textMuted} />
          <Text style={styles.planFooterText}>Optimal route for today</Text>
        </View>
        <TouchableOpacity style={styles.saveBtn} activeOpacity={0.85} onPress={() => {}}>
          <MaterialIcon name="bookmark-outline" size={14} color={colors.primary} />
          <Text style={styles.saveBtnText}>Save plan</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function AskEmatixScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const [messages, setMessages] = useState<Message[]>([
    { id: 'greet', role: 'assistant', text: INITIAL_GREETING },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [inputText, setInputText] = useState('');
  const [activeDayByPlan, setActiveDayByPlan] = useState<Record<string, number>>({});
  const scrollRef = useRef<ScrollView>(null);

  const pushUser = (text: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setMessages((m) => [...m, { id: nextId(), role: 'user', text }]);
  };

  const replyAfterDelay = (text?: string, planId?: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsTyping(true);
    setTimeout(() => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setMessages((m) => [...m, { id: nextId(), role: 'assistant', text, planId }]);
      setIsTyping(false);
    }, 1300);
  };

  const handlePrompt = (p: any) => {
    pushUser(p.label);
    replyAfterDelay(undefined, p.planId);
  };

  const handleSend = () => {
    const text = inputText.trim();
    if (!text) return;
    pushUser(text);
    setInputText('');
    const reply = resolveReply(text);
    replyAfterDelay(reply.text, reply.planId);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <SharedHeader currentScreen="ask-ematix" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.chatContent}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          <View style={styles.heroCard}>
            <View style={styles.heroIconWrap}>
              <MaterialIcon name="auto-awesome" size={22} color={colors.primary} />
            </View>
            <View style={styles.heroTextWrap}>
              <Text style={styles.heroTitle}>Travel & Mobility Concierge</Text>
              <Text style={styles.heroSubtitle}>Plans your day or weekend, then books rides & deliveries for each stop.</Text>
            </View>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>AI Agent</Text>
            </View>
          </View>

          {messages.map((msg) => (
            <View key={msg.id} style={styles.row}>
              {msg.role === 'assistant' && (
                <View style={styles.assistantAvatar}>
                  <MaterialIcon name="auto-awesome" size={14} color={colors.onPrimary} />
                </View>
              )}
              <View
                style={[
                  styles.bubble,
                  msg.role === 'assistant' ? styles.assistantBubble : styles.userBubble,
                ]}
              >
                {msg.text ? <Text style={styles.messageText}>{msg.text}</Text> : null}
                {msg.planId ? (
                  <PlanCard
                    plan={PLAN_BY_ID(msg.planId)}
                    activeDay={activeDayByPlan[msg.planId] ?? 0}
                    setActiveDay={(i) =>
                      setActiveDayByPlan((d) => ({ ...d, [msg.planId as string]: i }))
                    }
                  />
                ) : null}
              </View>
            </View>
          ))}

          {isTyping && <TypingBubble />}
          {messages.length === 1 && <PromptChips onPress={handlePrompt} />}
        </ScrollView>

        <View style={styles.composerBar}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Ask Ematix to plan something..."
              placeholderTextColor={colors.textMuted}
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={handleSend}
              returnKeyType="send"
            />
            <TouchableOpacity style={styles.micBtn} activeOpacity={0.8} onPress={() => {}}>
              <MaterialIcon name="mic" size={20} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
              activeOpacity={0.85}
              disabled={!inputText.trim()}
              onPress={handleSend}
            >
              <MaterialIcon name="arrow-upward" size={18} color={colors.onPrimary} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface },
  flex: { flex: 1 },
  chatContent: {
    padding: spacing.marginMobile,
    paddingTop: spacing.stackLg,
    paddingBottom: spacing.stackXl,
    gap: spacing.stackMd,
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.stackMd,
    backgroundColor: colors.lightBlueTint,
    borderRadius: radius.xl,
    padding: spacing.cardPadding,
  },
  heroIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    backgroundColor: colors.onPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTextWrap: { flex: 1, minWidth: 0 },
  heroTitle: { ...type.labelLg, color: colors.onSurface },
  heroSubtitle: { ...type.bodySm, color: colors.onSurfaceVariant, marginTop: 2 },
  heroBadge: {
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  heroBadgeText: { ...type.labelSm, color: colors.onPrimary, fontSize: 11 },
  row: {
    flexDirection: 'row',
    gap: spacing.stackSm,
    alignItems: 'flex-start',
  },
  assistantAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  bubble: {
    flex: 1,
    borderRadius: radius.lg,
    padding: spacing.stackMd,
  },
  assistantBubble: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
  },
  userBubble: {
    backgroundColor: colors.primary,
    alignSelf: 'flex-end',
    borderTopRightRadius: radius.sm,
  },
  messageText: {
    ...type.bodyMd,
    color: colors.onSurface,
    lineHeight: 20,
  },
  typingDots: {
    flexDirection: 'row',
    gap: 5,
    paddingVertical: 6,
  },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  promptWrap: { marginTop: spacing.stackSm, flexDirection: 'column', gap: spacing.stackSm },
  promptLabel: { ...type.labelSm, color: colors.textMuted },
  promptChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  promptChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    paddingHorizontal: spacing.stackMd,
    paddingVertical: spacing.stackSm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  promptChipText: { ...type.labelMd, color: colors.primary },
  planCard: {
    marginTop: spacing.stackMd,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    overflow: 'hidden',
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.stackSm,
    padding: spacing.cardPadding,
    backgroundColor: colors.lightBlueTint,
  },
  planIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  planHeaderText: { flex: 1, minWidth: 0 },
  planTitle: { ...type.labelLg, color: colors.onSurface },
  planMeta: { ...type.bodySm, color: colors.onSurfaceVariant, marginTop: 2 },
  dayTabs: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainer,
    margin: spacing.stackMd,
    borderRadius: radius.lg,
    padding: spacing.stackXs,
  },
  dayTab: { flex: 1, paddingVertical: spacing.stackSm, alignItems: 'center', borderRadius: radius.md },
  dayTabActive: {
    backgroundColor: colors.surfaceContainerLowest,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  dayTabText: { ...type.labelSm, color: colors.textMuted },
  dayTabTextActive: { color: colors.primary, fontFamily: fonts.bold },
  stopList: { paddingHorizontal: spacing.cardPadding, gap: 0 },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.stackSm,
    paddingBottom: spacing.stackMd,
  },
  stopTimeWrap: { width: 52, alignItems: 'flex-start' },
  stopTime: { ...type.labelSm, color: colors.onSurfaceVariant, fontSize: 11, marginTop: 4 },
  timelineLine: {
    width: 1,
    flex: 1,
    backgroundColor: colors.surfaceContainerHigh,
    marginTop: 4,
    marginLeft: 6,
    minHeight: 18,
  },
  stopIconWrap: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopInfo: { flex: 1, minWidth: 0 },
  stopName: { ...type.labelMd, color: colors.onSurface },
  stopArea: { ...type.bodySm, color: colors.textMuted, marginTop: 2 },
  vehiclePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: spacing.stackSm,
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  vehicleText: { ...type.labelSm, fontSize: 11, color: colors.onSurfaceVariant },
  bookBtn: {
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: spacing.stackMd,
    paddingVertical: spacing.stackSm,
    borderRadius: radius.md,
    marginTop: spacing.stackXs,
  },
  bookBtnText: { ...type.labelSm, color: colors.onPrimary, fontSize: 12 },
  planFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainerHigh,
    padding: spacing.cardPadding,
    paddingTop: spacing.stackMd,
    paddingBottom: spacing.stackMd,
  },
  planFooterLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  planFooterText: { ...type.labelSm, color: colors.textMuted, fontSize: 11 },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.lightBlueTint,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  saveBtnText: { ...type.labelSm, color: colors.primary, fontSize: 11 },
  composerBar: {
    paddingHorizontal: spacing.marginMobile,
    paddingTop: spacing.stackSm,
    paddingBottom: 88,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainerHigh,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.stackSm,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    paddingLeft: spacing.stackMd,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  input: { flex: 1, ...type.bodyMd, color: colors.onSurface, padding: 0 },
  micBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    backgroundColor: colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  miniMapContainer: {
    height: 120,
    width: '100%',
    backgroundColor: colors.surfaceContainer,
  },
  miniMap: {
    width: '100%',
    height: '100%',
  },
  mapPinWrap: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 10,
  },
  mapPinIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  mapRouteLine: {
    position: 'absolute',
    top: 10,
    left: 20,
    width: 40,
    height: 2,
    backgroundColor: colors.primary,
    opacity: 0.5,
    transform: [{ rotate: '30deg' }],
    transformOrigin: 'top left',
  }
});