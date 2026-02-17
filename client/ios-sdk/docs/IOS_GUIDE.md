# iOS SDK Guide

**Complete guide for integrating VTrustX surveys in iOS applications**

---

## 📦 Installation

### Swift Package Manager (Recommended)

**Option 1: Xcode UI**

1. Open your project in Xcode
2. File → Add Packages...
3. Enter the repository URL: `https://github.com/your-org/vtrustx-ios-sdk`
4. Select version and add to your target

**Option 2: Package.swift**

```swift
dependencies: [
    .package(url: "https://github.com/your-org/vtrustx-ios-sdk.git", from: "1.0.0")
]
```

### Requirements

- iOS 14.0+
- Xcode 13.0+
- Swift 5.5+

---

## 🚀 Quick Start

### Import SDK

```swift
import VTrustX
```

### Display a Survey

```swift
import SwiftUI
import VTrustX

struct ContentView: View {
    @State private var surveyDefinition: NativeSurveyDefinition?

    var body: some View {
        if let definition = surveyDefinition {
            SurveyView(
                definition: definition,
                onComplete: { responses in
                    print("Survey completed:", responses)
                    // Submit to server
                }
            )
        } else {
            ProgressView("Loading survey...")
                .onAppear(perform: loadSurvey)
        }
    }

    func loadSurvey() {
        // Load survey definition from API
        Task {
            do {
                let url = URL(string: "https://api.example.com/forms/123")!
                let (data, _) = try await URLSession.shared.data(from: url)
                surveyDefinition = try JSONDecoder().decode(NativeSurveyDefinition.self, from: data)
            } catch {
                print("Failed to load survey:", error)
            }
        }
    }
}
```

---

## 📋 Survey Models

### NativeSurveyDefinition

```swift
struct NativeSurveyDefinition: Codable {
    let id: String
    let title: String
    let description: String?
    let screens: [Screen]
    let theme: Theme?
}
```

### Screen

```swift
struct Screen: Codable {
    let id: String
    let title: String?
    let components: [Component]
    let navigation: NavigationRules?
}
```

### Component Types

```swift
enum ComponentType: String, Codable {
    case text
    case multilineText
    case number
    case rating
    case slider
    case dropdown
    case radioGroup
    case checkboxGroup
    case boolean
    case date
    case time
    case dateTime
}
```

---

## 🎨 UI Components

### SurveyView

Main survey container that handles screen navigation and logic.

```swift
SurveyView(
    definition: surveyDefinition,
    initialData: [:],  // Pre-filled answers
    onComplete: { responses in
        // Handle completion
    },
    onCancel: {
        // Handle cancellation
    }
)
```

### ScreenView

Displays a single screen with multiple components.

```swift
ScreenView(
    screen: screen,
    answers: binding,
    onNext: {
        // Next screen
    }
)
```

### ComponentView

Renders individual question components.

```swift
ComponentView(
    component: component,
    answer: binding
)
```

---

## 🧠 Logic Engine

### Skip Logic

```swift
let engine = LogicEngine(definition: surveyDefinition)

// Determine next screen based on answers
let nextScreenId = engine.getNextScreen(
    currentScreenId: "screen-1",
    answers: answers
)
```

### Validation

```swift
// Validate a single component
let isValid = engine.validateComponent(
    component: component,
    value: userInput
)

// Validate entire screen
let errors = engine.validateScreen(
    screen: screen,
    answers: answers
)
```

---

## 🎨 Theming

### Custom Theme

```swift
let theme = Theme(
    primaryColor: .blue,
    backgroundColor: .white,
    textColor: .black,
    buttonStyle: .rounded,
    fontFamily: "SF Pro"
)

SurveyView(definition: definition)
    .surveyTheme(theme)
```

### Built-in Themes

```swift
// Light theme
SurveyView(definition: definition)
    .surveyTheme(.light)

// Dark theme
SurveyView(definition: definition)
    .surveyTheme(.dark)

// Brand theme
SurveyView(definition: definition)
    .surveyTheme(.brand(primaryColor: .blue))
```

---

## 📊 Data Collection

### Capture Responses

```swift
SurveyView(definition: definition) { responses in
    // responses: [String: Any]
    let satisfaction = responses["satisfaction"] as? Int
    let feedback = responses["feedback"] as? String

    // Submit to server
    submitToServer(responses)
}
```

### Submit to API

```swift
func submitToServer(_ responses: [String: Any]) async throws {
    let url = URL(string: "https://api.example.com/submissions")!
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")

    let payload: [String: Any] = [
        "formId": "survey-123",
        "data": responses,
        "metadata": [
            "platform": "iOS",
            "appVersion": Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "unknown"
        ]
    ]

    request.httpBody = try JSONSerialization.data(withJSONObject: payload)

    let (_, response) = try await URLSession.shared.data(for: request)

    guard let httpResponse = response as? HTTPURLResponse,
          httpResponse.statusCode == 200 else {
        throw NSError(domain: "SubmissionError", code: -1)
    }
}
```

---

## 📸 Media Capture

### Photo Capture

```swift
import PhotosUI

struct PhotoCaptureView: View {
    @State private var selectedItem: PhotosPickerItem?
    @State private var selectedImage: UIImage?

    var body: some View {
        VStack {
            if let image = selectedImage {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFit()
            }

            PhotosPicker(
                selection: $selectedItem,
                matching: .images
            ) {
                Label("Select Photo", systemImage: "photo")
            }
            .onChange(of: selectedItem) { newItem in
                Task {
                    if let data = try? await newItem?.loadTransferable(type: Data.self),
                       let image = UIImage(data: data) {
                        selectedImage = image
                    }
                }
            }
        }
    }
}
```

