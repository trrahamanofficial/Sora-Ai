# SORA A–Z — একীভূত প্রজেক্ট

এই ZIP-এ তিনটি অংশ একসঙ্গে রাখা হয়েছে:

- `backend/` — Node.js/Express Central AI Backend; Render-এ deploy করার জন্য।
- `web/` — React/Vite AI Chat Interface; Netlify-এ deploy করার জন্য।
- `android/` — Android Studio/Kotlin অ্যাপ।

## লগইন ও Admin Dashboard

- সাধারণ ব্যবহারকারী লগইন ছাড়াই `/` থেকে চ্যাট ও ভয়েস ব্যবহার করতে পারবেন। Guest chat স্থায়ীভাবে সংরক্ষিত হবে না।
- Admin Dashboard: `/admin`। Supabase Auth-এ তৈরি Admin account দিয়ে লগইন করুন।
- Dashboard-এর provider settings ও stats চালাতে Render backend এবং `SUPABASE_SERVICE_ROLE_KEY`, `ENCRYPTION_SECRET` সঠিকভাবে সেট থাকতে হবে। Provider key শুধু Dashboard-এর secure backend API দিয়ে সংরক্ষণ করুন।

## মূল AI Interface

Web-এর মূল AI Chat Interface থেকে Admin Console, Admin Button, Admin Menu এবং `/admin.html` entry point সরানো হয়েছে। Backend-এর admin API-গুলো server-side role check-এর পেছনে রাখা হয়েছে; এগুলো সাধারণ ব্যবহারকারীর UI-তে দেখানো হয় না।

## API ও URL কনফিগারেশন

আপনার দেওয়া ZIP-গুলোতে কোনো বাস্তব Render Backend URL বা Supabase Project URL/Key ছিল না; কেবল placeholder ছিল। তাই অনুমান করে কোনো live URL বসানো হয়নি।

1. Render Backend-এ `backend/.env.example` ও root `.env.example` অনুসারে environment variables দিন।
2. Netlify-তে `BACKEND_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` দিন।
3. Android-এর জন্য `android/local.properties.example` কপি করে `android/local.properties` বানিয়ে প্রকৃত মান বসান।
4. AI Provider secret key শুধু Render backend environment বা সুরক্ষিত backend Admin API দিয়ে সেট করুন। Frontend bundle বা Android APK-তে Provider secret / Supabase service-role key দেবেন না।

## Build commands

```bash
# Backend
npm --prefix backend install
npm --prefix backend run build
npm --prefix backend test

# Web
npm --prefix web install
npm --prefix web run typecheck
npm --prefix web run build

# Android (Android Studio / Android SDK / JDK 17 প্রয়োজন)
cd android
./gradlew assembleDebug
```

## Supabase

`backend/supabase/migrations/001_sora.sql` migration আপনার Supabase SQL Editor-এ চালাতে হবে। Admin role promotion-এর SQL template আলাদা করে পরীক্ষা করে তারপর প্রয়োগ করবেন।

## যাচাইয়ের সীমা

ZIP CRC/integrity, source-file presence, frontend relative imports, Android XML এবং source-level API route mapping যাচাই করা হয়েছে। এই পরিবেশে npm registry/Gradle distribution download timeout হওয়ায় dependency-based TypeScript/Vite build এবং Android APK build সম্পন্ন করা যায়নি। Supabase, Render, Netlify, AI provider এবং বাস্তব ফোনে live integration-ও অ্যাকাউন্ট/নেটওয়ার্ক ছাড়া পরীক্ষা করা যায় না। এগুলোকে সফল বলে দাবি করা হয়নি।

## Netlify-তে Unified ZIP Deploy
Root-এ থাকা `netlify.toml` Netlify-কে `web/` Base Directory ব্যবহার করতে বলে। ZIP সরাসরি “Dropped files”-এ দেবেন না। ZIP Extract করে সম্পূর্ণ repository GitHub-এ push করুন, তারপর Netlify-তে Git repository import করুন। বিস্তারিত `NETLIFY-DEPLOY-BN.md` দেখুন।
