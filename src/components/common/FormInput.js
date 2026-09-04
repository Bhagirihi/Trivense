import React, { memo, useMemo } from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { radii, spacing, typography } from "../../theme/tokens";

const FormInput = memo(
  ({
    label,
    error,
    value,
    onChangeText,
    placeholder,
    secureTextEntry,
    keyboardType = "default",
    autoCapitalize = "none",
    autoCorrect = false,
    leftIcon,
    style,
    inputStyle,
    labelStyle,
    errorStyle,
    ...props
  }) => {
    const { theme } = useTheme();

    const styles = useMemo(
      () =>
        StyleSheet.create({
          container: { marginBottom: spacing.lg, ...style },
          label: {
            ...typography.label,
            marginBottom: spacing.sm,
            color: theme.text,
            ...labelStyle,
          },
          inputWrap: {
            flexDirection: "row",
            alignItems: "center",
            minHeight: 52,
            borderWidth: 1.5,
            borderColor: error ? theme.error : theme.border,
            borderRadius: radii.md,
            paddingHorizontal: spacing.md,
            backgroundColor: theme.inputBackground,
          },
          input: {
            flex: 1,
            fontSize: 16,
            color: theme.text,
            paddingVertical: spacing.md,
            ...inputStyle,
          },
          leftIcon: { marginRight: spacing.sm },
          errorText: {
            fontSize: 12,
            color: theme.error,
            marginTop: spacing.xs,
            ...errorStyle,
          },
        }),
      [theme, error, style, inputStyle, labelStyle, errorStyle]
    );

    return (
      <View style={styles.container}>
        {label ? <Text style={styles.label}>{label}</Text> : null}
        <View style={styles.inputWrap}>
          {leftIcon ? <View style={styles.leftIcon}>{leftIcon}</View> : null}
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={theme.textMuted}
            secureTextEntry={secureTextEntry}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
            autoCorrect={autoCorrect}
            {...props}
          />
        </View>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>
    );
  }
);

export default FormInput;
