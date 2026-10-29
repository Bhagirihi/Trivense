import React from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { styles } from "./settingsStyles";

// Password-reset modal content, extracted from SettingsScreen.js so the
// screen file holds navigation/state instead of 90 lines of form JSX.
// All behaviour is unchanged: the parent passes the same state values and
// an onCancel that closes the modal and clears the form, exactly as the
// old inline Cancel handler did.

export function PasswordResetSection({
  theme,
  error,
  success,
  currentPassword,
  newPassword,
  confirmPassword,
  onCurrentPasswordChange,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onCancel,
  onReset,
  loading,
}) {
  return (
  <View
    style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}
  >
    <Text style={[styles.modalTitle, { color: theme.text }]}>
      Reset Password
    </Text>
    {error && (
      <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
    )}
    {success && (
      <Text style={[styles.successText, { color: theme.success }]}>
        Password updated successfully!
      </Text>
    )}
    <TextInput
      style={[
        styles.modalInput,
        {
          color: theme.text,
          borderColor: theme.textLight,
          backgroundColor: theme.inputBackground,
        },
      ]}
      placeholder="Current Password"
      placeholderTextColor={theme.textSecondary}
      secureTextEntry
      value={currentPassword}
      onChangeText={onCurrentPasswordChange}
    />
    <TextInput
      style={[
        styles.modalInput,
        {
          color: theme.text,
          borderColor: theme.textLight,
          backgroundColor: theme.inputBackground,
        },
      ]}
      placeholder="New Password"
      placeholderTextColor={theme.textSecondary}
      secureTextEntry
      value={newPassword}
      onChangeText={onNewPasswordChange}
    />
    <TextInput
      style={[
        styles.modalInput,
        {
          color: theme.text,
          borderColor: theme.textLight,
          backgroundColor: theme.inputBackground,
        },
      ]}
      placeholder="Confirm New Password"
      placeholderTextColor={theme.textSecondary}
      secureTextEntry
      value={confirmPassword}
      onChangeText={onConfirmPasswordChange}
    />
    <View style={styles.modalButtons}>
      <TouchableOpacity
        style={[styles.modalButton, { backgroundColor: theme.errorLight }]}
        onPress={onCancel}
      >
        <Text style={[styles.modalButtonText, { color: theme.error }]}>
          Cancel
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.modalButton, { backgroundColor: theme.primary }]}
        onPress={onReset}
        disabled={loading}
      >
        <Text style={[styles.modalButtonText, { color: "#FFFFFF" }]}>
          {loading ? "Updating..." : "Reset"}
        </Text>
      </TouchableOpacity>
    </View>
  </View>
  );
}
