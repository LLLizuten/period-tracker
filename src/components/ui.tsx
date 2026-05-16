import type { ReactNode } from "react";
import {
  Modal,
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

interface StatusMessageProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  tone?: "neutral" | "success" | "error";
}

interface InlineConfirmPanelProps {
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel: string;
  confirmTone?: "primary" | "danger";
  disabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  style?: StyleProp<ViewStyle>;
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

// 状态消息文本，按语义切换颜色。
export function StatusMessage({
  children,
  style,
  tone = "neutral",
}: StatusMessageProps) {
  return (
    <View
      style={[
        styles.statusMessage,
        tone === "success" ? styles.statusMessageSuccess : null,
        tone === "error" ? styles.statusMessageError : null,
        style,
      ]}
    >
      <Text
        style={[
          styles.statusMessageText,
          tone === "success" ? styles.statusMessageSuccessText : null,
          tone === "error" ? styles.statusMessageErrorText : null,
        ]}
      >
        {children}
      </Text>
    </View>
  );
}

// 应用内确认弹窗，复用现有按钮体系承载确认与取消操作。
export function InlineConfirmPanel({
  cancelLabel,
  confirmLabel,
  confirmTone = "danger",
  description,
  disabled = false,
  onCancel,
  onConfirm,
  style,
  title,
}: InlineConfirmPanelProps) {
  const ConfirmButton =
    confirmTone === "danger" ? DangerButton : PrimaryButton;

  return (
    <Modal
      transparent
      visible
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.confirmModalOverlay}>
        <View style={[styles.inlineConfirmPanel, style]}>
          <View style={styles.inlineConfirmContent}>
            <Text style={styles.inlineConfirmTitle}>{title}</Text>
            {description ? (
              <Text style={styles.inlineConfirmDescription}>{description}</Text>
            ) : null}
          </View>
          <View style={styles.inlineConfirmActions}>
            <SecondaryButton
              onPress={onCancel}
              disabled={disabled}
              style={styles.inlineActionButton}
            >
              {cancelLabel}
            </SecondaryButton>
            <ConfirmButton
              onPress={onConfirm}
              disabled={disabled}
              style={styles.inlineActionButton}
            >
              {confirmLabel}
            </ConfirmButton>
          </View>
        </View>
      </View>
    </Modal>
  );
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
  statusMessage: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  statusMessageSuccess: {
    backgroundColor: colors.accentSurface,
    borderColor: colors.accent,
  },
  statusMessageError: {
    backgroundColor: colors.roseSurface,
    borderColor: colors.rose,
  },
  statusMessageText: {
    color: colors.textSubtle,
    fontSize: fontSizes.md,
    lineHeight: 22,
  },
  statusMessageSuccessText: {
    color: colors.accent,
  },
  statusMessageErrorText: {
    color: colors.rose,
  },
  confirmModalOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(32,26,28,0.32)",
    flex: 1,
    justifyContent: "center",
    padding: spacing.xl,
  },
  inlineConfirmPanel: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.md,
    maxWidth: 420,
    padding: spacing.lg,
    width: "100%",
  },
  inlineConfirmContent: {
    gap: spacing.xs,
  },
  inlineConfirmTitle: {
    color: colors.text,
    fontSize: fontSizes.lg,
    fontWeight: "700",
    lineHeight: 22,
  },
  inlineConfirmDescription: {
    color: colors.textMuted,
    fontSize: fontSizes.md,
    lineHeight: 22,
  },
  inlineConfirmActions: {
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "flex-end",
  },
  inlineActionButton: {
    flex: 1,
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
