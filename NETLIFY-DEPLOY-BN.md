# Netlify Deploy (বাংলা)

এটি সম্পূর্ণ SORA A-to-Z source project। ZIP-টি Netlify-র manual drag-and-drop deploy-এ সরাসরি দেবেন না; Vite source থেকে আগে build হতে হবে।

## সঠিক পদ্ধতি
1. ZIP extract করুন।
2. Extract করা ফোল্ডারের সব ফাইল GitHub repository-র root-এ push/upload করুন। Root-এ `netlify.toml`, `web/`, `android/` থাকবে।
3. Netlify → Add new site → Import an existing project → GitHub repository নির্বাচন করুন।
4. `netlify.toml` অনুযায়ী Base directory `web`, Build command `npm run build`, Publish directory `dist` হবে।
5. Deploy log-এ Build ও Publish সফল হলে তবেই live URL খুলুন।

যদি Netlify-তে আগে থেকে site থাকে, নতুন deploy করার আগে Build settings-এ Base directory `web`, Build command `npm run build`, Publish directory `dist` নিশ্চিত করুন।

AI provider-এর secret key Netlify Site configuration → Environment variables-এ দিন; frontend-এ secret key রাখবেন না।


## Deploy-এর পর পরীক্ষা
1. মূল সাইট `/` খুলে লগইন ছাড়া একটি সাধারণ প্রশ্ন পাঠান।
2. Admin page খুলুন: `https://আপনার-সাইট.netlify.app/admin`।
3. Supabase Auth-এ তৈরি Admin email/password দিয়ে লগইন করুন। `profiles.role` অবশ্যই `admin` হতে হবে।
4. Dashboard stats/provider API কাজের জন্য Backend-এ `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ENCRYPTION_SECRET` এবং AI provider key থাকতে হবে। Netlify-তে `BACKEND_URL` সেট থাকতে হবে।

নোট: বর্তমান পরিবেশে dependency download timeout হওয়ায় production build ও live integration যাচাই করা যায়নি। Deploy-এর আগে/পরে Netlify Build log ও Backend health endpoint পরীক্ষা আবশ্যক।
