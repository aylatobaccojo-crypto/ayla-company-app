#!/usr/bin/env node
/**
 * Patches react-native-bluetooth-escpos-printer for RN 0.81 compatibility:
 * 1. build.gradle: removes JCenter, updates SDK to 34, adds androidx.core
 * 2. Java imports: android.support.* → androidx.*
 * 3. scanDevices fix: return paired devices even when startDiscovery() fails
 *    (startDiscovery fails when Location Services are disabled on Android 6-11)
 */
const fs = require('fs');
const path = require('path');
const btDir = path.join(__dirname, '..', 'node_modules', 'react-native-bluetooth-escpos-printer');

if (!fs.existsSync(btDir)) {
  console.log('ℹ react-native-bluetooth-escpos-printer not found, skipping patch');
  process.exit(0);
}

// ─── 1. Patch build.gradle ────────────────────────────────────────────────────
const gradleFile = path.join(btDir, 'android', 'build.gradle');
const newGradle = `apply plugin: 'com.android.library'

android {
    compileSdkVersion 34
    defaultConfig {
        minSdkVersion 23
        targetSdkVersion 34
        versionCode 1
        versionName "1.0"
    }
    lintOptions {
        abortOnError false
    }
    sourceSets {
        main {
            aidl.srcDirs = ['src/main/java']
        }
    }
}

repositories {
    google()
    mavenCentral()
}

dependencies {
    implementation fileTree(dir: 'libs', include: ['*.jar'])
    implementation 'com.facebook.react:react-native:+'
    implementation 'androidx.core:core:1.12.0'
    implementation "com.google.zxing:core:3.3.0"
}
`;
fs.writeFileSync(gradleFile, newGradle);
console.log('✓ Patched build.gradle');

// ─── 2. Patch Java source ─────────────────────────────────────────────────────
const javaFile = path.join(
  btDir, 'android', 'src', 'main', 'java',
  'cn', 'jystudio', 'bluetooth', 'RNBluetoothManagerModule.java'
);

if (fs.existsSync(javaFile)) {
  let java = fs.readFileSync(javaFile, 'utf8');

  // 2a. Migrate android.support.* → androidx.*
  java = java.replace(
    'import android.support.v4.app.ActivityCompat;',
    'import androidx.core.app.ActivityCompat;'
  );
  java = java.replace(
    'import android.support.v4.content.ContextCompat;',
    'import androidx.core.content.ContextCompat;'
  );
  console.log('✓ Patched Java imports (android.support → androidx)');

  // 2b. Fix scanDevices: when startDiscovery() fails, resolve with paired devices
  //     instead of rejecting with NOT_STARTED.
  //     Original:
  //       if (!adapter.startDiscovery()) {
  //           promise.reject("DISCOVER", "NOT_STARTED");
  //           cancelDisCovery();
  //       } else {
  //           promiseMap.put(PROMISE_SCAN, promise);
  //       }
  const oldScan = `if (!adapter.startDiscovery()) {
                promise.reject("DISCOVER", "NOT_STARTED");
                cancelDisCovery();
            } else {
                promiseMap.put(PROMISE_SCAN, promise);
            }`;

  const newScan = `if (!adapter.startDiscovery()) {
                // Discovery unavailable (location off or adapter busy).
                // Return the already-collected paired/bonded devices instead.
                WritableMap scanResult = Arguments.createMap();
                scanResult.putString("paired", pairedDeivce.toString());
                scanResult.putString("found", "[]");
                promise.resolve(scanResult);
            } else {
                promiseMap.put(PROMISE_SCAN, promise);
            }`;

  if (java.includes(oldScan)) {
    java = java.replace(oldScan, newScan);
    console.log('✓ Patched scanDevices (returns paired devices when discovery fails)');
  } else {
    // Fallback: try a simpler pattern match
    java = java.replace(
      'promise.reject("DISCOVER", "NOT_STARTED");',
      `WritableMap scanResult = Arguments.createMap();
                scanResult.putString("paired", pairedDeivce.toString());
                scanResult.putString("found", "[]");
                promise.resolve(scanResult);
                // was: promise.reject("DISCOVER", "NOT_STARTED");`
    );
    console.log('✓ Patched scanDevices (fallback pattern)');
  }

  fs.writeFileSync(javaFile, java);
}
