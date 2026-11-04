package com.sora.assistant

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.view.animation.ScaleAnimation
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import com.sora.assistant.auth.AuthManager
import com.sora.assistant.databinding.ActivityVoiceBinding
import com.sora.assistant.network.ApiClient
import com.sora.assistant.network.ChatMessage
import com.sora.assistant.network.ChatRequest
import com.sora.assistant.voice.VoiceManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class VoiceActivity : AppCompatActivity() {

    private lateinit var binding: ActivityVoiceBinding
    private lateinit var authManager: AuthManager
    private var voiceManager: VoiceManager? = null
    private var isBengali = true
    private var isCurrentlyListening = false
    private var conversationId: String? = null

    // Explicit runtime permission request
    private val requestAudioPermission =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { isGranted ->
            if (isGranted) {
                startVoiceRecording()
            } else {
                Toast.makeText(this, getString(R.string.mic_permission_needed), Toast.LENGTH_LONG).show()
            }
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityVoiceBinding.inflate(layoutInflater)
        setContentView(binding.root)

        authManager = AuthManager(this)
        ApiClient.updateBaseUrl(authManager.getBackendUrl())

        setupVoiceManager()
        setupListeners()
    }

    private fun setupVoiceManager() {
        voiceManager = VoiceManager(
            context = this,
            onListeningStateChanged = { listening ->
                isCurrentlyListening = listening
                runOnUiThread {
                    if (listening) {
                        binding.tvVoiceStatus.text = getString(R.string.mic_active)
                        binding.tvVoiceStatus.setTextColor(ContextCompat.getColor(this, R.color.rose_500))
                    } else {
                        binding.tvVoiceStatus.text = getString(R.string.voice_standby)
                        binding.tvVoiceStatus.setTextColor(ContextCompat.getColor(this, R.color.cyan_400))
                    }
                }
            },
            onSpeechRecognized = { text, isFinal ->
                runOnUiThread {
                    binding.tvTranscriptText.text = text
                    if (isFinal && text.trim().isNotEmpty()) {
                        processVoiceQuery(text.trim())
                    }
                }
            },
            onAudioLevelChanged = { level ->
                runOnUiThread {
                    animateOrb(level)
                }
            },
            onError = { errMsg ->
                runOnUiThread {
                    binding.tvVoiceStatus.text = "Status: $errMsg"
                }
            }
        )

        voiceManager?.setLanguage(isBengali)
    }

    private fun setupListeners() {
        // Explicit Start Recording Button
        binding.btnStartVoice.setOnClickListener {
            checkPermissionAndStart()
        }

        // Explicit Stop Recording Button
        binding.btnStopVoice.setOnClickListener {
            stopVoiceRecording()
        }

        // Language toggle
        binding.btnLanguageToggle.setOnClickListener {
            isBengali = !isBengali
            voiceManager?.setLanguage(isBengali)
            binding.btnLanguageToggle.text = if (isBengali) "বাংলা" else "ENG"
            Toast.makeText(
                this,
                if (isBengali) "ভাষা: বাংলা" else "Language: English",
                Toast.LENGTH_SHORT
            ).show()
        }

        // Switch to text chat
        binding.btnOpenChat.setOnClickListener {
            startActivity(Intent(this, ChatActivity::class.java))
        }
        binding.btnHistory.setOnClickListener {
            startActivity(Intent(this, HistoryActivity::class.java))
        }
    }

    private fun checkPermissionAndStart() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
            == PackageManager.PERMISSION_GRANTED
        ) {
            startVoiceRecording()
        } else {
            requestAudioPermission.launch(Manifest.permission.RECORD_AUDIO)
        }
    }

    private fun startVoiceRecording() {
        binding.tvTranscriptText.text = "Listening... Speak now."
        voiceManager?.startListening()
    }

    private fun stopVoiceRecording() {
        voiceManager?.stopListening()
        binding.tvVoiceStatus.text = getString(R.string.voice_standby)
        binding.tvVoiceStatus.setTextColor(ContextCompat.getColor(this, R.color.cyan_400))
    }

    private fun processVoiceQuery(query: String) {
        binding.tvVoiceStatus.text = "SORA IS THINKING..."
        binding.tvTranscriptText.text = "You: $query\n\nContacting SORA Multi-AI..."

        val requestLanguage = if (isBengali) "bn" else "en"
        val requestConversationId = conversationId
        lifecycleScope.launch(Dispatchers.IO) {
            try {
                val token = authManager.getAccessToken()
                val authHeader = if (token != null) "Bearer $token" else null

                val request = ChatRequest(
                    messages = listOf(ChatMessage(role = "user", content = query)),
                    language = requestLanguage,
                    conversationId = requestConversationId
                )

                val response = ApiClient.apiService.sendChat(authHeader, request)

                withContext(Dispatchers.Main) {
                    if (response.isSuccessful && response.body() != null) {
                        val chatResp = response.body()!!
                        conversationId = chatResp.conversationId ?: conversationId
                        binding.tvVoiceStatus.text = "SORA (${chatResp.providerId.uppercase()})"
                        binding.tvTranscriptText.text = "SORA: ${chatResp.text}"

                        // Speak response aloud
                        voiceManager?.speak(chatResp.text, onStart = {
                            binding.tvVoiceStatus.text = getString(R.string.sora_speaking)
                        }, onDone = {
                            binding.tvVoiceStatus.text = getString(R.string.voice_standby)
                        })
                    } else if (response.code() == 401) {
                        authManager.clearSession()
                        startActivity(Intent(this@VoiceActivity, MainActivity::class.java))
                        finish()
                    } else {
                        binding.tvTranscriptText.text = "Error: Provider unavailable or request failed (${response.code()})."
                    }
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    binding.tvTranscriptText.text = "Network Error: ${e.message}"
                }
            }
        }
    }

    private fun animateOrb(level: Float) {
        val scale = 1.0f + (level * 0.4f)
        binding.orbCore.scaleX = scale
        binding.orbCore.scaleY = scale
        binding.orbPulseRing.scaleX = scale * 1.2f
        binding.orbPulseRing.scaleY = scale * 1.2f
    }

    override fun onDestroy() {
        super.onDestroy()
        voiceManager?.destroy()
    }
}
