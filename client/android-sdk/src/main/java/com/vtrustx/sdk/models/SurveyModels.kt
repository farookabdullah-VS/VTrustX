
package com.vtrustx.sdk.models

import com.google.gson.annotations.SerializedName

data class NativeSurveyDefinition(
    val id: String,
    val title: String,
    val description: String?,
    val theme: SurveyTheme,
    val screens: List<SurveyScreen>,
    val logic: List<LogicRule>?
)

data class SurveyTheme(
    @SerializedName("primaryColor") val primaryColor: String,
    @SerializedName("backgroundColor") val backgroundColor: String,
    val typography: String?,
    val borderRadius: Double?,
    val darkMode: Boolean?
)

data class SurveyScreen(
    val id: String,
    val title: String?,
    val components: List<SurveyComponent>
)

data class SurveyComponent(
    val id: String,
    val type: String,
    val label: String,
    val required: Boolean?,
    val options: List<ChoiceOption>?,
    val min: Double?,
    val max: Double?,
    val step: Double?,
    val placeholder: String?
)

data class ChoiceOption(
    val value: String,
    val label: String
)

data class LogicRule(
    val trigger: LogicTrigger,
    val action: String,
    val target: String
)

data class LogicTrigger(
    val questionId: String,
    @SerializedName("operator") val operatorType: String,
    val value: Any // Requires custom deserializer or wrapper in GSON/Moshi
)

// ─── API Response Models ───────────────────────────────────────────────────────

data class AuthResponse(
    val user: ApiUser,
    val token: String?
)

data class ApiUser(
    val id: String,
    val username: String,
    val email: String?,
    val role: String,
    @SerializedName("tenant_id") val tenantId: String,
    val status: String
)

data class ApiError(
    val error: String,
    val code: Int?
)

data class ApiForm(
    val id: String,
    val slug: String,
    val title: String,
    val definition: NativeSurveyDefinition?,
    val status: String,
    @SerializedName("created_at") val createdAt: String
)

data class ApiSubmission(
    val id: String,
    @SerializedName("form_id") val formId: String,
    val data: Map<String, Any>,
    val metadata: Map<String, Any>?,
    @SerializedName("created_at") val createdAt: String
)

data class CreateSubmissionRequest(
    @SerializedName("form_id") val formId: String,
    val data: Map<String, Any>,
    val metadata: Map<String, Any> = mapOf("sdk" to "android", "version" to "1.0.0")
)
