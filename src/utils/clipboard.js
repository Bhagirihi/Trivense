import { loadNativeModule } from "./lazyNativeModule";

export async function copyToClipboard(text) {
  const mod = await loadNativeModule(
    () => import("@react-native-clipboard/clipboard"),
    "clipboard"
  );
  mod?.default?.setString(String(text ?? ""));
}
