#!/usr/bin/env node
/**
 * Patches react-native-bluetooth-escpos-printer for compatibility with RN 0.81:
 * 1. Fixes build.gradle: removes JCenter (shut down 2021), updates SDK versions
 * 2. Fixes Java source: migrates android.support.* → androidx.*
 */
const fs = require('fs');
const path = require('path');
const btDir = path.join(__dirname, '..', 'node_modules', 'react-native-bluetooth-escpos-printer');

if (!fs.existsSync(btDir)) {
  console.log('ℹ react-native-bluetooth-escpos-printer not found, skipping patch');
  process.exit(0);
}

// 1. Patch build.gradle
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
console.log('✓ Patched build.gradle (removed JCenter, updated SDK, added androidx.core)');

// 2. Patch Java source: android.support.v4 → androidx
const javaFile = path.join(btDir, 'android', 'src', 'main', 'java', 'cn', 'jystudio', 'bluetooth', 'RNBluetoothManagerModule.java');
if (fs.existsSync(javaFile)) {
  let java = fs.readFileSync(javaFile, 'utf8');
  java = java.replace('import android.support.v4.app.ActivityCompat;', 'import androidx.core.app.ActivityCompat;');
  java = java.replace('import android.support.v4.content.ContextCompat;', 'import androidx.core.content.ContextCompat;');
  fs.writeFileSync(javaFile, java);
  console.log('✓ Patched RNBluetoothManagerModule.java (android.support → androidx)');
}
