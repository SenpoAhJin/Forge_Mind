/**
 * App-wide notification host component
 * 
 * Displays pop-up notices at the top of the screen.
 * Mount once at the root level (App.tsx).
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions } from 'react-native';
import { subscribeToNotices, Notice, NoticeType } from '../utils/appNotice';
import { useTheme } from '../contexts/ThemeContext';

const NOTICE_DURATION_MS = 4000;
const ANIMATION_DURATION_MS = 300;

export function AppNoticeHost() {
  const { themeColors } = useTheme();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [fadeAnims] = useState<Map<string, Animated.Value>>(new Map());

  useEffect(() => {
    const unsubscribe = subscribeToNotices((notice) => {
      const fadeAnim = new Animated.Value(0);
      fadeAnims.set(notice.id, fadeAnim);

      setNotices((prev) => [...prev, notice]);

      // Fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: ANIMATION_DURATION_MS,
        useNativeDriver: true,
      }).start();

      // Auto-dismiss after duration
      setTimeout(() => {
        dismissNotice(notice.id);
      }, NOTICE_DURATION_MS);
    });

    return unsubscribe;
  }, []);

  const dismissNotice = (id: string) => {
    const fadeAnim = fadeAnims.get(id);
    if (!fadeAnim) return;

    // Fade out
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: ANIMATION_DURATION_MS,
      useNativeDriver: true,
    }).start(() => {
      setNotices((prev) => prev.filter((n) => n.id !== id));
      fadeAnims.delete(id);
    });
  };

  const getNoticeColors = (type: NoticeType) => {
    switch (type) {
      case 'error':
        return { bg: '#dc2626', text: '#ffffff' };
      case 'warning':
        return { bg: '#f59e0b', text: '#000000' };
      case 'success':
        return { bg: '#10b981', text: '#ffffff' };
      case 'info':
        return { bg: themeColors.surface, text: themeColors.textPrimary };
      default:
        return { bg: themeColors.surface, text: themeColors.textPrimary };
    }
  };

  if (notices.length === 0) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      {notices.map((notice) => {
        const fadeAnim = fadeAnims.get(notice.id);
        if (!fadeAnim) return null;

        const noticeColors = getNoticeColors(notice.type);

        return (
          <Animated.View
            key={notice.id}
            style={[
              styles.notice,
              { backgroundColor: noticeColors.bg, opacity: fadeAnim },
            ]}
          >
            <TouchableOpacity
              style={styles.noticeContent}
              onPress={() => dismissNotice(notice.id)}
              activeOpacity={0.8}
            >
              <Text style={[styles.noticeText, { color: noticeColors.text }]}>
                {notice.message}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  notice: {
    marginBottom: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    maxWidth: Dimensions.get('window').width - 32,
  },
  noticeContent: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  noticeText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
