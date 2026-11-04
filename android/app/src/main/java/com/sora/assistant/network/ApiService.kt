package com.sora.assistant.network

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface ApiService {

    @GET("api/health")
    suspend fun getHealth(): Response<HealthResponse>

    @GET("api/providers/public")
    suspend fun getPublicProviders(): Response<List<ProviderInfo>>

    @POST("api/chat")
    suspend fun sendChat(
        @Header("Authorization") authHeader: String?,
        @Body request: ChatRequest
    ): Response<ChatResponse>

    @GET("api/conversations")
    suspend fun listConversations(
        @Header("Authorization") authHeader: String,
        @Query("limit") limit: Int = 50,
        @Query("offset") offset: Int = 0
    ): Response<ConversationHistoryResponse>

    @GET("api/conversations/{id}/messages")
    suspend fun getConversationMessages(
        @Header("Authorization") authHeader: String,
        @Path("id") conversationId: String
    ): Response<ConversationMessagesResponse>
}
