# SORA পরিবর্তন

- `/` এ Guest Mode: chat request-এ login বাধ্যতামূলক নয়। Guest chat server-এ permanent history হিসেবে save হয় না।
- `/admin` এ Supabase Admin Login ও dashboard যোগ করা হয়েছে।
- Dashboard-এ users/conversations/messages/provider summary, provider enable/disable, API key save, model/base URL/priority, provider test যুক্ত।
- Backend chat endpoint-এ optional Supabase session support করা হয়েছে; authenticated user-এর history আগের মতোই save হতে পারে।
- Admin API-গুলো server-side `profiles.role = admin` যাচাই করে।

## গুরুত্বপূর্ণ সীমাবদ্ধতা
এই runtime-এ npm install timeout হওয়ায় production build চালানো যায়নি। তাই ZIP integrity ও source edits প্রস্তুত, কিন্তু production build, live Supabase/Render/Netlify connection এবং real-device test PASS বলে দাবি করা হচ্ছে না।
