import { Platform } from "react-native";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { buildExportFile } from "./exportService";

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";

function getGoogleClientId() {
  if (Platform.OS === "ios" && process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID) {
    return process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  }
  if (
    Platform.OS === "android" &&
    process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID
  ) {
    return process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
  }
  return process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || null;
}

export function isGoogleDriveConfigured() {
  return Boolean(getGoogleClientId());
}

export async function getGoogleDriveAccessToken() {
  const clientId = getGoogleClientId();
  if (!clientId) {
    throw new Error(
      "Google Drive backup is not configured. Add EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID to your .env file and enable the Google Drive API in Google Cloud Console."
    );
  }

  const redirectUri = AuthSession.makeRedirectUri({
    scheme: "trivense",
    path: "google-drive",
  });

  const discovery = {
    authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenEndpoint: "https://oauth2.googleapis.com/token",
  };

  const request = new AuthSession.AuthRequest({
    clientId,
    scopes: [GOOGLE_DRIVE_SCOPE, "email", "profile"],
    redirectUri,
    responseType: AuthSession.ResponseType.Code,
    usePKCE: true,
  });

  const result = await request.promptAsync(discovery);

  if (result.type !== "success" || !result.params?.code) {
    throw new Error("Google sign-in was cancelled");
  }

  const tokenResult = await AuthSession.exchangeCodeAsync(
    {
      clientId,
      code: result.params.code,
      redirectUri,
      extraParams: {
        code_verifier: request.codeVerifier || "",
      },
    },
    discovery
  );

  if (!tokenResult.accessToken) {
    throw new Error("Could not obtain Google Drive access token");
  }

  return tokenResult.accessToken;
}

export async function uploadTextFileToGoogleDrive(
  accessToken,
  fileName,
  content,
  mimeType = "application/json"
) {
  const boundary = "trivense_drive_upload_boundary";
  const metadata = JSON.stringify({
    name: fileName,
    mimeType,
  });

  const body =
    `--${boundary}\r\n` +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    `${metadata}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: ${mimeType}\r\n\r\n` +
    `${content}\r\n` +
    `--${boundary}--`;

  const response = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      payload?.error?.message ||
        `Google Drive upload failed (${response.status})`
    );
  }

  return payload;
}

export async function backupExportToGoogleDrive() {
  const { content, fileName, summary } = await buildExportFile("json");
  const accessToken = await getGoogleDriveAccessToken();
  const driveFile = await uploadTextFileToGoogleDrive(
    accessToken,
    fileName,
    content,
    "application/json"
  );

  return {
    driveFile,
    summary,
    fileName,
  };
}
