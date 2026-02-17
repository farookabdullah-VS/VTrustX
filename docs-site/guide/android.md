# Android Guide (Kotlin)

Complete guide for integrating VTrustX surveys in Android applications.

## Installation

**Step 1: Add repository** (project-level `settings.gradle.kts`)

```kotlin
repositories {
    maven { url = uri("https://maven.pkg.github.com/vtrustx/vtrustx") }
}
```

**Step 2: Add dependency** (app-level `build.gradle.kts`)

```kotlin
dependencies {
    implementation("com.vtrustx:sdk:1.0.0")
}
```

**Requirements:** Android SDK 21+ (Lollipop), Kotlin 1.8+, Jetpack Compose 1.4+

---

## Quick Start

```kotlin
import com.vtrustx.sdk.ui.SurveyView
import com.vtrustx.sdk.models.NativeSurveyDefinition

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            val definition = loadSurveyDefinition()
            VTrustXTheme {
                SurveyView(
                    definition = definition,
                    onComplete = { responses ->
                        Log.d("Survey", "Completed: $responses")
                    },
                    onCancel = { finish() }
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
        .url("https://api.example.com/api/forms/$surveyId")
        .build()

    return withContext(Dispatchers.IO) {
        val response = client.newCall(request).execute()
        val json = response.body?.string() ?: throw Exception("Empty response")
        Gson().fromJson(json, NativeSurveyDefinition::class.java)
    }
}
```

---

## Data Models

```kotlin
data class NativeSurveyDefinition(
    val id: String,
    val title: String,
    val description: String? = null,
    val screens: List<Screen>,
    val theme: Theme? = null
)

data class Screen(
    val id: String,
    val title: String? = null,
    val components: List<Component>,
    val navigation: NavigationRules? = null
)

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
    TEXT, MULTILINE_TEXT, NUMBER, RATING, SLIDER,
    DROPDOWN, RADIO_GROUP, CHECKBOX_GROUP, BOOLEAN,
    DATE, TIME, DATE_TIME
}
```

---

## UI Components

### SurveyView

```kotlin
@Composable
fun SurveyView(
    definition: NativeSurveyDefinition,
    initialData: Map<String, Any> = emptyMap(),
    onComplete: (Map<String, Any>) -> Unit,
    onCancel: () -> Unit = {},
    modifier: Modifier = Modifier
)
```

### ComponentView

```kotlin
@Composable
fun ComponentView(
    component: Component,
    answer: Any?,
    onAnswerChange: (Any) -> Unit,
    modifier: Modifier = Modifier
) {
    when (component.type) {
        ComponentType.TEXT -> TextField(
            value = answer as? String ?: "",
            onValueChange = onAnswerChange,
            label = { Text(component.question) },
            modifier = modifier.fillMaxWidth()
        )
        ComponentType.RATING -> RatingBar(
            rating = answer as? Int ?: 0,
            onRatingChange = onAnswerChange,
            question = component.question
        )
        else -> { /* other types */ }
    }
}
```

---

## Survey Engine

```kotlin
import com.vtrustx.sdk.engine.SurveyEngine

val engine = SurveyEngine(definition)

// Validate a component
val isValid = engine.validateComponent(component, userInput)

// Validate a screen
val errors = engine.validateScreen(screen, answers)
if (errors.isNotEmpty()) {
    errors.forEach { (id, msg) -> Log.w("Validation", "$id: $msg") }
}

// Skip logic
val nextScreenId = engine.getNextScreen(currentScreenId = "screen-1", answers = answers)
if (nextScreenId != null) navigateToScreen(nextScreenId) else onComplete(answers)
```

---

## Theming

```kotlin
@Composable
fun VTrustXTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) {
        darkColorScheme(primary = Color(0xFF6200EE))
    } else {
        lightColorScheme(primary = Color(0xFF6200EE))
    }
    MaterialTheme(colorScheme = colorScheme, content = content)
}

// Custom branding
SurveyView(
    definition = definition,
    theme = SurveyTheme(primaryColor = Color(0xFF1976D2))
)
```

---

## Submit Responses

```kotlin
suspend fun submitSurvey(surveyId: String, responses: Map<String, Any>) {
    val json = JSONObject().apply {
        put("formId", surveyId)
        put("data", JSONObject(responses))
        put("metadata", JSONObject().apply {
            put("platform", "Android")
            put("appVersion", BuildConfig.VERSION_NAME)
        })
    }
    val body = json.toString().toRequestBody("application/json".toMediaType())
    val request = Request.Builder()
        .url("https://api.example.com/api/submissions")
        .post(body)
        .build()

    withContext(Dispatchers.IO) {
        val response = OkHttpClient().newCall(request).execute()
        if (!response.isSuccessful) throw IOException("HTTP ${response.code}")
    }
}
```

---

## Media Capture

### Camera

Add to `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.CAMERA" />
```

```kotlin
@Composable
fun PhotoCaptureComponent() {
    var imageUri by remember { mutableStateOf<Uri?>(null) }
    val launcher = rememberLauncherForActivityResult(
        ActivityResultContracts.TakePicture()
    ) { success -> if (success) Log.d("Photo", "Captured: $imageUri") }

    Button(onClick = {
        val uri = context.createImageUri()
        imageUri = uri
        launcher.launch(uri)
    }) { Text("Take Photo") }
}
```

### Audio

```kotlin
class AudioRecorder(private val context: Context) {
    private var mediaRecorder: MediaRecorder? = null

    fun startRecording(): String {
        val outputFile = "${context.externalCacheDir}/recording_${System.currentTimeMillis()}.m4a"
        mediaRecorder = MediaRecorder().apply {
            setAudioSource(MediaRecorder.AudioSource.MIC)
            setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
            setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
            setOutputFile(outputFile)
            prepare()
            start()
        }
        return outputFile
    }

    fun stopRecording() { mediaRecorder?.stop(); mediaRecorder?.release(); mediaRecorder = null }
}
```

---

## Offline Support (Room)

```kotlin
@Entity(tableName = "pending_submissions")
data class PendingSubmission(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val surveyId: String,
    val responses: String, // JSON
    val timestamp: Long,
    val synced: Boolean = false
)

suspend fun saveOffline(surveyId: String, responses: Map<String, Any>) {
    database.submissionDao().insert(
        PendingSubmission(
            surveyId = surveyId,
            responses = Gson().toJson(responses),
            timestamp = System.currentTimeMillis()
        )
    )
}
```

---

## ProGuard Rules

```proguard
-keep class com.vtrustx.sdk.** { *; }
-keepclassmembers class com.vtrustx.sdk.** { *; }
-keepattributes Signature
-keep class com.google.gson.** { *; }
```

---

## Testing

```kotlin
class SurveyEngineTest {
    @Test
    fun `validates required text field`() {
        val engine = SurveyEngine(testDefinition)
        val component = Component(id = "q1", type = ComponentType.TEXT, question = "Name?", required = true)
        assertTrue(engine.validateComponent(component, "John Doe"))
        assertFalse(engine.validateComponent(component, ""))
    }
}
```

---

## Support

- GitHub: https://github.com/vtrustx/vtrustx/issues
- Email: sdk@vtrustx.com
