# Getting Started

VTrustX provides native SDKs for three platforms and a REST API you can call from any environment.

## SDK Components

| Platform | Package | Minimum OS |
|----------|---------|------------|
| JavaScript / TypeScript | `@vtrustx/sdk` (npm) | Node.js 16+ / modern browsers |
| iOS Swift | `VTrustX` (SPM / CocoaPods) | iOS 14.0+ |
| Android Kotlin | `com.vtrustx:sdk` (Maven) | Android 21+ (Lollipop) |

---

## Quick Install

### JavaScript / TypeScript

```bash
npm install @vtrustx/sdk
```

```typescript
import { VTrustXClient } from '@vtrustx/sdk';

const client = new VTrustXClient('https://your-server.com/api');
await client.auth.login('admin@company.com', 'password');

const surveys = await client.forms.list();
console.log(surveys);
```

### iOS — Swift Package Manager

Add to your `Package.swift`:

```swift
dependencies: [
    .package(url: "https://github.com/vtrustx/vtrustx.git", from: "1.0.0")
]
```

### iOS — CocoaPods

```ruby
pod 'VTrustX', '~> 1.0'
```

### Android — Gradle

```kotlin
dependencies {
    implementation("com.vtrustx:sdk:1.0.0")
}
```

---

## Authentication

All requests to the VTrustX REST API are authenticated via **httpOnly cookie** (access token, 15-minute lifetime) and a rotating refresh token. The SDKs handle token management automatically.

### Credential flow

1. Call `POST /api/auth/login` — server sets `access_token` and `refresh_token` cookies.
2. Include cookies on every subsequent request (automatic in browsers; use a cookie jar in Node.js).
3. When the access token expires, call `POST /api/auth/refresh` — both tokens are rotated.
4. Call `POST /api/auth/logout` to revoke the refresh token and clear cookies.

### OAuth (Google / Microsoft)

Redirect users to `/api/auth/google` or `/api/auth/microsoft` to initiate the OAuth2 flow. After consent, the server issues tokens and redirects to `/login?oauth=success`.

---

## Next Steps

- [JavaScript / TypeScript Guide](/guide/javascript) — full API reference for the JS SDK
- [iOS Guide](/guide/ios) — SwiftUI components, logic engine, and media capture
- [Android Guide](/guide/android) — Jetpack Compose components and offline support
- [REST API Reference](/api/reference) — explore all endpoints in Swagger UI
