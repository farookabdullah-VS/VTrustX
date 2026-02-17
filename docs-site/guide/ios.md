# iOS Guide (Swift)

Complete guide for integrating VTrustX surveys in iOS applications.

## Installation

### Swift Package Manager (Recommended)

**Option 1: Xcode UI**

1. Open your project in Xcode
2. File → Add Packages...
3. Enter the repository URL: `https://github.com/vtrustx/vtrustx`
4. Select version `1.0.0` and add to your target

**Option 2: Package.swift**

```swift
dependencies: [
    .package(url: "https://github.com/vtrustx/vtrustx.git", from: "1.0.0")
]
```

### CocoaPods

```ruby
pod 'VTrustX', '~> 1.0'
```

**Requirements:** iOS 14.0+, Xcode 13.0+, Swift 5.5+

---

## Quick Start

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
                    print("Completed:", responses)
                }
            )
        } else {
            ProgressView("Loading survey...")
                .onAppear(perform: loadSurvey)
        }
    }

    func loadSurvey() {
        Task {
            do {
                let url = URL(string: "https://api.example.com/forms/slug/my-survey")!
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

## Survey Models

```swift
struct NativeSurveyDefinition: Codable {
    let id: String
    let title: String
    let description: String?
    let screens: [Screen]
    let theme: Theme?
}

struct Screen: Codable {
    let id: String
    let title: String?
    let components: [Component]
    let navigation: NavigationRules?
}

enum ComponentType: String, Codable {
    case text, multilineText, number, rating, slider
    case dropdown, radioGroup, checkboxGroup, boolean
    case date, time, dateTime
}
```

---

## UI Components

### SurveyView

```swift
SurveyView(
    definition: surveyDefinition,
    initialData: [:],
    onComplete: { responses in
        // Handle completion
    },
    onCancel: {
        // Handle cancellation
    }
)
```

### Theming

```swift
// Light / Dark
SurveyView(definition: definition).surveyTheme(.light)
SurveyView(definition: definition).surveyTheme(.dark)

// Custom theme
let theme = Theme(
    primaryColor: .blue,
    backgroundColor: .white,
    textColor: .black,
    buttonStyle: .rounded,
    fontFamily: "SF Pro"
)
SurveyView(definition: definition).surveyTheme(theme)
```

---

## Logic Engine

```swift
let engine = LogicEngine(definition: surveyDefinition)

// Skip logic
let nextScreenId = engine.getNextScreen(
    currentScreenId: "screen-1",
    answers: answers
)

// Validate a component
let isValid = engine.validateComponent(component: component, value: userInput)

// Validate an entire screen
let errors = engine.validateScreen(screen: screen, answers: answers)
```

---

## Submit Responses

```swift
func submitToServer(_ responses: [String: Any]) async throws {
    let url = URL(string: "https://api.example.com/api/submissions")!
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

    guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
        throw NSError(domain: "SubmissionError", code: -1)
    }
}
```

---

## Media Capture

### Info.plist Permissions

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>We need your location to provide context for your feedback.</string>
<key>NSCameraUsageDescription</key>
<string>We need camera access to capture photos for your feedback.</string>
<key>NSMicrophoneUsageDescription</key>
<string>We need microphone access to record audio feedback.</string>
```

### Audio Recording

```swift
import AVFoundation

class AudioRecorder: NSObject, ObservableObject {
    var audioRecorder: AVAudioRecorder?
    @Published var isRecording = false

    func startRecording() {
        let settings = [
            AVFormatIDKey: Int(kAudioFormatMPEG4AAC),
            AVSampleRateKey: 12000,
            AVNumberOfChannelsKey: 1,
            AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue
        ]
        let audioFilename = FileManager.default
            .urls(for: .documentDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("recording.m4a")

        try? AVAudioSession.sharedInstance().setCategory(.record, mode: .default)
        try? AVAudioSession.sharedInstance().setActive(true)
        audioRecorder = try? AVAudioRecorder(url: audioFilename, settings: settings)
        audioRecorder?.record()
        isRecording = true
    }

    func stopRecording() {
        audioRecorder?.stop()
        isRecording = false
    }
}
```

---

## Offline Support

```swift
func saveSurveyLocally(responses: [String: Any], surveyId: String) {
    var pending = UserDefaults.standard.array(forKey: "pendingSubmissions") as? [[String: Any]] ?? []
    pending.append([
        "surveyId": surveyId,
        "responses": responses,
        "timestamp": ISO8601DateFormatter().string(from: Date()),
        "synced": false
    ])
    UserDefaults.standard.set(pending, forKey: "pendingSubmissions")
}
```

---

## Testing

```swift
import XCTest
@testable import VTrustX

class LogicEngineTests: XCTestCase {
    func testRequiredValidation() {
        let component = Component(id: "q1", type: .text, question: "Name?", required: true)
        let engine = LogicEngine(definition: testDefinition)

        XCTAssertTrue(engine.validateComponent(component: component, value: "John"))
        XCTAssertFalse(engine.validateComponent(component: component, value: ""))
    }
}
```

---

## Support

- GitHub: https://github.com/vtrustx/vtrustx/issues
- Email: sdk@vtrustx.com
