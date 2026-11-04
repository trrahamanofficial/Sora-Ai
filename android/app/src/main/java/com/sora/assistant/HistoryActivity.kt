package com.sora.assistant

import android.os.Bundle
import android.view.Gravity
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.app.AlertDialog
import androidx.lifecycle.lifecycleScope
import com.sora.assistant.auth.AuthManager
import com.sora.assistant.network.ApiClient
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/** Displays only conversations returned for the currently authenticated account. */
class HistoryActivity : AppCompatActivity() {
    private lateinit var content: LinearLayout
    private lateinit var auth: AuthManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        auth = AuthManager(this)
        ApiClient.updateBaseUrl(auth.getBackendUrl())

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(20, 20, 20, 20)
            setBackgroundColor(android.graphics.Color.rgb(7, 17, 31))
        }
        val header = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
        }
        header.addView(TextView(this).apply {
            text = "SORA • Conversation History"
            textSize = 19f
            setTextColor(android.graphics.Color.WHITE)
        }, LinearLayout.LayoutParams(0, -2, 1f))
        header.addView(Button(this).apply {
            text = "Back"
            setOnClickListener { finish() }
        })
        root.addView(header)
        val scroll = ScrollView(this)
        content = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        scroll.addView(content)
        root.addView(scroll, LinearLayout.LayoutParams(-1, 0, 1f))
        setContentView(root)
        loadHistory()
    }

    private fun loadHistory() {
        val token = auth.getAccessToken()
        if (token.isNullOrBlank()) {
            Toast.makeText(this, "Please sign in again.", Toast.LENGTH_LONG).show()
            finish()
            return
        }
        content.removeAllViews()
        content.addView(label("Loading conversation history…"))
        lifecycleScope.launch(Dispatchers.IO) {
            try {
                val response = ApiClient.apiService.listConversations("Bearer $token", 50, 0)
                withContext(Dispatchers.Main) {
                    content.removeAllViews()
                    if (response.isSuccessful) {
                        val rows = response.body()?.conversations.orEmpty()
                        if (rows.isEmpty()) content.addView(label("No saved conversations yet."))
                        rows.forEach { item ->
                            val title = item.title.ifBlank { "Untitled conversation" }
                            val row = Button(this@HistoryActivity).apply {
                                text = (if (item.pinned) "★  " else "") + title + "\n" + (item.updatedAt ?: "")
                                isAllCaps = false
                                setOnClickListener { loadMessages(item.id, title) }
                            }
                            content.addView(row, LinearLayout.LayoutParams(-1, -2).apply { bottomMargin = 8 })
                        }
                    } else {
                        if (response.code() == 401) auth.clearSession()
                        content.addView(label("Could not load history (HTTP ${response.code()})."))
                    }
                }
            } catch (error: Exception) {
                withContext(Dispatchers.Main) {
                    content.removeAllViews()
                    content.addView(label("Network error: ${error.message ?: "Unknown error"}"))
                }
            }
        }
    }

    private fun loadMessages(id: String, title: String) {
        val token = auth.getAccessToken() ?: return
        lifecycleScope.launch(Dispatchers.IO) {
            try {
                val response = ApiClient.apiService.getConversationMessages("Bearer $token", id)
                withContext(Dispatchers.Main) {
                    if (response.isSuccessful) {
                        val transcript = response.body()?.messages.orEmpty().joinToString("\n\n") {
                            val speaker = if (it.role == "user") "You" else "SORA"
                            "$speaker: ${it.content}"
                        }
                        AlertDialog.Builder(this@HistoryActivity)
                            .setTitle(title)
                            .setMessage(transcript.ifBlank { "No messages in this conversation." })
                            .setPositiveButton("Close", null)
                            .show()
                    } else {
                        Toast.makeText(this@HistoryActivity, "Could not open conversation (${response.code()}).", Toast.LENGTH_LONG).show()
                    }
                }
            } catch (error: Exception) {
                withContext(Dispatchers.Main) {
                    Toast.makeText(this@HistoryActivity, "Network error: ${error.message}", Toast.LENGTH_LONG).show()
                }
            }
        }
    }

    private fun label(value: String) = TextView(this).apply {
        text = value
        textSize = 15f
        setTextColor(android.graphics.Color.WHITE)
        setPadding(8, 18, 8, 18)
    }
}
