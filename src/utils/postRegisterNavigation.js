import {
  isPostRegisterSetupPending,
  shouldShowPostRegisterSetup,
} from "./postRegisterSetupStorage";

export async function navigateAfterRegisterAuth(navigation, options = {}) {
  const userId = options.userId;
  const pending = userId
    ? await shouldShowPostRegisterSetup(userId)
    : await isPostRegisterSetupPending();
  const routeName = pending ? "PostRegisterSetup" : "Dashboard";

  if (typeof navigation.reset === "function") {
    navigation.reset({
      index: 0,
      routes: [{ name: routeName, params: options.params }],
    });
    return;
  }

  navigation.replace(routeName, options.params);
}
