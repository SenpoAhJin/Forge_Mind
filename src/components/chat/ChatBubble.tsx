/**
 * ForgeMind Design System - Chat Bubble Components
 * Types: Sender (user), Receiver, System message
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { typography, borderRadius, spacing } from '../../theme';
import { useTheme, ThemeColors } from '../../contexts/ThemeContext';

type BubbleType = 'sender' | 'receiver' | 'system';

interface ChatBubbleProps {
  type: BubbleType;
  message: string;
  timestamp?: string;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ type, message, timestamp }) => {
  const { themeColors } = useTheme();
  const dynamicStyles = getDynamicStyles(themeColors);
  
  if (type === 'system') {
    return (
      <View style={styles.systemContainer}>
        <Text style={[dynamicStyles.systemMessage, styles.systemMessage]}>{message}</Text>
        {timestamp ? <Text style={[dynamicStyles.systemTimestamp, styles.systemTimestamp]}>{timestamp}</Text> : null}
      </View>
    );
  }

  return (
    <View style={[styles.container, type === 'sender' ? styles.senderContainer : styles.receiverContainer]}>
      <View style={[styles.bubble, type === 'sender' ? dynamicStyles.senderBubble : dynamicStyles.receiverBubble, styles[`${type}Bubble`]]}>
        <Text style={[styles.messageText, type === 'sender' ? dynamicStyles.senderText : dynamicStyles.receiverText]}>{message}</Text>
      </View>
      {timestamp ? (
        <Text style={[dynamicStyles.timestamp, styles.timestamp, type === 'sender' && styles.senderTimestamp]}>
          {timestamp}
        </Text>
      ) : null}
    </View>
  );
};

const getDynamicStyles = (colors: ThemeColors) => ({
  senderBubble: {
    backgroundColor: colors.primary,
  },
  senderText: {
    color: colors.backgroundLight,
  },
  receiverBubble: {
    backgroundColor: colors.surface,
  },
  receiverText: {
    color: colors.textPrimary,
  },
  timestamp: {
    color: colors.textSecondary,
  },
  systemMessage: {
    color: colors.textSecondary,
  },
  systemTimestamp: {
    color: colors.textDisabled,
  },
});

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
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.sm,
    borderBottomLeftRadius: borderRadius.lg,
    borderBottomRightRadius: borderRadius.sm,
  },
  // Receiver: Left-aligned, surface color background, dark text, rounded right corners
  receiverContainer: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  receiverBubble: {
    borderTopLeftRadius: borderRadius.sm,
    borderTopRightRadius: borderRadius.lg,
    borderBottomLeftRadius: borderRadius.sm,
    borderBottomRightRadius: borderRadius.lg,
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
    fontStyle: 'italic',
    textAlign: 'center',
  },
  systemTimestamp: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
});
