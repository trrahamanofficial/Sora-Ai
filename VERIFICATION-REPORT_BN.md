# SORA A–Z Verification Report

| পরীক্ষা | ফলাফল |
|---|---|
| ZIP integrity | PASS (local archive check) |
| JSON syntax | PASS (local parse) |
| Android XML syntax | PASS (local parse) |
| Supabase URL/key inserted in public config | PASS (static check) |
| Existing Auth-user profile backfill in SQL | INCLUDED (SQL not executed on live project) |
| Web production build | NOT VERIFIED — npm dependency install timed out |
| Android APK build | NOT VERIFIED — Android SDK/Gradle build not run |
| Live Supabase migration | NOT RUN — user must execute SQL in project |
| Live Backend / AI provider | NOT VERIFIED — Render URL, service-role secret and provider key not supplied |
| Real-device testing | NOT RUN |

No pending result is relabeled as PASS. See `শুরু-করুন-বাংলা.md` and `RUN_THIS_SQL_IN_SUPABASE.sql`.
