package com.vtrustx.sdk

import android.content.Context
import com.vtrustx.sdk.auth.AuthManager
import com.vtrustx.sdk.models.*
import com.vtrustx.sdk.network.VTrustXApiService
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

/**
 * Exception wrapping an HTTP error from the VTrustX API.
 */
class ApiException(val code: Int, message: String) : Exception(message)

/**
 * Main entry point for the VTrustX Android SDK.
 *
 * All API calls are suspend functions — call them from a coroutine scope.
 * All methods return [Result<T>]; use [Result.getOrThrow], [Result.getOrNull],
 * or [Result.fold] to handle success/failure idiomatically.
 *
 * Example:
 * ```kotlin
 * val client = VTrustXClient(context)
 * lifecycleScope.launch {
 *     client.login("admin", "password").onSuccess { response ->
 *         Log.d("SDK", "Logged in as ${response.user.username}")
 *     }.onFailure { error ->
 *         Log.e("SDK", "Login failed: ${error.message}")
 *     }
 * }
 * ```
 */
class VTrustXClient(
    context: Context,
    baseUrl: String = "https://api.rayix.app/api/"
) {
    private val authManager = AuthManager(context)

    private val okHttpClient = OkHttpClient.Builder()
        .addInterceptor { chain ->
            val request = chain.request().newBuilder().apply {
                authManager.getToken()?.let { token ->
                    addHeader("Authorization", "Bearer $token")
                }
            }.build()
            chain.proceed(request)
        }
        .addInterceptor(HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        })
        .build()

    private val api: VTrustXApiService = Retrofit.Builder()
        .baseUrl(baseUrl)
        .client(okHttpClient)
        .addConverterFactory(GsonConverterFactory.create())
        .build()
        .create(VTrustXApiService::class.java)

    // ─── Auth ─────────────────────────────────────────────────────────────────

    suspend fun login(username: String, password: String): Result<AuthResponse> = runCatching {
        val response = api.login(mapOf("username" to username, "password" to password))
        response.token?.let { authManager.saveToken(it) }
        response
    }

    suspend fun logout(): Result<Unit> = runCatching {
        api.logout()
        authManager.clearToken()
    }

    suspend fun getMe(): Result<ApiUser> = runCatching {
        api.getMe()
    }

    // ─── Forms ────────────────────────────────────────────────────────────────

    suspend fun listForms(): Result<List<ApiForm>> = runCatching {
        api.listForms()
    }

    suspend fun getForm(id: String): Result<ApiForm> = runCatching {
        api.getForm(id)
    }

    suspend fun getFormBySlug(slug: String): Result<ApiForm> = runCatching {
        api.getFormBySlug(slug)
    }

    // ─── Submissions ──────────────────────────────────────────────────────────

    suspend fun listSubmissions(
        formId: String? = null,
        page: Int? = null,
        limit: Int? = null
    ): Result<List<ApiSubmission>> = runCatching {
        api.listSubmissions(formId, page, limit)
    }

    suspend fun createSubmission(
        formId: String,
        data: Map<String, Any>
    ): Result<ApiSubmission> = runCatching {
        api.createSubmission(CreateSubmissionRequest(formId = formId, data = data))
    }

    // ─── Distributions ────────────────────────────────────────────────────────

    suspend fun listDistributions(): Result<List<Map<String, Any>>> = runCatching {
        api.listDistributions()
    }

    suspend fun getDistributionStats(id: String): Result<Map<String, Any>> = runCatching {
        api.getDistributionStats(id)
    }

    // ─── Notifications ────────────────────────────────────────────────────────

    suspend fun listNotifications(): Result<List<Map<String, Any>>> = runCatching {
        api.listNotifications()
    }

    suspend fun markNotificationRead(id: String): Result<Map<String, Any>> = runCatching {
        api.markNotificationRead(id)
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    fun isAuthenticated(): Boolean = authManager.isAuthenticated

    fun clearToken() = authManager.clearToken()
}
