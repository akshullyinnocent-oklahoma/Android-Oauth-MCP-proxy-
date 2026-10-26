import JSZip from 'jszip';

export interface AndroidProjectConfig {
  appName: string;
  appId: string;
  versionName: string;
  versionCode: number;
  serverPort: number;
  webAppUrl: string;
}

export function generateAndroidManifest(config: AndroidProjectConfig): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="${config.appId}">

    <!-- Permissions required for Local Proxy Server & OAuth Networking -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_DATA_SYNC" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="${config.appName}"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme"
        android:usesCleartextTraffic="true">

        <activity
            android:name=".MainActivity"
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
            android:exported="true"
            android:label="${config.appName}"
            android:launchMode="singleTask"
            android:theme="@style/AppTheme.NoActionBarLaunch">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>

            <!-- Deep link handler for OAuth callbacks: mcp-proxy://oauth/callback -->
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="mcp-proxy" android:host="oauth" />
            </intent-filter>
        </activity>

        <!-- Android Foreground Service to keep OAuth MCP Proxy server running in background -->
        <service
            android:name=".McpProxyForegroundService"
            android:enabled="true"
            android:exported="false"
            android:foregroundServiceType="dataSync" />

    </application>
</manifest>`;
}

export function generateCapacitorConfig(config: AndroidProjectConfig): string {
  return JSON.stringify(
    {
      appId: config.appId,
      appName: config.appName,
      webDir: 'dist',
      server: {
        androidScheme: 'https',
        cleartext: true,
        allowNavigation: ['*'],
      },
      plugins: {
        CapacitorHttp: {
          enabled: true,
        },
      },
    },
    null,
    2
  );
}

export function generateMainActivity(config: AndroidProjectConfig): string {
  return `package ${config.appId};

import android.os.Bundle;
import android.content.Intent;
import android.net.Uri;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Start Local MCP Proxy Foreground Service on Android port ${config.serverPort}
        Intent serviceIntent = new Intent(this, McpProxyForegroundService.class);
        startForegroundService(serviceIntent);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        Uri data = intent.getData();
        if (data != null && "mcp-proxy".equals(data.getScheme())) {
            // OAuth Redirect returned to native Android app
            String code = data.getQueryParameter("code");
            String state = data.getQueryParameter("state");
            bridge.eval("window.postMessage({ type: 'OAUTH_AUTH_SUCCESS', code: '" + code + "', state: '" + state + "' }, '*');", null);
        }
    }
}
`;
}

export function generateForegroundService(config: AndroidProjectConfig): string {
  return `package ${config.appId};

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;

public class McpProxyForegroundService extends Service {
    private static final String CHANNEL_ID = "mcp_proxy_service_channel";
    private static final int NOTIFICATION_ID = 4040;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, 0, notificationIntent,
            PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );

        Notification.Builder builder;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            builder = new Notification.Builder(this, CHANNEL_ID);
        } else {
            builder = new Notification.Builder(this);
        }

        Notification notification = builder
            .setContentTitle("OAuth MCP Proxy Active")
            .setContentText("Local server running on port ${config.serverPort} (Ready for Claude Desktop/Cursor)")
            .setSmallIcon(android.R.drawable.stat_notify_sync)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .build();

        startForeground(NOTIFICATION_ID, notification);
        return START_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "MCP Proxy Background Server",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Keeps the local MCP OAuth proxy listening for LLM requests.");
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }
}
`;
}

export function generateBuildReadme(config: AndroidProjectConfig): string {
  return `# Building the Android APK: ${config.appName}

This project package contains the complete Android bridge and configuration for the **OAuth MCP Proxy**.

## Quickest Option: Build via Bubblewrap TWA CLI (Recommended for Instant APK)
Google's official Bubblewrap tool transforms this app into an installable Android APK with no manual Java code:

