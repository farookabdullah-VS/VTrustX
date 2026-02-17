# Android SDK Guide

**Complete guide for integrating VTrustX surveys in Android applications**

---

## 📦 Installation

### Gradle

**Step 1: Add repository** (project-level `build.gradle` or `settings.gradle.kts`)

```kotlin
repositories {
    maven { url = uri("https://maven.vtrustx.com/releases") }
}
```

**Step 2: Add dependency** (app-level `build.gradle.kts`)

```kotlin
dependencies {
    implementation("com.vtrustx:sdk:1.0.0")
}
```

### Requirements

- Android SDK 21+ (Lollipop)
- Kotlin 1.8+
- Jetpack Compose 1.4+

---

## 🚀 Quick Start

### Basic Setup

```kotlin
import com.vtrustx.sdk.ui.SurveyView
import com.vtrustx.sdk.models.NativeSurveyDefinition

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        setContent {
            val surveyDefinition = loadSurveyDefinition()

            VTrustXTheme {
                SurveyView(
                    definition = surveyDefinition,
                    onComplete = { responses ->
                        // Handle completion
                        Log.d("Survey", "Completed: $responses")
                    },
                    onCancel = {
                        // Handle cancellation
                        finish()
                    }
                )
            }
        }
    }
}
```

### Load Survey from API

```kotlin
suspend fun loadSurveyFromApi(surveyId: String): NativeSurveyDefinition {
    val client = OkHttpClient()
    val request = Request.Builder()
        .url("https://api.example.com/forms/$surveyId")
        .build()

    return withContext(Dispatchers.IO) {
        val response = client.newCall(request).execute()
        val json = response.body?.string() ?: throw Exception("Empty response")

        Gson().fromJson(json, NativeSurveyDefinition::class.java)
    }
}

// Usage
lifecycleScope.launch {
    try {
        val definition = loadSurveyFromApi("survey-123")
        // Use definition
    } catch (e: Exception) {
        Log.e("Survey", "Failed to load", e)
    }
}
```

---

## 📋 Data Models

### NativeSurveyDefinition

```kotlin
data class NativeSurveyDefinition(
    val id: String,
    val title: String,
    val description: String? = null,
    val screens: List<Screen>,
    val theme: Theme? = null
)
```

### Screen

```kotlin
data class Screen(
    val id: String,
    val title: String? = null,
    val components: List<Component>,
    val navigation: NavigationRules? = null
)
```

### Component

```kotlin
data class Component(
    val id: String,
    val type: ComponentType,
    val question: String,
    val required: Boolean = false,
    val validation: ValidationRules? = null,
    val choices: List<String>? = null,
    val placeholder: String? = null
)

enum class ComponentType {
    TEXT,
    MULTILINE_TEXT,
    NUMBER,
    RATING,
    SLIDER,
    DROPDOWN,
    RADIO_GROUP,
    CHECKBOX_GROUP,
    BOOLEAN,
    DATE,
    TIME,
    DATE_TIME
}
```

---

## 🎨 UI Components

### SurveyView

Main composable for rendering entire survey.

```kotlin
@Composable
fun SurveyView(
    definition: NativeSurveyDefinition,
    initialData: Map<String, Any> = emptyMap(),
    onComplete: (Map<String, Any>) -> Unit,
    onCancel: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    // Survey implementation
}
```

### ScreenView

Displays a single screen with components.

```kotlin
@Composable
fun ScreenView(
    screen: Screen,
    answers: MutableMap<String, Any>,
    onNext: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(modifier = modifier.padding(16.dp)) {
        screen.components.forEach { component ->
            ComponentView(
                component = component,
                answer = answers[component.id],
                onAnswerChange = { newValue ->
                    answers[component.id] = newValue
                }
            )
        }

        Button(
            onClick = onNext,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Next")
        }
    }
}
```

### ComponentView

Renders individual question components.

```kotlin
@Composable
fun ComponentView(
    component: Component,
    answer: Any?,
    onAnswerChange: (Any) -> Unit,
    modifier: Modifier = Modifier
) {
    when (component.type) {
        ComponentType.TEXT -> {
            TextField(
                value = answer as? String ?: "",
                onValueChange = onAnswerChange,
                label = { Text(component.question) },
                modifier = modifier.fillMaxWidth()
            )
        }
        ComponentType.RATING -> {
            RatingBar(
                rating = answer as? Int ?: 0,
                onRatingChange = onAnswerChange,
                question = component.question
            )
        }
        // ... other types
    }
}
```

---

## 🧠 Survey Engine

### Validation

```kotlin
import com.vtrustx.sdk.engine.SurveyEngine

val engine = SurveyEngine(definition)

// Validate component
val isValid = engine.validateComponent(component, userInput)

// Validate entire screen
val errors = engine.validateScreen(screen, answers)

if (errors.isNotEmpty()) {
    // Show error messages
    errors.forEach { (componentId, errorMessage) ->
        Log.w("Validation", "$componentId: $errorMessage")
    }
}
```

