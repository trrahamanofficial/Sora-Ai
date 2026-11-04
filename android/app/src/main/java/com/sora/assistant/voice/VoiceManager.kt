package com.sora.assistant.voice

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.util.Log
import java.util.Locale

class VoiceManager(
    private val context: Context,
    private val onListeningStateChanged: (Boolean) -> Unit,
    private val onSpeechRecognized: (String, Boolean) -> Unit,
    private val onAudioLevelChanged: (Float) -> Unit,
    private val onError: (String) -> Unit
) : RecognitionListener, TextToSpeech.OnInitListener {

    private var speechRecognizer: SpeechRecognizer? = null
    private var textToSpeech: TextToSpeech? = null
    private var currentLanguageLocale: Locale = Locale("bn", "BD") // Bengali default
    private var isExplicitlyListening = false
    private var isTtsReady = false

    init {
        initSpeechRecognizer()
        textToSpeech = TextToSpeech(context, this)
    }

    private fun initSpeechRecognizer() {
        if (SpeechRecognizer.isRecognitionAvailable(context)) {
            speechRecognizer = SpeechRecognizer.createSpeechRecognizer(context).apply {
                setRecognitionListener(this@VoiceManager)
            }
        } else {
            onError("Speech recognition service not available on this device.")
        }
    }

    fun setLanguage(isBengali: Boolean) {
        currentLanguageLocale = if (isBengali) {
            Locale("bn", "BD")
        } else {
            Locale.US
        }

        if (isTtsReady) {
            textToSpeech?.language = currentLanguageLocale
        }
    }

    // EXPLICIT START: Only starts when user explicitly triggers this method
    fun startListening() {
        if (speechRecognizer == null) {
            initSpeechRecognizer()
        }
        val recognizer = speechRecognizer
        if (recognizer == null) {
            isExplicitlyListening = false
            onListeningStateChanged(false)
            onError("Speech recognition service is unavailable on this device.")
            return
        }

        stopSpeaking()

        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, currentLanguageLocale.toLanguageTag())
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, currentLanguageLocale.toLanguageTag())
            putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
            putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
        }

        try {
            isExplicitlyListening = true
            recognizer.startListening(intent)
            onListeningStateChanged(true)
        } catch (error: SecurityException) {
            isExplicitlyListening = false
            onListeningStateChanged(false)
            onError("Microphone permission is required.")
        } catch (error: IllegalStateException) {
            isExplicitlyListening = false
            onListeningStateChanged(false)
            onError("Speech recognition is busy. Please try again.")
        }
    }

    // EXPLICIT STOP: Stops recording immediately
    fun stopListening() {
        isExplicitlyListening = false
        speechRecognizer?.stopListening()
        onListeningStateChanged(false)
        onAudioLevelChanged(0f)
    }

    // Text to Speech
    fun speak(text: String, onStart: (() -> Unit)? = null, onDone: (() -> Unit)? = null) {
        if (!isTtsReady || textToSpeech == null) return

        val cleanText = text
            .replace(Regex("```[\\s\\S]*?```"), "Code block omitted.")
            .replace(Regex("[*_#`~]"), "")
            .trim()

        textToSpeech?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
            override fun onStart(utteranceId: String?) {
                onStart?.invoke()
            }

            override fun onDone(utteranceId: String?) {
                onDone?.invoke()
            }

            override fun onError(utteranceId: String?) {
                onDone?.invoke()
            }
        })

        textToSpeech?.speak(cleanText, TextToSpeech.QUEUE_FLUSH, null, "sora_tts_${System.currentTimeMillis()}")
    }

    fun stopSpeaking() {
        textToSpeech?.stop()
    }

    fun destroy() {
        stopListening()
        stopSpeaking()
        speechRecognizer?.destroy()
        speechRecognizer = null
        textToSpeech?.shutdown()
        textToSpeech = null
    }

    // RecognitionListener Implementation
    override fun onReadyForSpeech(params: Bundle?) {}
    override fun onBeginningOfSpeech() {}

    override fun onRmsChanged(rmsdB: Float) {
        if (isExplicitlyListening) {
            val normalized = (rmsdB + 2f) / 12f
            onAudioLevelChanged(normalized.coerceIn(0f, 1f))
        }
    }

    override fun onBufferReceived(buffer: ByteArray?) {}
    override fun onEndOfSpeech() {
        onListeningStateChanged(false)
    }

    override fun onError(error: Int) {
        isExplicitlyListening = false
        onListeningStateChanged(false)
        val msg = when (error) {
            SpeechRecognizer.ERROR_AUDIO -> "Audio recording error"
            SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "Microphone permission required"
            SpeechRecognizer.ERROR_NETWORK -> "Network error"
            SpeechRecognizer.ERROR_NO_MATCH -> "No speech detected"
            else -> "Recognition paused"
        }
        onError(msg)
    }

    override fun onResults(results: Bundle?) {
        isExplicitlyListening = false
        onListeningStateChanged(false)
        val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
        if (!matches.isNullOrEmpty()) {
            onSpeechRecognized(matches[0], true)
        }
    }

    override fun onPartialResults(partialResults: Bundle?) {
        val matches = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
        if (!matches.isNullOrEmpty()) {
            onSpeechRecognized(matches[0], false)
        }
    }

    override fun onEvent(eventType: Int, params: Bundle?) {}

    // TextToSpeech.OnInitListener
    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            val result = textToSpeech?.setLanguage(currentLanguageLocale)
            if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
                // Fallback to English if Bengali speech package is not downloaded on phone
                textToSpeech?.language = Locale.US
            }
            isTtsReady = true
        }
    }
}
