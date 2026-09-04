import "react-native-get-random-values";
import "react-native-gesture-handler";
import { registerRootComponent } from "expo";
import App from "./App";

const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

if (sentryDsn) {
  import("@sentry/react-native")
    .then((Sentry) => {
      Sentry.init({
        dsn: sentryDsn,
        enabled: !__DEV__,
        tracesSampleRate: 0.2,
        enableAutoSessionTracking: true,
      });
    })
    .catch((error) => {
      console.warn("[sentry] init skipped:", error?.message || error);
    });
}

registerRootComponent(App);