### Skip Logic

```kotlin
// Determine next screen based on answers
val nextScreenId = engine.getNextScreen(
    currentScreenId = "screen-1",
    answers = answers
)

if (nextScreenId != null) {
    navigateToScreen(nextScreenId)
} else {
    // Survey complete
    onComplete(answers)
}
```

---

## 🎨 Theming

### Material 3 Theme

```kotlin
@Composable
fun VTrustXTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) {
        darkColorScheme(
            primary = Color(0xFF6200EE),
            secondary = Color(0xFF03DAC6),
            background = Color(0xFF121212)
        )
    } else {
        lightColorScheme(
            primary = Color(0xFF6200EE),
            secondary = Color(0xFF03DAC6),
            background = Color(0xFFFFFFFF)
        )
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
```

### Custom Branding

```kotlin
data class SurveyTheme(
    val primaryColor: Color = Color(0xFF6200EE),
    val backgroundColor: Color = Color.White,
    val textColor: Color = Color.Black,
    val buttonStyle: ButtonStyle = ButtonStyle.ROUNDED
)

// Apply theme
SurveyView(
    definition = definition,
    theme = SurveyTheme(
        primaryColor = Color(0xFF1976D2),
        buttonStyle = ButtonStyle.ROUNDED
    )
)
```

---

## 📊 Data Collection

### Submit to Server

```kotlin
suspend fun submitSurvey(surveyId: String, responses: Map<String, Any>) {
    val client = OkHttpClient()

    val json = JSONObject().apply {
        put("formId", surveyId)
        put("data", JSONObject(responses))
        put("metadata", JSONObject().apply {
            put("platform", "Android")
            put("appVersion", BuildConfig.VERSION_NAME)
            put("deviceModel", Build.MODEL)
        })
    }

    val body = json.toString().toRequestBody("application/json".toMediaType())

    val request = Request.Builder()
        .url("https://api.example.com/submissions")
        .post(body)
        .build()

    withContext(Dispatchers.IO) {
        val response = client.newCall(request).execute()
        if (!response.isSuccessful) {
            throw IOException("Submission failed: ${response.code}")
        }
    }
}

// Usage
SurveyView(
    definition = definition,
    onComplete = { responses ->
        lifecycleScope.launch {
            try {
                submitSurvey("survey-123", responses)
                Toast.makeText(context, "Survey submitted!", Toast.LENGTH_SHORT).show()
            } catch (e: Exception) {
                Log.e("Survey", "Submission failed", e)
                Toast.makeText(context, "Failed to submit", Toast.LENGTH_SHORT).show()
            }
        }
    }
)
```

---

## 📸 Media Capture

### Camera Photo

```kotlin
@Composable
fun PhotoCaptureComponent() {
    var imageUri by remember { mutableStateOf<Uri?>(null) }

    val launcher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.TakePicture()
    ) { success ->
        if (success) {
            Log.d("Photo", "Captured: $imageUri")
        }
    }

    Button(onClick = {
        val uri = createImageUri()
        imageUri = uri
        launcher.launch(uri)
    }) {
        Text("Take Photo")
    }

    imageUri?.let { uri ->
        AsyncImage(
            model = uri,
            contentDescription = "Captured photo",
            modifier = Modifier.size(200.dp)
        )
    }
}

fun Context.createImageUri(): Uri {
    val image = File(filesDir, "camera_photo_${System.currentTimeMillis()}.jpg")
    return FileProvider.getUriForFile(
        this,
        "${packageName}.fileprovider",
        image
    )
}
```

**AndroidManifest.xml:**

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-feature android:name="android.hardware.camera" android:required="false" />

<application>
    <provider
        android:name="androidx.core.content.FileProvider"
        android:authorities="${applicationId}.fileprovider"
        android:exported="false"
        android:grantUriPermissions="true">
        <meta-data
            android:name="android.support.FILE_PROVIDER_PATHS"
            android:resource="@xml/file_paths" />
    </provider>
</application>
```

### Audio Recording

```kotlin
class AudioRecorder(private val context: Context) {
    private var mediaRecorder: MediaRecorder? = null
    private var outputFile: String = ""

    fun startRecording() {
        outputFile = "${context.externalCacheDir?.absolutePath}/recording_${System.currentTimeMillis()}.m4a"

        mediaRecorder = MediaRecorder().apply {
            setAudioSource(MediaRecorder.AudioSource.MIC)
            setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
            setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
            setOutputFile(outputFile)
            prepare()
            start()
        }
    }

