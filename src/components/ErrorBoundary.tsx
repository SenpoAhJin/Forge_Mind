/**
 * ForgeMind - Error Boundary
 *
 * A class component that catches a render error in the tree below it and shows
 * a friendly screen instead of letting the error bubble up. Without one, a
 * render error unmounts the whole app, which is what a blank white page is.
 *
 * Two rules it keeps:
 * - it never shows text that came from a listing or a user record. In
 *   development only, and only the error's own message, is shown.
 * - "Try again" clears the error and remounts the children, so a transient
 *   failure (a fetch that came back empty, a listing that vanished) recovers
 *   without restarting the app.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../theme';
import { Button } from './buttons';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Shown in the message, e.g. "the Marketplace". Never a listing title. */
  label?: string;
}

interface ErrorBoundaryState {
  error: Error | null;
  /** Bumped on reset so the children are remounted, not just unhidden. */
  resetKey: number;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null, resetKey: 0 };
    this.handleReset = this.handleReset.bind(this);
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // The stack is a developer aid. It never carries listing text into the UI.
    console.error('[ErrorBoundary] render error:', error.message, info.componentStack);
  }

  handleReset(): void {
    this.setState(previous => ({ error: null, resetKey: previous.resetKey + 1 }));
  }

  render(): React.ReactNode {
    const { error, resetKey } = this.state;
    const { children, label = 'this screen' } = this.props;

    if (!error) {
      return <React.Fragment key={resetKey}>{children}</React.Fragment>;
    }

    return (
      <View style={styles.container}>
        <View style={styles.iconCircle}>
          <Ionicons name="alert-circle-outline" size={40} color={colors.error} />
        </View>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.body}>
          {`${label} could not be shown this time. Your account and your listings were not changed.`}
        </Text>

        {/* Development only: the error's own message. Never listing text. */}
        {__DEV__ ? (
          <ScrollView style={styles.debugBox} contentContainerStyle={styles.debugContent}>
            <Text style={styles.debugText}>{error.message}</Text>
          </ScrollView>
        ) : null}

        <Button
          title="Try again"
          onPress={this.handleReset}
          variant="primary"
          fullWidth
        />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.surface,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundLight,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  debugBox: {
    maxHeight: 120,
    width: '100%',
    backgroundColor: colors.backgroundLight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.lg,
  },
  debugContent: {
    padding: spacing.md,
  },
  debugText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
