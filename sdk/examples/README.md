# VTrustX SDK Examples

**Complete collection of example applications and code snippets**

---

## 📁 Directory Structure

```
examples/
├── javascript/          # JavaScript/TypeScript examples
│   ├── vanilla/        # Pure JavaScript examples
│   ├── react/          # React integration
│   ├── node/           # Node.js backend integration
│   └── README.md
│
├── ios/                # iOS Swift examples
│   ├── BasicSurveyApp/
│   ├── EmbeddedSurvey/
│   └── README.md
│
└── android/            # Android Kotlin examples
    ├── BasicSurveyApp/
    ├── EmbeddedSurvey/
    └── README.md
```

---

## 🚀 Quick Start

### JavaScript Examples

```bash
cd examples/javascript/vanilla
npm install
npm start
```

### iOS Examples

```bash
cd examples/ios/BasicSurveyApp
open BasicSurveyApp.xcodeproj
```

### Android Examples

```bash
cd examples/android/BasicSurveyApp
./gradlew build
```

---

## 📚 Available Examples

### JavaScript/TypeScript

#### 1. Vanilla JavaScript Web App
**Path**: `javascript/vanilla/`

Simple HTML + JavaScript implementation showing:
- API client initialization
- Survey fetching and rendering
- Response submission
- Error handling

#### 2. React Application
**Path**: `javascript/react/`

React app demonstrating:
- Component-based architecture
- State management
- Form submission with hooks
- TypeScript integration

#### 3. Node.js Backend
**Path**: `javascript/node/`

Server-side integration showing:
- User management API
- Survey creation automation
- Response processing
- CRM ticket integration

### iOS Examples

#### 1. Basic Survey App
**Path**: `ios/BasicSurveyApp/`

Standalone iOS app featuring:
- Survey loading from API
- SwiftUI native rendering
- Offline response storage
- Photo/audio capture

#### 2. Embedded Survey
**Path**: `ios/EmbeddedSurvey/`

Integration example showing:
- Embedding surveys in existing app
- Custom theming
- Deep linking
- Analytics integration

### Android Examples

#### 1. Basic Survey App
**Path**: `android/BasicSurveyApp/`

Standalone Android app featuring:
- Survey loading from API
- Jetpack Compose rendering
- Room database for offline
- Media capture

#### 2. Embedded Survey
**Path**: `android/EmbeddedSurvey/`

Integration example showing:
- Embedding in existing app
- Material Design 3 theming
- Navigation component
- WorkManager for sync

---

## 📖 Example Walkthroughs

### Example 1: Simple Web Survey

**File**: `javascript/vanilla/index.html`

```html
<!DOCTYPE html>
<html>
<head>
    <title>VTrustX Survey</title>
    <script src="https://cdn.jsdelivr.net/npm/@vtrustx/sdk"></script>
</head>
<body>
    <div id="survey-container"></div>

    <script>
        const client = new VTrustXClient('https://api.example.com/api');

        async function loadSurvey() {
            const survey = await client.forms.getBySlug('nps-2026');
            // Render survey using SurveyJS or custom renderer
        }

        loadSurvey();
    </script>
</body>
</html>
```

### Example 2: iOS SwiftUI Survey

**File**: `ios/BasicSurveyApp/ContentView.swift`

```swift
import SwiftUI
import VTrustX

struct ContentView: View {
    @State private var survey: NativeSurveyDefinition?

    var body: some View {
        if let survey = survey {
            SurveyView(definition: survey) { responses in
                print("Survey completed:", responses)
            }
        } else {
            ProgressView("Loading...")
                .onAppear { loadSurvey() }
        }
    }

    func loadSurvey() {
        Task {
            // Load from API
            self.survey = try await fetchSurvey()
        }
    }
}
```

### Example 3: Android Compose Survey

**File**: `android/BasicSurveyApp/MainActivity.kt`

```kotlin
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        setContent {
            val surveyState = remember { mutableStateOf<NativeSurveyDefinition?>(null) }

            LaunchedEffect(Unit) {
                surveyState.value = loadSurvey()
            }

            surveyState.value?.let { survey ->
                SurveyView(
                    definition = survey,
                    onComplete = { responses ->
                        Toast.makeText(this, "Survey submitted!", Toast.LENGTH_SHORT).show()
                    }
                )
            }
        }
    }
}
```

---

## 🔧 Common Patterns

### Pattern 1: Authentication

**JavaScript:**
```javascript
await client.auth.login('user@example.com', 'password');
```

**iOS:**
```swift
try await authManager.login(email: "user@example.com", password: "password")
```

**Android:**
```kotlin
authManager.login("user@example.com", "password")
```

### Pattern 2: Error Handling

**JavaScript:**
```javascript
try {
    await client.forms.submit(surveyId, data);
} catch (error) {
    if (error.response?.status === 401) {
        // Re-authenticate
    }
}
```

**iOS:**
```swift
do {
    try await submitSurvey(id: surveyId, data: data)
} catch let error as APIError {
    handleError(error)
}
```

**Android:**
```kotlin
try {
    submitSurvey(surveyId, data)
} catch (e: UnauthorizedException) {
    // Re-authenticate
}
```

### Pattern 3: Offline Sync

**JavaScript:**
```javascript
if (!navigator.onLine) {
    await saveOffline(surveyId, responses);
} else {
    await client.forms.submit(surveyId, responses);
}
```

**iOS:**
```swift
if Reachability.isConnectedToNetwork() {
    try await submitSurvey(data)
} else {
    saveLocally(data)
}
```

**Android:**
```kotlin
if (isNetworkAvailable()) {
    submitSurvey(data)
} else {
    saveToDatabase(data)
}
```

---

## 🎓 Learning Path

### Beginner
1. Start with vanilla JavaScript example
2. Run basic iOS/Android apps
3. Understand API authentication
4. Learn survey structure

### Intermediate
5. React integration example
6. Custom theming
7. Offline support
8. Media capture

### Advanced
9. Node.js automation
10. Custom logic engines
11. Analytics integration
12. Performance optimization

---

## 🧪 Testing Examples

All examples include:
- Unit tests for business logic
- Integration tests for API calls
- UI tests for user flows
- Mock data for offline testing

---

## 📞 Need Help?

- Documentation: https://docs.vtrustx.com
- GitHub Issues: https://github.com/your-org/vtrustx/issues
- Community Forum: https://community.vtrustx.com

---

## 🤝 Contributing

Have a great example to share? Submit a pull request!

1. Fork the repository
2. Create example in appropriate directory
3. Add README with clear instructions
4. Submit PR with description

---

**Last Updated**: February 17, 2026
