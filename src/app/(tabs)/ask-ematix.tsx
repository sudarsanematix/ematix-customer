import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  LayoutAnimation,
  Keyboard,
} from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { type, spacing, radius } from '../../theme/typography';
import SharedHeader from '../../components/SharedHeader';
import MaterialIcon, { MaterialIconName } from '../../components/MaterialIcon';
import TypingIndicator from '../../components/TypingIndicator';
import RichMessage, { Block } from '../../components/RichMessage';
import PlanCard, { Plan } from '../../components/PlanCard';
import { TRAVEL_PROMPTS, SAMPLE_ITINERARIES } from '../../data/mockData';
import { useAuth } from '../../context/AuthContext';
import { authedFetch } from '../../utils/api';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  text?: string;
  blocks?: Block[];
  plan?: Plan;
};

const greetingFor = (name?: string | null) => {
  const firstName = name?.trim().split(/\s+/)[0] || 'there';
  return `Hi ${firstName}! I'm your travel & mobility concierge. Tell me how you want to spend your day \u2014 or tap a suggestion below and I'll build a plan you can book instantly.`;
};

const FALLBACK_REPLY =
  "I can plan your day or weekend trip and arrange autos, cabs or parcel deliveries for each leg. Try one of the suggestions: plan a day trip in Chennai, or say \"weekend\" for a 2-day Pondicherry plan.";

const OFFLINE_REPLY =
  "I'm having trouble reaching my assistant right now. Please check your connection and try again in a moment.";

let msgId = 0;
const nextId = () => `m${++msgId}`;

const PLAN_BY_ID = (id: string) => SAMPLE_ITINERARIES.find((p: any) => p.id === id);

/**
 * Maps a message/quick-prompt to a locally-known itinerary card. The prose
 * itself now comes from the AI; this only decides when to render a PlanCard.
 */
function planIdForText(text: string): string | undefined {
  const t = text.toLowerCase();
  if (t.includes('weekend') || t.includes('pondi')) return 'pondicherryWeekend';
  if (
    t.includes('chennai') ||
    t.includes('day trip') ||
    t.includes('plan') ||
    t.includes('trip')
  ) {
    return 'chennaiDay';
  }
  return undefined;
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

export default function AskEmatixScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(colors);
  const { user, token } = useAuth();

  const [messages, setMessages] = useState<Message[]>([
    { id: 'greet', role: 'assistant', text: greetingFor(null) },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [inputText, setInputText] = useState('');
  const [activeDayByPlan, setActiveDayByPlan] = useState<Record<string, number>>({});
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setIsKeyboardOpen(true);
        setTimeout(() => {
          scrollRef.current?.scrollToEnd({ animated: true });
        }, 80);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setIsKeyboardOpen(false);
      }
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const sendMessage = async (rawText: string, explicitPlanId?: string) => {
    const text = rawText.trim();
    if (!text || isTyping) return;

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const userMsg: Message = { id: nextId(), role: 'user', text };
    setMessages((m) => [...m, userMsg]);
    setInputText('');
    setIsTyping(true);

    const planId = explicitPlanId ?? planIdForText(text);
    const history = [...messages, userMsg]
      .filter((m) => m.text)
      .map((m) => ({ role: m.role, text: m.text }));

    try {
      const data = await authedFetch('/api/assistant/chat', token, {
        method: 'POST',
        body: { messages: history },
      });
      const reply = String(data?.reply || '').trim() || FALLBACK_REPLY;
      const blocks = Array.isArray(data?.blocks) ? (data.blocks as Block[]) : undefined;
      const plan = (data?.plan as Plan | null) || undefined;
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setMessages((m) => [...m, { id: nextId(), role: 'assistant', text: reply, blocks, plan }]);
    } catch (error) {
      console.warn('[AskEmatix] assistant request failed', error);
      const offlinePlan = (planId ? PLAN_BY_ID(planId) : undefined) as Plan | undefined;
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setMessages((m) => [...m, { id: nextId(), role: 'assistant', text: OFFLINE_REPLY, plan: offlinePlan }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handlePrompt = (p: any) => sendMessage(p.label, p.planId);
  const handleSend = () => sendMessage(inputText);

  // When keyboard is open, Android/iOS moves the view up above keyboard.
  // We only need a clean 8-12px padding above keyboard.
  // When keyboard is closed, we need 88px so it sits right above the bottom tabs bar.
  const composerPaddingBottom = isKeyboardOpen
    ? (Platform.OS === 'ios' ? Math.max(insets.bottom, 10) : 8)
    : 88;
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <SharedHeader currentScreen="ask-ematix" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.chatContent}
          onContentSizeChange={() =>
            scrollRef.current?.scrollToEnd({ animated: true })
          }
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
                {msg.id === 'greet' || msg.text || msg.blocks?.length ? (
                  <RichMessage
                    blocks={msg.id === 'greet' ? undefined : msg.blocks}
                    text={msg.id === 'greet' ? greetingFor(user?.name) : msg.text}
                    textColor={msg.role === 'user' ? colors.onPrimary : colors.onSurface}
                  />
                ) : null}
                {msg.plan ? (
                  <PlanCard
                    plan={msg.plan}
                    activeDay={activeDayByPlan[msg.id] ?? 0}
                    setActiveDay={(i) =>
                      setActiveDayByPlan((d) => ({ ...d, [msg.id]: i }))
                    }
                  />
                ) : null}
              </View>
            </View>
          ))}

          {isTyping && <TypingBubble />}
          {messages.length === 1 && <PromptChips onPress={handlePrompt} />}
        </ScrollView>

        <View style={[styles.composerBar, { paddingBottom: composerPaddingBottom }]}>
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
            <TouchableOpacity style={styles.micBtn} activeOpacity={0.8} onPress={() => { }}>
              <MaterialIcon name="mic" size={20} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sendBtn, (!inputText.trim() || isTyping) && styles.sendBtnDisabled]}
              activeOpacity={0.85}
              disabled={!inputText.trim() || isTyping}
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
    borderTopRightRadius: radius.sm,
    borderRadius: 14,
    flex: 0,
    maxWidth: '80%',
    marginLeft: 'auto',
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
  composerBar: {
    flexShrink: 0,
    paddingHorizontal: spacing.marginMobile,
    paddingTop: spacing.stackSm,
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
});