/**
 * ForgeMind Design System - Chat Bubble Components
 * Types: Sender (user), Receiver, System message
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, borderRadius, spacing } from '../../theme';

type BubbleType = 'sender' | 'receiver' | 'system';

interface ChatBubbleProps {
  type: BubbleType;
  message: string;
  timestamp?: string;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ type, message, timestamp }) => {
  if (type === 'system') {
    return (
      <View style={styles.systemContainer}>
        <Text style={styles.systemMessage}>{message}</Text>
        {timestamp && <Text style={styles.systemTimestamp}>{timestamp}</Text>}
      </View>
    );
  }

  return (
    <View style={[styles.container, type === 'sender' ? styles.senderContainer : styles.receiverContainer]}>
      <View style={[styles.bubble, styles[`${type}Bubble`]]}>
        <Text style={[styles.messageText, styles[`${type}Text`]]}>{message}</Text>
      </View>
      {timestamp && (
        <Text style={[styles.timestamp, type === 'sender' && styles.senderTimestamp]}>
          {timestamp}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.xs,
    maxWidth: '80%',
  },
  // Sender (User): Right-aligned, primary color background, white text, rounded left corners
  senderContainer: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  senderBubble: {
    backgroundColor: colors.primary,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.sm,
    borderBottomLeftRadius: borderRadius.lg,
    borderBottomRightRadius: borderRadius.sm,
  },
  senderText: {
    color: colors.backgroundLight,
  },
  // Receiver: Left-aligned, surface color background, dark text, rounded right corners
  receiverContainer: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  receiverBubble: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.sm,
    borderTopRightRadius: borderRadius.lg,
    borderBottomLeftRadius: borderRadius.sm,
    borderBottomRightRadius: borderRadius.lg,
  },
  receiverText: {
    color: colors.textPrimary,
  },
  bubble: {
    padding: spacing.md,
    minWidth: 60,
  },
  messageText: {
    ...typography.body,
  },
  timestamp: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginHorizontal: spacing.sm,
  },
  senderTimestamp: {
    textAlign: 'right',
  },
  // System Message: Center-aligned, italic, gray text, no bubble
  systemContainer: {
    alignSelf: 'center',
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  systemMessage: {
    ...typography.caption,
    color: colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  systemTimestamp: {
    ...typography.caption,
    color: colors.textDisabled,
    marginTop: spacing.xs,
  },
});
