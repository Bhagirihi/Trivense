import React, { memo, useMemo } from "react";
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { radii, spacing, typography } from "../../theme/tokens";

const FormButton = memo(
  ({
    title,
    onPress,
    loading = false,
    disabled = false,
    variant = "primary",
    size = "medium",
    style,
    textStyle,
    testID,
    ...props
  }) => {
    const { theme } = useTheme();

    const styles = useMemo(
      () =>
        StyleSheet.create({
          button: {
            minHeight: size === "large" ? 56 : 52,
            borderRadius: radii.md,
            justifyContent: "center",
            alignItems: "center",
            flexDirection: "row",
            paddingHorizontal: spacing.xl,
            backgroundColor:
              variant === "primary"
                ? theme.primary
                : variant === "danger"
                ? theme.error
                : "transparent",
            borderWidth: variant === "secondary" || variant === "outline" ? 1.5 : 0,
            borderColor:
              variant === "outline" ? theme.border : theme.primary,
            opacity: disabled ? 0.5 : 1,
            ...Platform.select({
              ios: variant === "primary" && {
                shadowColor: theme.primary,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.12,
                shadowRadius: 4,
              },
              android: variant === "primary" && { elevation: 1 },
            }),
            ...style,
          },
          buttonText: {
            ...(size === "large" ? typography.bodyMedium : typography.label),
            fontSize: size === "large" ? 17 : 16,
            color:
              variant === "primary" || variant === "danger"
                ? theme.white
                : variant === "outline"
                ? theme.text
                : theme.primary,
            ...textStyle,
          },
          loadingIndicator: { marginRight: spacing.sm },
        }),
      [theme, variant, size, disabled, style, textStyle]
    );

    return (
      <TouchableOpacity
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={props.accessibilityLabel || title}
        accessibilityState={{ disabled: disabled || loading, busy: loading }}
        style={styles.button}
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.85}
        {...props}
      >
        {loading ? (
          <ActivityIndicator
            color={
              variant === "primary" || variant === "danger"
                ? theme.white
                : theme.primary
            }
            style={styles.loadingIndicator}
          />
        ) : null}
        <Text style={styles.buttonText}>{title}</Text>
      </TouchableOpacity>
    );
  }
);

export default FormButton;
