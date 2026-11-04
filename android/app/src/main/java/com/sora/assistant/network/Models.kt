package com.sora.assistant.network

import com.google.gson.annotations.SerializedName

data class ChatMessage(
    @SerializedName("role") val role: String, // "user" or "assistant"
    @SerializedName("content") val content: String,
    @SerializedName("provider_used") val providerUsed: String? = null
)

data class ChatRequest(
    @SerializedName("messages") val messages: List<ChatMessage>,
    @SerializedName("providerId") val providerId: String? = null,
    @SerializedName("language") val language: String = "bn",
    @SerializedName("conversationId") val conversationId: String? = null
)

data class ChatResponse(
    @SerializedName("text") val text: String,
    @SerializedName("providerId") val providerId: String,
    @SerializedName("model") val model: String,
    @SerializedName("latencyMs") val latencyMs: Long,
    @SerializedName("language") val language: String,
    @SerializedName("conversationId") val conversationId: String? = null
)

data class HealthResponse(
    @SerializedName("status") val status: String,
    @SerializedName("app") val app: String,
    @SerializedName("activeProvidersCount") val activeProvidersCount: Int
)

data class ProviderInfo(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("displayName") val displayName: String,
    @SerializedName("enabled") val enabled: Boolean,
    @SerializedName("defaultModel") val defaultModel: String,
    @SerializedName("supportsBengali") val supportsBengali: Boolean
)


data class ConversationHistoryResponse(
    @SerializedName("conversations") val conversations: List<ConversationHistoryItem>,
    @SerializedName("total") val total: Int,
    @SerializedName("limit") val limit: Int,
    @SerializedName("offset") val offset: Int
)

data class ConversationHistoryItem(
    @SerializedName("id") val id: String,
    @SerializedName("title") val title: String,
    @SerializedName("language") val language: String?,
    @SerializedName("pinned") val pinned: Boolean,
    @SerializedName("created_at") val createdAt: String?,
    @SerializedName("updated_at") val updatedAt: String?
)

data class ConversationMessagesResponse(
    @SerializedName("conversationId") val conversationId: String,
    @SerializedName("messages") val messages: List<ConversationMessageRecord>
)

data class ConversationMessageRecord(
    @SerializedName("id") val id: String,
    @SerializedName("role") val role: String,
    @SerializedName("content") val content: String,
    @SerializedName("provider_used") val providerUsed: String?,
    @SerializedName("created_at") val createdAt: String?
)
