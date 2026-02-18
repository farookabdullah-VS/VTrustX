package com.vtrustx.sdk.network

import com.vtrustx.sdk.models.*
import retrofit2.http.*

interface VTrustXApiService {

    // ─── Auth ─────────────────────────────────────────────────────────────────

    @POST("auth/login")
    suspend fun login(@Body body: Map<String, String>): AuthResponse

    @POST("auth/register")
    suspend fun register(@Body body: Map<String, String>): AuthResponse

    @POST("auth/logout")
    suspend fun logout(): Map<String, Any>

    @GET("auth/me")
    suspend fun getMe(): ApiUser

    // ─── Forms ────────────────────────────────────────────────────────────────

    @GET("forms")
    suspend fun listForms(): List<ApiForm>

    @GET("forms/{id}")
    suspend fun getForm(@Path("id") id: String): ApiForm

    @GET("forms/slug/{slug}")
    suspend fun getFormBySlug(@Path("slug") slug: String): ApiForm

    // ─── Submissions ──────────────────────────────────────────────────────────

    @GET("submissions")
    suspend fun listSubmissions(
        @Query("formId") formId: String? = null,
        @Query("page") page: Int? = null,
        @Query("limit") limit: Int? = null
    ): List<ApiSubmission>

    @POST("submissions")
    suspend fun createSubmission(@Body body: CreateSubmissionRequest): ApiSubmission

    // ─── Distributions ────────────────────────────────────────────────────────

    @GET("distributions")
    suspend fun listDistributions(): List<Map<String, Any>>

    @GET("distributions/{id}/stats")
    suspend fun getDistributionStats(@Path("id") id: String): Map<String, Any>

    // ─── Notifications ────────────────────────────────────────────────────────

    @GET("notifications")
    suspend fun listNotifications(): List<Map<String, Any>>

    @PATCH("notifications/{id}/read")
    suspend fun markNotificationRead(@Path("id") id: String): Map<String, Any>
}