\`\`\`bash
# 1. Install Bubblewrap CLI
npm install -g @bubblewrap/cli

# 2. Initialize project from your live Web Manifest
bubblewrap init --manifest="${config.webAppUrl}/manifest.webmanifest"

# 3. Build the release APK
bubblewrap build
\`\`\`
This produces \`app-release-signed.apk\` ready to install on any Android phone!

---

## Option 2: Build via Capacitor & Android Studio (Native APK)

\`\`\`bash
# 1. Install dependencies
npm install

# 2. Build the web app
npm run build

# 3. Initialize Capacitor Android project
npx cap add android

# 4. Sync assets and AndroidManifest.xml
npx cap sync

# 5. Build Debug APK using Gradle
cd android
./gradlew assembleDebug

# Output location:
# android/app/build/outputs/apk/debug/app-debug.apk
\`\`\`

---

## Option 3: Install Directly to Device via ADB
\`\`\`bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
\`\`\`

## Networking & Localhost on Android
- When running this APK on Android, the local proxy runs at \`http://127.0.0.1:${config.serverPort}\`.
- To connect from PC/Mac (Claude Desktop, Cursor) on the same Wi-Fi, use your Android phone's Wi-Fi IP (e.g. \`http://192.168.1.X:${config.serverPort}\`).
- In Android Studio Emulator, use \`http://10.0.2.2:${config.serverPort}\` to bridge between emulator and host.
`;
}

export function generateGitHubWorkflow(): string {
  return `name: Build Android Debug APK

on:
  push:
    branches:
      - main
      - master
  pull_request:
    branches:
      - main
      - master
  workflow_dispatch:

jobs:
  build-apk:
    name: Build & Sign Android Debug APK
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Source Code
        uses: actions/checkout@v4

      - name: Set up Node.js 20
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Set up Java JDK 17
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'

      - name: Install Dependencies
        run: npm install

      - name: Build Web Application
        run: npm run build

      - name: Initialize Capacitor Android
        run: |
          if [ ! -d "android" ]; then
            npx cap add android
          fi
          npx cap sync android

      - name: Setup Gradle
        uses: gradle/actions/setup-gradle@v3
        with:
          build-root-directory: android

      - name: Build Android Debug APK
        run: |
          cd android
          chmod +x gradlew
          ./gradlew assembleDebug --stacktrace

      - name: Verify Signed Debug APK
        run: |
          APK_FILE=$(find android/app/build/outputs/apk/debug -name "*.apk" | head -n 1)
          if [ -z "$APK_FILE" ]; then
            echo "Error: Debug APK was not generated!"
            exit 1
          fi
          echo "Debug APK successfully built at: $APK_FILE"
          ls -lh "$APK_FILE"

      - name: Upload Debug APK Artifact
        uses: actions/upload-artifact@v4
        with:
          name: oauth-mcp-proxy-debug-apk
          path: android/app/build/outputs/apk/debug/*.apk
          if-no-files-found: error
          retention-days: 30
`;
}

export async function createAndroidApkPackageZip(config: AndroidProjectConfig): Promise<Blob> {
  const zip = new JSZip();

  // Root files
  zip.file('capacitor.config.json', generateCapacitorConfig(config));
  zip.file('README_BUILD_APK.md', generateBuildReadme(config));

  // GitHub Actions workflow
  const githubFolder = zip.folder('.github')?.folder('workflows');
  if (githubFolder) {
    githubFolder.file('build-apk.yml', generateGitHubWorkflow());
  }

  // Android folder
  const androidFolder = zip.folder('android');
  if (androidFolder) {
    androidFolder.file(
      'build.gradle',
      `// Top-level build file
buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath 'com.android.tools.build:gradle:8.2.1'
    }
}
allprojects {
    repositories {
        google()
        mavenCentral()
    }
}
`
    );

    const appFolder = androidFolder.folder('app');
    if (appFolder) {
      appFolder.file(
        'build.gradle',
        `apply plugin: 'com.android.application'

android {
    namespace "${config.appId}"
    compileSdk 34

    defaultConfig {
        applicationId "${config.appId}"
        minSdk 24
        targetSdk 34
        versionCode ${config.versionCode}
        versionName "${config.versionName}"
        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
        debug {
            applicationIdSuffix ".debug"
            debuggable true
        }
    }
}

dependencies {
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'com.google.android.material:material:1.11.0'
    implementation 'androidx.constraintlayout:constraintlayout:2.1.4'
    implementation project(':capacitor-android')
}
`
      );

      const srcFolder = appFolder.folder('src')?.folder('main');
      if (srcFolder) {
        srcFolder.file('AndroidManifest.xml', generateAndroidManifest(config));

        const javaFolder = srcFolder.folder('java')?.folder('com')?.folder('mcpproxy')?.folder('app');
        if (javaFolder) {
          javaFolder.file('MainActivity.java', generateMainActivity(config));
          javaFolder.file('McpProxyForegroundService.java', generateForegroundService(config));
        }
      }
    }
  }

  return await zip.generateAsync({ type: 'blob' });
}