    fun stopRecording(): String {
        mediaRecorder?.apply {
            stop()
            release()
        }
        mediaRecorder = null
        return outputFile
    }
}
```

---

## 📍 Location Services

```kotlin
@Composable
fun LocationCapture(
    onLocationCaptured: (Location) -> Unit
) {
    val context = LocalContext.current
    val fusedLocationClient = remember {
        LocationServices.getFusedLocationProviderClient(context)
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        if (isGranted) {
            captureLocation(fusedLocationClient, onLocationCaptured)
        }
    }

    Button(onClick = {
        permissionLauncher.launch(Manifest.permission.ACCESS_FINE_LOCATION)
    }) {
        Text("Capture Location")
    }
}

@SuppressLint("MissingPermission")
private fun captureLocation(
    client: FusedLocationProviderClient,
    onLocation: (Location) -> Unit
) {
    client.lastLocation.addOnSuccessListener { location ->
        location?.let { onLocation(it) }
    }
}
```

**AndroidManifest.xml:**

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
```

---

## 💾 Offline Support

### Save Locally with Room

```kotlin
@Entity(tableName = "pending_submissions")
data class PendingSubmission(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val surveyId: String,
    val responses: String, // JSON
    val timestamp: Long,
    val synced: Boolean = false
)

@Dao
interface SubmissionDao {
    @Insert
    suspend fun insert(submission: PendingSubmission)

    @Query("SELECT * FROM pending_submissions WHERE synced = 0")
    suspend fun getPendingSubmissions(): List<PendingSubmission>

    @Update
    suspend fun update(submission: PendingSubmission)
}

// Usage
suspend fun saveOffline(surveyId: String, responses: Map<String, Any>) {
    val submission = PendingSubmission(
        surveyId = surveyId,
        responses = Gson().toJson(responses),
        timestamp = System.currentTimeMillis()
    )
    database.submissionDao().insert(submission)
}

suspend fun syncPendingSubmissions() {
    val pending = database.submissionDao().getPendingSubmissions()

    pending.forEach { submission ->
        try {
            val responses = Gson().fromJson(submission.responses, Map::class.java)
            submitSurvey(submission.surveyId, responses as Map<String, Any>)

            database.submissionDao().update(submission.copy(synced = true))
        } catch (e: Exception) {
            Log.e("Sync", "Failed to sync submission", e)
        }
    }
}
```

---

## 🧪 Testing

### Unit Tests

```kotlin
class SurveyEngineTest {
    private lateinit var engine: SurveyEngine

    @Before
    fun setup() {
        val definition = NativeSurveyDefinition(
            id = "test",
            title = "Test Survey",
            screens = emptyList()
        )
        engine = SurveyEngine(definition)
    }

    @Test
    fun `validates required text field`() {
        val component = Component(
            id = "q1",
            type = ComponentType.TEXT,
            question = "Name?",
            required = true
        )

        assertTrue(engine.validateComponent(component, "John Doe"))
        assertFalse(engine.validateComponent(component, ""))
    }
}
```

### UI Tests

```kotlin
@RunWith(AndroidJUnit4::class)
class SurveyUITest {
    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun surveyFlow_completesSuccessfully() {
        composeTestRule.setContent {
            SurveyView(
                definition = testDefinition,
                onComplete = { responses ->
                    // Verify responses
                }
            )
        }

        // Fill first question
        composeTestRule.onNodeWithText("What is your name?").performTextInput("John Doe")

        // Click next
        composeTestRule.onNodeWithText("Next").performClick()

        // Verify second screen
        composeTestRule.onNodeWithText("Rate your experience").assertIsDisplayed()
    }
}
```

---

## 🚀 Performance Optimization

### LazyColumn for Long Surveys

```kotlin
@Composable
fun OptimizedSurveyView(screens: List<Screen>) {
    LazyColumn {
        items(screens) { screen ->
            ScreenView(screen = screen)
        }
    }
}
```

### Image Loading with Coil

```kotlin
dependencies {
    implementation("io.coil-kt:coil-compose:2.4.0")
}

@Composable
fun OptimizedImage(url: String) {
    AsyncImage(
        model = ImageRequest.Builder(LocalContext.current)
            .data(url)
            .crossfade(true)
            .build(),
        contentDescription = null,
        modifier = Modifier.size(200.dp)
    )
}
```

---

## 📦 ProGuard Rules

```proguard
# VTrustX SDK
-keep class com.vtrustx.sdk.** { *; }
-keepclassmembers class com.vtrustx.sdk.** { *; }

# Gson
-keepattributes Signature
-keepattributes *Annotation*
-keep class com.google.gson.** { *; }
```

---

## 📦 Example App

Check out complete example in `/examples/android/BasicSurveyApp/`

---

## 📞 Support

- GitHub: https://github.com/your-org/vtrustx-android-sdk
- Documentation: https://docs.vtrustx.com/android
- Email: android-sdk@vtrustx.com

---

**Last Updated**: February 17, 2026