### Audio Recording

```swift
import AVFoundation

class AudioRecorder: NSObject, ObservableObject {
    var audioRecorder: AVAudioRecorder?
    @Published var isRecording = false

    func startRecording() {
        let audioSession = AVAudioSession.sharedInstance()

        do {
            try audioSession.setCategory(.record, mode: .default)
            try audioSession.setActive(true)

            let settings = [
                AVFormatIDKey: Int(kAudioFormatMPEG4AAC),
                AVSampleRateKey: 12000,
                AVNumberOfChannelsKey: 1,
                AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue
            ]

            let audioFilename = getDocumentsDirectory().appendingPathComponent("recording.m4a")
            audioRecorder = try AVAudioRecorder(url: audioFilename, settings: settings)
            audioRecorder?.record()
            isRecording = true
        } catch {
            print("Failed to start recording:", error)
        }
    }

    func stopRecording() {
        audioRecorder?.stop()
        isRecording = false
    }

    func getDocumentsDirectory() -> URL {
        FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
    }
}
```

---

## 📍 Location Services

```swift
import CoreLocation

class LocationManager: NSObject, ObservableObject, CLLocationManagerDelegate {
    private let manager = CLLocationManager()
    @Published var location: CLLocation?

    override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyBest
    }

    func requestLocation() {
        manager.requestWhenInUseAuthorization()
        manager.requestLocation()
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        location = locations.first
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        print("Location error:", error)
    }
}

// Usage in survey
struct LocationCaptureSurvey: View {
    @StateObject private var locationManager = LocationManager()

    var body: some View {
        VStack {
            if let location = locationManager.location {
                Text("Lat: \(location.coordinate.latitude)")
                Text("Lon: \(location.coordinate.longitude)")
            }

            Button("Capture Location") {
                locationManager.requestLocation()
            }
        }
    }
}
```

**Info.plist Requirements:**

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>We need your location to provide context for your feedback.</string>

<key>NSCameraUsageDescription</key>
<string>We need camera access to capture photos for your feedback.</string>

<key>NSMicrophoneUsageDescription</key>
<string>We need microphone access to record audio feedback.</string>
```

---

## 💾 Offline Support

### Save Survey Locally

```swift
func saveSurveyLocally(responses: [String: Any], surveyId: String) {
    let submission = [
        "surveyId": surveyId,
        "responses": responses,
        "timestamp": ISO8601DateFormatter().string(from: Date()),
        "synced": false
    ] as [String : Any]

    var submissions = UserDefaults.standard.array(forKey: "pendingSubmissions") as? [[String: Any]] ?? []
    submissions.append(submission)
    UserDefaults.standard.set(submissions, forKey: "pendingSubmissions")
}

func syncPendingSubmissions() async {
    guard let submissions = UserDefaults.standard.array(forKey: "pendingSubmissions") as? [[String: Any]] else {
        return
    }

    for submission in submissions where submission["synced"] as? Bool == false {
        do {
            try await submitToServer(submission["responses"] as! [String: Any])
            // Mark as synced
        } catch {
            print("Sync failed:", error)
        }
    }
}
```

---

## 🧪 Testing

### Unit Tests

```swift
import XCTest
@testable import VTrustX

class LogicEngineTests: XCTestCase {
    var engine: LogicEngine!

    override func setUp() {
        let definition = NativeSurveyDefinition(
            id: "test",
            title: "Test Survey",
            screens: []
        )
        engine = LogicEngine(definition: definition)
    }

    func testValidation() {
        let component = Component(
            id: "q1",
            type: .text,
            question: "Name?",
            required: true
        )

        XCTAssertTrue(engine.validateComponent(component: component, value: "John"))
        XCTAssertFalse(engine.validateComponent(component: component, value: ""))
    }
}
```

### UI Tests

```swift
import XCTest

class SurveyUITests: XCTestCase {
    func testSurveyFlow() throws {
        let app = XCUIApplication()
        app.launch()

        // Fill first question
        let textField = app.textFields["nameField"]
        textField.tap()
        textField.typeText("John Doe")

        // Tap next
        app.buttons["Next"].tap()

        // Verify second screen
        XCTAssertTrue(app.staticTexts["Rate your experience"].exists)
    }
}
```

---

## 🚀 Performance Optimization

### Lazy Loading

```swift
struct OptimizedSurveyView: View {
    var body: some View {
        LazyVStack {
            ForEach(survey.screens) { screen in
                ScreenView(screen: screen)
            }
        }
    }
}
```

### Image Optimization

```swift
Image(uiImage: image)
    .resizable()
    .aspectRatio(contentMode: .fit)
    .frame(maxWidth: 300)
```

---

## 🔐 Security

### Secure Storage

```swift
import Security

func saveSecurely(key: String, value: String) {
    let query: [String: Any] = [
        kSecClass as String: kSecClassGenericPassword,
        kSecAttrAccount as String: key,
        kSecValueData as String: value.data(using: .utf8)!
    ]

    SecItemAdd(query as CFDictionary, nil)
}
```

---

## 📦 Example App

Check out our complete example app in `/examples/ios/BasicSurveyApp/`

---

## 📞 Support

- GitHub: https://github.com/your-org/vtrustx-ios-sdk
- Documentation: https://docs.vtrustx.com/ios
- Email: ios-sdk@vtrustx.com

---

**Last Updated**: February 17, 2026
