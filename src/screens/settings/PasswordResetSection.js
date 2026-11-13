import React, { useMemo } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { createSettingsStyles } from "./settingsStyles";
import { kinetic } from "../../theme/tokens";

// Password-reset modal content, extracted from SettingsScreen.js so the
// screen file holds navigation/state instead of 90 lines of form JSX.
// All behaviour is unchanged: the parent passes the same state values and
// an onCancel that closes the modal and clears the form, exactly as the
// old inline Cancel handler did. Restyled on kinetic tokens.

const C = kinetic.colors;

export function PasswordResetSection({
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
  const styles = useMemo(() => createSettingsStyles(), []);
  return (
  <View
    style={[styles.modalContent, { backgroundColor: C.card }]}
  >
    <Text style={[styles.modalTitle, { color: C.textPrimary }]}>
      Reset Password
    </Text>
    {error ? (
      <Text style={[styles.errorText, { color: C.danger }]}>{error}</Text>
    ) : null}
    {success ? (
      <Text style={[styles.successText, { color: C.success }]}>
        Password updated successfully!
      </Text>
    ) : null}
    <TextInput
      style={[
        styles.modalInput,
        {
          color: C.textPrimary,
          borderColor: C.borderStrong,
          backgroundColor: C.subtle,
        },
      ]}
      placeholder="Current Password"
      placeholderTextColor={C.textTertiary}
      secureTextEntry
      value={currentPassword}
      onChangeText={onCurrentPasswordChange}
    />
    <TextInput
      style={[
        styles.modalInput,
        {
          color: C.textPrimary,
          borderColor: C.borderStrong,
          backgroundColor: C.subtle,
        },
      ]}
      placeholder="New Password"
      placeholderTextColor={C.textTertiary}
      secureTextEntry
      value={newPassword}
      onChangeText={onNewPasswordChange}
    />
    <TextInput
      style={[
        styles.modalInput,
        {
          color: C.textPrimary,
          borderColor: C.borderStrong,
          backgroundColor: C.subtle,
        },
      ]}
      placeholder="Confirm New Password"
      placeholderTextColor={C.textTertiary}
      secureTextEntry
      value={confirmPassword}
      onChangeText={onConfirmPasswordChange}
    />
    <View style={styles.modalButtons}>
      <TouchableOpacity
        style={[styles.modalButton, { backgroundColor: "#FEE2E2" }]}
        onPress={onCancel}
      >
        <Text style={[styles.modalButtonText, { color: C.danger }]}>
          Cancel
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.modalButton, { backgroundColor: C.coral }]}
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
