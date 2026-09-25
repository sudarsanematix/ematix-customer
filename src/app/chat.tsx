import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import SharedHeader from '../components/SharedHeader';
import MaterialIcon from '../components/MaterialIcon';
import { useTheme } from '../theme/ThemeProvider';
import { fonts, type, spacing } from '../theme/typography';
import { socketService } from '../utils/socket';
import { useAuth } from '../context/AuthContext';
import { clearUnread } from '../utils/unread';

type Message = {
  id: string;
  sender: 'customer' | 'partner';
  text: string;
  timestamp: string;
};

export default function CustomerChatScreen() {
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, isDark);
  const router = useRouter();
  const { user } = useAuth();
  const { rideId } = useLocalSearchParams<{ rideId: string }>();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'msg_sys_1',
      sender: 'partner',
      text: 'Hi there! I have accepted your request and am on my way.',
      timestamp: new Date().toISOString()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    socketService.connect();
    clearUnread(rideId);

    if (rideId) {
      socketService.emit('join_ride', { rideId, role: 'customer', userId: user?.id });
    }

    const handleReceiveMessage = (data: any) => {
      console.log('[CustomerChat] Received message:', data);
      if (data.rideId === rideId && data.sender === 'partner') {
        console.log('[CustomerChat] Message matched rideId, appending to state.');
        setMessages((prev) => {
          // Prevent duplicate optimistic updates if the server echoes back our own message
          if (prev.some(m => m.id === data.id)) return prev;
          return [...prev, data];
        });
      } else {
        console.log('[CustomerChat] Message ignored. Expected rideId:', rideId, 'Got:', data.rideId);
      }
    };

    const handleChatHistory = (history: any[]) => {
      console.log('[CustomerChat] Received chat history:', history);
      const formattedHistory = history.map(msg => ({
        id: msg.id,
        sender: msg.sender,
        text: msg.text,
        timestamp: msg.timestamp
      }));
      setMessages(prev => {
        const sysMsg = prev.filter(m => m.id.startsWith('msg_sys'));
        return [...sysMsg, ...formattedHistory];
      });
    };

    const handleRideDetails = (data: any) => {
      if (data && data.id === rideId && Array.isArray(data.messages)) {
        handleChatHistory(data.messages);
      }
    };

    socketService.on('receive_message', handleReceiveMessage);
    socketService.on('chat_history', handleChatHistory);
    socketService.on('ride_details', handleRideDetails);

    return () => {
      socketService.off('receive_message', handleReceiveMessage);
      socketService.off('chat_history', handleChatHistory);
      socketService.off('ride_details', handleRideDetails);
    };
  }, [rideId, user?.id]);

  const sendMessage = () => {
    if (!inputText.trim()) return;

    const newMsg: Message = {
      id: `msg_cust_${Date.now()}`,
      sender: 'customer',
      text: inputText.trim(),
      timestamp: new Date().toISOString()
    };

    // Optimistically update UI
    setMessages((prev) => [...prev, newMsg]);

    console.log('[CustomerChat] Emitting send_message to server:', { rideId, sender: 'customer', text: inputText.trim() });
    socketService.emit('send_message', {
      rideId,
      sender: 'customer',
      text: inputText.trim()
    });

    setInputText('');
  };

  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <SharedHeader currentScreen="chat" title="Chat with Partner" />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.chatArea}
          contentContainerStyle={styles.chatContent}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((msg) => {
            const isMe = msg.sender === 'customer';
            return (
              <View key={msg.id} style={[styles.messageBubbleWrap, isMe ? styles.messageWrapMe : styles.messageWrapThem]}>
                <View style={[styles.messageBubble, isMe ? styles.messageBubbleMe : styles.messageBubbleThem]}>
                  <Text style={[styles.messageText, isMe ? styles.messageTextMe : styles.messageTextThem]}>
                    {msg.text}
                  </Text>
                  <Text style={[styles.messageTime, isMe ? styles.messageTimeMe : styles.messageTimeThem]}>
                    {formatTime(msg.timestamp)}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>

        <View style={styles.inputArea}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor={colors.textMuted}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={200}
          />
          <TouchableOpacity 
            style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
            onPress={sendMessage}
            disabled={!inputText.trim()}
          >
            <MaterialIcon name="send" size={20} color={colors.onPrimary} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  keyboardView: {
    flex: 1,
  },
  chatArea: {
    flex: 1,
    backgroundColor: isDark ? colors.surfaceContainerLowest : colors.surfaceGray,
  },
  chatContent: {
    padding: spacing.marginMobile,
    paddingBottom: spacing.stackXl,
  },
  messageBubbleWrap: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: spacing.stackXs,
  },
  messageWrapMe: {
    justifyContent: 'flex-end',
  },
  messageWrapThem: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  messageBubbleMe: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  messageBubbleThem: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    ...type.bodyLg,
  },
  messageTextMe: {
    color: colors.onPrimary,
  },
  messageTextThem: {
    color: colors.onSurface,
  },
  messageTime: {
    ...type.labelSm,
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  messageTimeMe: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  messageTimeThem: {
    color: colors.textMuted,
  },
  inputArea: {
    flexDirection: 'row',
    padding: spacing.marginMobile,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainer,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: isDark ? colors.surfaceContainer : colors.surfaceGray,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    ...type.bodyLg,
    color: colors.onSurface,
    maxHeight: 100,
    minHeight: 44,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.stackSm,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  sendBtnDisabled: {
    backgroundColor: colors.surfaceContainerHigh,
    shadowOpacity: 0,
    elevation: 0,
  }
});
