# TripExpense APK Build Guide

This guide will walk you through the process of creating an APK for the TripExpense mobile application using Expo.

## Prerequisites

1. **Development Environment**:

   - Node.js (LTS version)
   - npm or yarn
   - Expo CLI (`npm install -g expo-cli`)
   - EAS CLI (`npm install -g eas-cli`)
   - Android Studio (for Android SDK)
   - Java Development Kit (JDK)

2. **Expo Account**:
   - Create an account at [expo.dev](https://expo.dev/signup)
   - Login to Expo CLI: `expo login`

## Project Configuration

The project is already configured with the following files:

1. **app.json**:

   ```json
   {
     "expo": {
       "name": "TripExpense",
       "slug": "TripExpense",
       "version": "1.0.0",
       "android": {
         "package": "com.tripexpense.app",
         "versionCode": 1
       }
     }
   }
   ```

2. **eas.json**:
   ```json
   {
     "cli": {
       "version": ">= 5.9.1"
     },
     "build": {
       "preview": {
         "distribution": "internal",
         "android": {
           "buildType": "apk"
         }
       }
     }
   }
   ```

## Building the APK

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Login to Expo

```bash
eas login
```

### Step 3: Configure the Build

```bash
eas build:configure
```

ID: 373dac47-60b0-4de3-8dfc-aea74ec58784

### Step 4: Start the Build Process

```bash
eas build --platform android --profile preview
```

## Build Options

1. **Preview Build** (Recommended for testing):

   ```bash
   eas build --platform android --profile preview
   ```

2. **Development Build**:

   ```bash
   eas build --platform android --profile development
   ```

3. **Production Build**:
   ```bash
   eas build --platform android --profile production
   ```

## Build Process

1. The build process will:

   - Create a development build
   - Generate an APK file
   - Upload it to Expo's servers
   - Provide a download link

2. Build time: Approximately 15-30 minutes

3. You'll receive:
   - A download link for the APK
   - Build logs and status updates

## Important Notes

1. **Assets**:

   - Ensure all required assets are present:
     - `./assets/icon.jpg`
     - `./assets/welcome.png`
     - `./assets/favicon.png`
     - Font files in `./assets/fonts/`

2. **Permissions**:

   - The app requires the following permissions:
     - INTERNET
     - ACCESS_NETWORK_STATE
     - WRITE_EXTERNAL_STORAGE
     - READ_EXTERNAL_STORAGE

3. **Version Management**:
   - Update `versionCode` in app.json for each new release
   - Update `version` in app.json for version display

## Troubleshooting

1. **Build Fails**:

   - Check build logs for specific errors
   - Ensure all assets are present
   - Verify internet connection
   - Check Expo account status

2. **APK Installation Issues**:

   - Enable "Install from Unknown Sources" on Android device
   - Check Android version compatibility
   - Verify APK signature

3. **Common Errors**:
   - "Asset not found": Check asset paths in app.json
   - "Build timeout": Retry the build
   - "Permission denied": Check Android permissions

## Post-Build Steps

1. **Testing**:

   - Install APK on test devices
   - Verify all features work correctly
   - Check for any crashes or issues

2. **Distribution**:
   - Share APK with testers
   - Upload to Google Play Store (if applicable)
   - Document version changes

## Support

For additional support:

- Expo documentation: [docs.expo.dev](https://docs.expo.dev)
- Expo forums: [forums.expo.dev](https://forums.expo.dev)
- Project issues: [GitHub Issues](https://github.com/Bhagirihi/moneyexpensemobile/issues)
