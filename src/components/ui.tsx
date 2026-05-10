import type { ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
  View,
} from "react-native";

import { colors, fontSizes, radii, spacing } from "../theme";

interface BoxProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

interface TextProps {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
}

interface ButtonProps {
  children: ReactNode;
  disabled?: boolean;
  onPress?: PressableProps["onPress"];
  style?: StyleProp<ViewStyle>;
}

export function ScreenSection({ children, style }: BoxProps) {
  return <View style={[styles.screenSection, style]}>{children}</View>;
}

export function SectionCard({ children, style }: BoxProps) {
  return <View style={[styles.sectionCard, style]}>{children}</View>;
}

export function EmptyText({ children, style }: TextProps) {
  return <Text style={[styles.emptyText, style]}>{children}</Text>;
}

export function LabelText({ children, style }: TextProps) {
  return <Text style={[styles.labelText, style]}>{children}</Text>;
}

export function PrimaryButton(props: ButtonProps) {
  return (
    <BaseButton
      {...props}
      buttonStyle={styles.primaryButton}
      pressedStyle={styles.primaryButtonPressed}
      textStyle={styles.primaryButtonText}
    />
  );
}

export function SecondaryButton(props: ButtonProps) {
  return (
    <BaseButton
      {...props}
      buttonStyle={styles.secondaryButton}
      pressedStyle={styles.secondaryButtonPressed}
      textStyle={styles.secondaryButtonText}
    />
  );
}

export function DangerButton(props: ButtonProps) {
  return (
    <BaseButton
      {...props}
      buttonStyle={styles.dangerButton}
      pressedStyle={styles.dangerButtonPressed}
      textStyle={styles.dangerButtonText}
    />
  );
}

interface BaseButtonProps extends ButtonProps {
  buttonStyle: StyleProp<ViewStyle>;
  pressedStyle: StyleProp<ViewStyle>;
  textStyle: StyleProp<TextStyle>;
}

function BaseButton({
  children,
  disabled = false,
  onPress,
  style,
  buttonStyle,
  pressedStyle,
  textStyle,
}: BaseButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        buttonStyle,
        pressed && !disabled ? pressedStyle : null,
        disabled ? styles.disabledButton : null,
        style,
      ]}
    >
      <Text style={[styles.buttonText, textStyle]}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screenSection: {
    gap: spacing.lg,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.lg,
    padding: spacing.lg,
  },
  emptyText: {
    color: colors.textSubtle,
    fontSize: fontSizes.md,
    lineHeight: 22,
    textAlign: "center",
  },
  labelText: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  button: {
    alignItems: "center",
    borderRadius: radii.md,
    justifyContent: "center",
    minHeight: 48,
    minWidth: 88,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  buttonText: {
    fontSize: fontSizes.lg,
    fontWeight: "700",
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  primaryButtonPressed: {
    backgroundColor: colors.primaryPressed,
  },
  primaryButtonText: {
    color: colors.onPrimary,
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  },
  secondaryButtonPressed: {
    backgroundColor: colors.surfaceMuted,
  },
  secondaryButtonText: {
    color: colors.text,
  },
  dangerButton: {
    backgroundColor: colors.roseSurface,
    borderColor: colors.roseSurface,
    borderWidth: 1,
  },
  dangerButtonPressed: {
    opacity: 0.82,
  },
  dangerButtonText: {
    color: colors.rose,
  },
  disabledButton: {
    opacity: 0.55,
  },
});
