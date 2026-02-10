# Native Mobile SDK Requirements (iOS & Android)

## Overview
A fully native SDK for iOS (Swift/Obj-C) and Android (Kotlin/Java) to enable in-app survey delivery without WebViews.

## Core Requirements

### 1. Native Rendering
- **No WebViews**: All UI components must be rendered using native platform UI kits (UIKit/SwiftUI for iOS, View/Jetpack Compose for Android).
- **Performance**: High frame rate (60fps), native touch response, and offline capability.

### 2. Design System & White-labeling
- **Strict Adherence**: Must support exact matching of Figma designs (Typography, Spacing, Colors, Radius, Shadows).
- **Theming Engine**: 
  - Token-based theming (Color tokens, Typography tokens).
  - Support for Light/Dark modes.
  - Runtime configuration of theme (JSON/Remote config).

### 3. Survey Features
- Support all VTrustX question types (Rating, NPS, Text, Choice, etc.).
- Logic Engine: Native implementation of survey logic (skip logic, branching) running on-device.
- Validation: Native input validation.

### 4. Integration
- **Distribution**: CocoaPods/SPM (iOS), Maven Central (Android).
- **Initialization**: Simple API key authentication.
- **Callbacks**: Events for `onSurveyStart`, `onSurveyComplete`, `onSurveyDismiss`.

### 5. Data Privacy
- Secure storage of pending submissions (offline mode).
- GDPR/Compliance headers in API requests.

## Roadmap
- [ ] Phase 1: Define JSON Schema for Native Rendering.
- [ ] Phase 2: Build iOS Core & UI Components.
- [ ] Phase 3: Build Android Core & UI Components.
- [ ] Phase 4: SDK Documentation & Example Apps.
