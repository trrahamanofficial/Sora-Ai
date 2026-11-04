package com.sora.assistant

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.sora.assistant.auth.AuthManager
import com.sora.assistant.databinding.ActivityMainBinding
import com.sora.assistant.network.ApiClient
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private lateinit var authManager: AuthManager
    private var isSignUpMode = false

    // Set these through SORA_SUPABASE_URL and SORA_SUPABASE_ANON_KEY Gradle properties or environment variables.
    private val supabaseUrl = BuildConfig.SUPABASE_URL.trimEnd('/')
    private val supabaseAnonKey = BuildConfig.SUPABASE_ANON_KEY

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        authManager = AuthManager(this)

        // Check if already authenticated
        if (authManager.isLoggedIn()) {
            startActivity(Intent(this, VoiceActivity::class.java))
            finish()
            return
        }

        setupListeners()
    }

    private fun setupListeners() {
        binding.tvSwitchMode.setOnClickListener {
            isSignUpMode = !isSignUpMode
            updateUiMode()
        }

        binding.btnSubmit.setOnClickListener {
            val email = binding.etEmail.text?.toString()?.trim() ?: ""
            val password = binding.etPassword.text?.toString() ?: ""
            val fullName = binding.etFullName.text?.toString()?.trim() ?: ""

            if (email.isEmpty() || password.isEmpty()) {
                Toast.makeText(this, "Please fill in all required fields", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            if (password.length < 6) {
                Toast.makeText(this, "Password must be at least 6 characters", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            performAuth(email, password, fullName)
        }
    }

    private fun updateUiMode() {
        if (isSignUpMode) {
            binding.tvAuthTitle.text = getString(R.string.register_title)
            binding.btnSubmit.text = getString(R.string.sign_up)
            binding.tvSwitchMode.text = getString(R.string.switch_to_login)
            binding.tilFullName.visibility = View.VISIBLE
        } else {
            binding.tvAuthTitle.text = getString(R.string.login_title)
            binding.btnSubmit.text = getString(R.string.sign_in)
            binding.tvSwitchMode.text = getString(R.string.switch_to_register)
            binding.tilFullName.visibility = View.GONE
        }
    }

    private fun performAuth(email: String, pass: String, name: String) {
        val signingUp = isSignUpMode
        binding.pbLoading.visibility = View.VISIBLE
        binding.btnSubmit.isEnabled = false

        lifecycleScope.launch(Dispatchers.IO) {
            try {
                if (supabaseUrl.contains("YOUR_PROJECT") || supabaseAnonKey == "YOUR_SUPABASE_ANON_KEY") {
                    withContext(Dispatchers.Main) {
                        Toast.makeText(this@MainActivity, "Configure SORA_SUPABASE_URL and SORA_SUPABASE_ANON_KEY in the Android build settings first.", Toast.LENGTH_LONG).show()
                    }
                    return@launch
                }
                val endpoint = if (signingUp) {
                    "$supabaseUrl/auth/v1/signup"
                } else {
                    "$supabaseUrl/auth/v1/token?grant_type=password"
                }

                val url = URL(endpoint)
                val conn = (url.openConnection() as HttpURLConnection).apply {
                    requestMethod = "POST"
                    connectTimeout = 20_000
                    readTimeout = 20_000
                    setRequestProperty("Content-Type", "application/json; charset=utf-8")
                    setRequestProperty("apikey", supabaseAnonKey)
                    doOutput = true
                }

                val jsonBody = JSONObject().apply {
                    put("email", email)
                    put("password", pass)
                    if (signingUp && name.isNotEmpty()) {
                        val meta = JSONObject().apply { put("full_name", name) }
                        put("data", meta)
                    }
                }

                conn.outputStream.use { os ->
                    os.write(jsonBody.toString().toByteArray(Charsets.UTF_8))
                }

                try {
                val responseCode = conn.responseCode
                if (responseCode in 200..299) {
                    val respStr = conn.inputStream.bufferedReader().use { it.readText() }
                    val respJson = JSONObject(respStr)

                    val token = respJson.optString("access_token", "").ifBlank {
                        respJson.optJSONObject("session")?.optString("access_token", "") ?: ""
                    }

                    if (token.isBlank()) {
                        withContext(Dispatchers.Main) {
                            val message = if (signingUp)
                                "Account created. Check your email to confirm your account, then sign in."
                            else "Sign-in did not return a session token. Please try again."
                            Toast.makeText(this@MainActivity, message, Toast.LENGTH_LONG).show()
                        }
                        return@launch
                    }

                    authManager.saveSession(token, email, name)

                    withContext(Dispatchers.Main) {
                        Toast.makeText(this@MainActivity, "Authentication successful!", Toast.LENGTH_SHORT).show()
                        startActivity(Intent(this@MainActivity, VoiceActivity::class.java))
                        finish()
                    }
                } else {
                    val errStr = conn.errorStream?.bufferedReader()?.use { it.readText() } ?: "Auth failed"
                    withContext(Dispatchers.Main) {
                        Toast.makeText(this@MainActivity, "Error: $errStr", Toast.LENGTH_LONG).show()
                    }
                }
                } finally {
                    conn.disconnect()
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    Toast.makeText(this@MainActivity, "Network error: ${e.message}", Toast.LENGTH_SHORT).show()
                }
            } finally {
                withContext(Dispatchers.Main) {
                    binding.pbLoading.visibility = View.GONE
                    binding.btnSubmit.isEnabled = true
                }
            }
        }
    }
}
