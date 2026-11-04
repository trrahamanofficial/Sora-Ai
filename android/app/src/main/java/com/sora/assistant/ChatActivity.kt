package com.sora.assistant

import android.os.Bundle
import android.content.Intent
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.sora.assistant.auth.AuthManager
import com.sora.assistant.databinding.ActivityChatBinding
import com.sora.assistant.databinding.ItemChatMessageBinding
import com.sora.assistant.network.ApiClient
import com.sora.assistant.network.ChatMessage
import com.sora.assistant.network.ChatRequest
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class ChatActivity : AppCompatActivity() {

    private lateinit var binding: ActivityChatBinding
    private lateinit var authManager: AuthManager
    private val messages = mutableListOf<ChatMessage>()
    private var conversationId: String? = null
    private lateinit var adapter: ChatAdapter
    private var isSending = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityChatBinding.inflate(layoutInflater)
        setContentView(binding.root)

        authManager = AuthManager(this)
        ApiClient.updateBaseUrl(authManager.getBackendUrl())

        setupRecyclerView()
        setupListeners()

        // Welcome message
        messages.add(
            ChatMessage(
                role = "assistant",
                content = "স্বাগতম! আমি সোরা (SORA), আপনার ব্যক্তিগত মাল্টি-এআই ভয়েস অ্যাসিস্ট্যান্ট। কীভাবে আপনাকে সাহায্য করতে পারি?",
                providerUsed = "gemini"
            )
        )
        adapter.notifyItemInserted(0)
    }

    private fun setupRecyclerView() {
        adapter = ChatAdapter(messages)
        binding.rvMessages.layoutManager = LinearLayoutManager(this).apply {
            stackFromEnd = true
        }
        binding.rvMessages.adapter = adapter
    }

    private fun setupListeners() {
        binding.btnBack.setOnClickListener {
            finish()
        }
        binding.btnHistory.setOnClickListener {
            startActivity(Intent(this, HistoryActivity::class.java))
        }

        binding.btnNewChat.setOnClickListener {
            conversationId = null
            messages.clear()
            messages.add(
                ChatMessage(
                    role = "assistant",
                    content = "নতুন কথোপকথন শুরু হলো।",
                    providerUsed = "gemini"
                )
            )
            adapter.notifyDataSetChanged()
        }

        binding.btnSend.setOnClickListener {
            val text = binding.etMessage.text?.toString()?.trim() ?: ""
            if (text.isNotEmpty()) {
                sendMessage(text)
            }
        }
    }

    private fun sendMessage(text: String) {
        if (isSending) return
        isSending = true
        binding.btnSend.isEnabled = false
        binding.etMessage.text.clear()

        // Add user message
        val userMsg = ChatMessage(role = "user", content = text)
        messages.add(userMsg)
        val userIndex = messages.size - 1
        adapter.notifyItemInserted(userIndex)
        binding.rvMessages.smoothScrollToPosition(userIndex)

        val requestMessages = messages.takeLast(40).map { ChatMessage(it.role, it.content) }
        val requestConversationId = conversationId
        val request = ChatRequest(
            messages = requestMessages,
            language = if (text.any { it in '\u0980'..'\u09FF' }) "bn" else "en",
            conversationId = requestConversationId
        )

        lifecycleScope.launch(Dispatchers.IO) {
            try {
                val token = authManager.getAccessToken()
                val authHeader = token?.let { "Bearer $it" }

                val response = ApiClient.apiService.sendChat(authHeader, request)

                withContext(Dispatchers.Main) {
                    if (response.isSuccessful && response.body() != null) {
                        val body = response.body()!!
                        conversationId = body.conversationId ?: conversationId
                        val assistantMsg = ChatMessage(
                            role = "assistant",
                            content = body.text,
                            providerUsed = body.providerId
                        )
                        messages.add(assistantMsg)
                        adapter.notifyItemInserted(messages.size - 1)
                        binding.rvMessages.smoothScrollToPosition(messages.size - 1)
                    } else if (response.code() == 401) {
                        authManager.clearSession()
                        startActivity(Intent(this@ChatActivity, MainActivity::class.java))
                        finish()
                    } else {
                        Toast.makeText(this@ChatActivity, "Provider response failed (${response.code()})", Toast.LENGTH_SHORT).show()
                    }
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    Toast.makeText(this@ChatActivity, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
                }
            } finally {
                withContext(Dispatchers.Main) {
                    isSending = false
                    binding.btnSend.isEnabled = true
                }
            }
        }
    }

    inner class ChatAdapter(private val items: List<ChatMessage>) :
        RecyclerView.Adapter<ChatAdapter.ChatViewHolder>() {

        inner class ChatViewHolder(val binding: ItemChatMessageBinding) :
            RecyclerView.ViewHolder(binding.root)

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ChatViewHolder {
            val inflater = LayoutInflater.from(parent.context)
            val itemBinding = ItemChatMessageBinding.inflate(inflater, parent, false)
            return ChatViewHolder(itemBinding)
        }

        override fun onBindViewHolder(holder: ChatViewHolder, position: Int) {
            val item = items[position]
            if (item.role == "user") {
                holder.binding.layoutUser.visibility = View.VISIBLE
                holder.binding.layoutAssistant.visibility = View.GONE
                holder.binding.tvUserContent.text = item.content
            } else {
                holder.binding.layoutUser.visibility = View.GONE
                holder.binding.layoutAssistant.visibility = View.VISIBLE
                holder.binding.tvAssistantContent.text = item.content
                holder.binding.tvAssistantProvider.text = "SORA • ${(item.providerUsed ?: "AI").uppercase()}"
            }
        }

        override fun getItemCount(): Int = items.size
    }
}
