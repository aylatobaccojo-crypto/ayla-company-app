#!/usr/bin/env node
/**
 * Patches react-native-bluetooth-escpos-printer build.gradle
 * The library uses JCenter which was shut down in 2021
 * This replaces it with google() + mavenCentral() and updates SDK versions
 */
const fs = require('fs');
const path = require('path');

const gradleFile = path.join(
  __dirname, '..', 'node_modules',
  'react-native-bluetooth-escpos-printer', 'android', 'build.gradle'
);

if (!fs.existsSync(gradleFile)) {
  console.log('ℹ react-native-bluetooth-escpos-printer not found, skipping patch');
  process.exit(0);
}

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
    implementation "com.google.zxing:core:3.3.0"
}
`;

fs.writeFileSync(gradleFile, newGradle);
console.log('✓ Patched react-native-bluetooth-escpos-printer/android/build.gradle');
console.log('  - Removed JCenter (shut down 2021)');
console.log('  - Removed buildscript block (main project handles this)');
console.log('  - Updated compileSdkVersion: 27 → 34');
console.log('  - Updated targetSdkVersion: 24 → 34');
