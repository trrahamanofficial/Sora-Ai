package com.sora.assistant.network

import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object ApiClient {
    // Default base URL points to local dev server (10.0.2.2 is Android host loopback for emulator)
    // or set to your live deployed backend URL
    private var baseUrl: String = com.sora.assistant.BuildConfig.BACKEND_URL.let { if (it.endsWith("/")) it else "$it/" }

    private val logging = HttpLoggingInterceptor().apply {
        // Never log request bodies or Authorization headers; production logging is disabled.
        level = if (com.sora.assistant.BuildConfig.DEBUG) HttpLoggingInterceptor.Level.BASIC
                else HttpLoggingInterceptor.Level.NONE
    }

    private val okHttpClient = OkHttpClient.Builder()
        .addInterceptor(logging)
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()

    private var retrofit: Retrofit = Retrofit.Builder()
        .baseUrl(baseUrl)
        .client(okHttpClient)
        .addConverterFactory(GsonConverterFactory.create())
        .build()

    var apiService: ApiService = retrofit.create(ApiService::class.java)

    fun updateBaseUrl(newUrl: String) {
        val parsed = android.net.Uri.parse(newUrl.trim())
        require(parsed.scheme == "https" && !parsed.host.isNullOrBlank()) {
            "SORA_BACKEND_URL must be a valid HTTPS origin or base URL."
        }
        val sanitized = newUrl.trim().let { if (it.endsWith("/")) it else "$it/" }
        baseUrl = sanitized
        retrofit = Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
        apiService = retrofit.create(ApiService::class.java)
    }

    fun getBaseUrl(): String = baseUrl
}
