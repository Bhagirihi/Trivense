import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { copyToClipboard } from "../utils/clipboard";
import { showToast } from "../utils/toast";

function createReferenceId() {
  const hex = "0123456789abcdef";
  let id = "";
  for (let i = 0; i < 32; i += 1) {
    id += hex[Math.floor(Math.random() * 16)];
  }
  return id;
}

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      referenceId: null,
      userNote: "",
      reportSent: false,
      sending: false,
    };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    const referenceId = createReferenceId();
    this.setState({ referenceId, reportSent: true });

    import("@sentry/react-native")
      .then((Sentry) => {
        Sentry.captureException(error, {
          tags: { support_reference: referenceId },
          extra: {
            componentStack: info?.componentStack,
            userNote: this.state.userNote,
          },
        });
      })
      .catch(() => {
        if (__DEV__) {
          console.error("ErrorBoundary caught:", error, info?.componentStack);
        }
      });
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      referenceId: null,
      userNote: "",
      reportSent: false,
      sending: false,
    });
  };

  handleCopyReference = async () => {
    if (!this.state.referenceId) return;
    await copyToClipboard(this.state.referenceId);
    showToast.success("Reference copied");
  };

  handleSendNote = async () => {
    const note = this.state.userNote.trim();
    if (!note || !this.state.referenceId) return;

    this.setState({ sending: true });
    try {
      const Sentry = await import("@sentry/react-native");
      Sentry.captureMessage("User error report note", {
        level: "info",
        tags: { support_reference: this.state.referenceId },
        extra: { userNote: note },
      });
      showToast.success("Thanks — your note was sent");
    } catch {
      showToast.error("Could not send note");
    } finally {
      this.setState({ sending: false });
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.safe}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.card}>
              <View style={styles.iconWrap}>
                <MaterialCommunityIcons name="alert-circle" size={36} color="#DC2626" />
              </View>

              <Text style={styles.title}>Something went wrong</Text>
              <Text style={styles.message}>
                Don't worry — your work is safe. Tap Retry to pick up where you left off.
              </Text>

              {this.state.reportSent ? (
                <View style={styles.sentBadge}>
                  <MaterialCommunityIcons name="check-circle" size={16} color="#059669" />
                  <Text style={styles.sentText}>Report sent automatically</Text>
                </View>
              ) : null}

              <View style={styles.noteHeader}>
                <Text style={styles.noteTitle}>What were you doing?</Text>
                <Text style={styles.optional}>Optional</Text>
              </View>
              <Text style={styles.noteHint}>
                A quick note helps our team reproduce and fix this faster.
              </Text>
              <TextInput
                style={styles.noteInput}
                value={this.state.userNote}
                onChangeText={(userNote) => this.setState({ userNote })}
                placeholder="e.g. I was editing my budget in Settings..."
                placeholderTextColor="#9CA3AF"
                multiline
                textAlignVertical="top"
              />

              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.button, styles.sendButton, this.state.sending && styles.disabled]}
                  onPress={this.handleSendNote}
                  disabled={this.state.sending || !this.state.userNote.trim()}
                >
                  <Text style={styles.sendButtonText}>Send</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.button, styles.retryButton]} onPress={this.handleRetry}>
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.refLabel}>SUPPORT REFERENCE</Text>
              <TouchableOpacity style={styles.refPill} onPress={this.handleCopyReference}>
                <Text style={styles.refValue} numberOfLines={1}>
                  {this.state.referenceId ?? "Generating..."}
                </Text>
                <MaterialCommunityIcons name="content-copy" size={18} color="#2563EB" />
              </TouchableOpacity>
              <Text style={styles.refHint}>Tap to copy</Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#E5E7EB",
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    ...Platform.select({
      ios: {
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
      },
      android: { elevation: 4 },
    }),
  },
  iconWrap: {
    alignSelf: "center",
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    textAlign: "center",
    color: "#6B7280",
    lineHeight: 22,
    marginBottom: 16,
  },
  sentBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: 6,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    marginBottom: 20,
  },
  sentText: {
    color: "#059669",
    fontSize: 13,
    fontWeight: "600",
  },
  noteHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  optional: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "600",
  },
  noteHint: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 10,
  },
  noteInput: {
    minHeight: 96,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: "#111827",
    backgroundColor: "#F9FAFB",
    marginBottom: 16,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  sendButton: {
    backgroundColor: "#2563EB",
  },
  sendButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  retryButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#2563EB",
  },
  retryButtonText: {
    color: "#2563EB",
    fontSize: 16,
    fontWeight: "600",
  },
  disabled: {
    opacity: 0.6,
  },
  refLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9CA3AF",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  refPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  refValue: {
    flex: 1,
    fontSize: 14,
    color: "#374151",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  refHint: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 6,
  },
});

export default ErrorBoundary;
