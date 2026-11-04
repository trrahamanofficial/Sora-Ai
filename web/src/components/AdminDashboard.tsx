import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Activity, Bot, Users, MessageSquare, LogOut, RefreshCw, Save, ShieldCheck, TestTube2 } from 'lucide-react';

type Provider = {
  id: string; name: string; displayName: string; enabled: boolean; hasKey: boolean;
  maskedKey?: string; defaultModel: string; baseUrl?: string; priority: number;
  supportsBengali: boolean; temperature: number; maxTokens: number;
  lastStatus?: string; lastErrorMessage?: string;
};
type Stats = { userCount: number; conversationCount: number; messageCount: number; enabledProvidersCount: number; totalProvidersCount: number; serverUptime: number };

export default function AdminDashboard() {
  const [session, setSession] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authorized, setAuthorized] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<Stats | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState('');

  const authHeaders = useCallback(() => session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}, [session]);
  const loadDashboard = useCallback(async (activeSession: any) => {
    setBusy(true); setError('');
    try {
      const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', activeSession.user.id).single();
      if (profileError || profile?.role !== 'admin') throw new Error('এই অ্যাকাউন্টের Admin অনুমতি নেই। Supabase profiles টেবিলে role=admin করুন।');
      const headers = { Authorization: `Bearer ${activeSession.access_token}` };
      const [statsRes, providerRes] = await Promise.all([fetch('/api/admin/stats', { headers }), fetch('/api/admin/providers', { headers })]);
      const statsData = await statsRes.json(); const providerData = await providerRes.json();
      if (!statsRes.ok) throw new Error(statsData.error || 'Dashboard stats load হয়নি।');
      if (!providerRes.ok) throw new Error(providerData.error || 'Provider list load হয়নি।');
      setStats(statsData); setProviders(providerData.providers || []); setAuthorized(true); setSession(activeSession);
    } catch (e: any) { setAuthorized(false); setError(e.message || 'Dashboard load failed.'); }
    finally { setBusy(false); }
  }, []);

  useEffect(() => { supabase.auth.getSession().then(({ data }) => { if (data.session) loadDashboard(data.session); }); }, [loadDashboard]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError('');
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (authError || !data.session) { setError(authError?.message || 'Login failed'); setBusy(false); return; }
    setPassword(''); await loadDashboard(data.session);
  };

  const saveProvider = async (provider: Provider) => {
    setBusy(true); setError(''); setNotice('');
    try {
      const body: any = { enabled: provider.enabled, defaultModel: provider.defaultModel, baseUrl: provider.baseUrl || '', priority: Number(provider.priority), supportsBengali: provider.supportsBengali, temperature: Number(provider.temperature), maxTokens: Number(provider.maxTokens) };
      if (keys[provider.id]?.trim()) body.apiKey = keys[provider.id].trim();
      const res = await fetch(`/api/admin/providers/${provider.id}`, { method: 'PUT', headers: { ...authHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error || 'Save failed');
      setNotice(`${provider.displayName} সংরক্ষণ হয়েছে।`); setKeys((v) => ({ ...v, [provider.id]: '' }));
      await loadDashboard(session);
    } catch (e: any) { setError(e.message); setBusy(false); }
  };

  const testProvider = async (provider: Provider) => {
    setBusy(true); setError(''); setNotice('');
    try { const res = await fetch(`/api/admin/providers/${provider.id}/test`, { method: 'POST', headers: authHeaders() }); const data = await res.json(); if (!res.ok || !data.success) throw new Error(data.message || data.error || 'Provider test failed'); setNotice(`${provider.displayName}: Test সফল হয়েছে।`); await loadDashboard(session); }
    catch (e: any) { setError(e.message); setBusy(false); }
  };

  const update = (id: string, patch: Partial<Provider>) => setProviders((all) => all.map((p) => p.id === id ? { ...p, ...patch } : p));
  const logout = async () => { await supabase.auth.signOut(); setAuthorized(false); setSession(null); setStats(null); setProviders([]); };
  const field = 'w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500';

  return <main className="min-h-screen bg-[#07090e] text-slate-100 p-4 sm:p-8">
    <div className="max-w-6xl mx-auto">
      <header className="flex items-center justify-between gap-3 border-b border-slate-800 pb-5 mb-6"><div className="flex items-center gap-3"><div className="p-3 rounded-xl bg-cyan-500/15 text-cyan-300"><ShieldCheck /></div><div><h1 className="text-xl font-bold tracking-wide">SORA ADMIN</h1><p className="text-xs text-slate-400">Secure control dashboard</p></div></div>{authorized && <button onClick={logout} className="flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm"><LogOut size={16}/> Logout</button>}</header>
      {!authorized ? <section className="max-w-md mx-auto mt-16 rounded-2xl border border-slate-800 bg-slate-900/70 p-6"><h2 className="text-lg font-semibold mb-1">Admin Login</h2><p className="text-sm text-slate-400 mb-5">Supabase Admin account দিয়ে প্রবেশ করুন।</p><form onSubmit={signIn} className="space-y-3"><input className={field} type="email" required placeholder="Admin email" value={email} onChange={e=>setEmail(e.target.value)}/><input className={field} type="password" required placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)}/><button disabled={busy} className="w-full rounded-lg bg-cyan-500 py-2.5 font-semibold text-slate-950 disabled:opacity-50">{busy ? 'যাচাই হচ্ছে…' : 'Login to Dashboard'}</button></form>{error && <p className="mt-4 text-sm text-rose-300">{error}</p>}</section> : <>
        <div className="flex justify-between items-center mb-5"><div><h2 className="text-lg font-semibold">Overview</h2><p className="text-xs text-slate-400">System status and AI provider controls</p></div><button onClick={()=>loadDashboard(session)} className="flex items-center gap-2 text-sm border border-slate-700 rounded-lg px-3 py-2"><RefreshCw size={15}/> Refresh</button></div>
        {stats && <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-7">{[{label:'Users',value:stats.userCount,Icon:Users},{label:'Conversations',value:stats.conversationCount,Icon:MessageSquare},{label:'Messages',value:stats.messageCount,Icon:Activity},{label:'Enabled AI',value:`${stats.enabledProvidersCount}/${stats.totalProvidersCount}`,Icon:Bot}].map(({label,value,Icon})=><div key={label} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"><Icon className="text-cyan-300 mb-3" size={19}/><div className="text-2xl font-bold">{value}</div><div className="text-xs text-slate-400">{label}</div></div>)}</div>}
        {notice && <p className="mb-4 rounded-lg border border-emerald-800 bg-emerald-950/40 p-3 text-sm text-emerald-300">{notice}</p>}{error && <p className="mb-4 rounded-lg border border-rose-800 bg-rose-950/40 p-3 text-sm text-rose-300">{error}</p>}
        <h2 className="text-lg font-semibold mb-3">AI Provider Settings</h2><div className="grid gap-4">{providers.map(p=><section key={p.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-3 mb-4"><div><h3 className="font-semibold">{p.displayName}</h3><p className="text-xs text-slate-500">{p.id} · {p.lastStatus || 'not tested'}</p></div><label className="text-sm flex items-center gap-2"><input type="checkbox" checked={p.enabled} onChange={e=>update(p.id,{enabled:e.target.checked})}/> Enabled</label></div><div className="grid sm:grid-cols-2 gap-3"><label className="text-xs text-slate-400">API Key<input className={field+' mt-1'} type="password" placeholder={p.maskedKey || (p.hasKey?'Key configured':'Paste API key')} value={keys[p.id] || ''} onChange={e=>setKeys(v=>({...v,[p.id]:e.target.value}))}/></label><label className="text-xs text-slate-400">Model<input className={field+' mt-1'} value={p.defaultModel || ''} onChange={e=>update(p.id,{defaultModel:e.target.value})}/></label><label className="text-xs text-slate-400">Base URL<input className={field+' mt-1'} value={p.baseUrl || ''} onChange={e=>update(p.id,{baseUrl:e.target.value})}/></label><label className="text-xs text-slate-400">Priority<input className={field+' mt-1'} type="number" min="1" max="100" value={p.priority} onChange={e=>update(p.id,{priority:Number(e.target.value)})}/></label></div><div className="flex flex-wrap items-center justify-between gap-3 mt-4"><label className="text-xs text-slate-400 flex items-center gap-2"><input type="checkbox" checked={p.supportsBengali} onChange={e=>update(p.id,{supportsBengali:e.target.checked})}/> Bengali support</label><div className="flex gap-2"><button disabled={busy} onClick={()=>testProvider(p)} className="flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs disabled:opacity-50"><TestTube2 size={14}/> Test</button><button disabled={busy} onClick={()=>saveProvider(p)} className="flex items-center gap-2 rounded-lg bg-cyan-500 px-3 py-2 text-xs font-semibold text-slate-950 disabled:opacity-50"><Save size={14}/> Save</button></div></div></section>)}</div>
      </>}
    </div>
  </main>;
}
