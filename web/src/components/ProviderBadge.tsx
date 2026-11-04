import React from 'react';
import { Cpu, Zap, Sparkles, ShieldCheck } from 'lucide-react';

export interface ProviderMeta {
  id: string;
  name: string;
  badgeColor: string;
  iconColor: string;
  defaultModel: string;
}

export const PROVIDER_CATALOG: Record<string, ProviderMeta> = {
  openai: {
    id: 'openai',
    name: 'OpenAI',
    badgeColor: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    iconColor: 'text-emerald-400',
    defaultModel: 'gpt-4o',
  },
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    badgeColor: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
    iconColor: 'text-blue-400',
    defaultModel: 'gemini-2.5-flash',
  },
  claude: {
    id: 'claude',
    name: 'Anthropic Claude',
    badgeColor: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    iconColor: 'text-amber-400',
    defaultModel: 'claude-3-5-sonnet',
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    badgeColor: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300',
    iconColor: 'text-cyan-400',
    defaultModel: 'deepseek-chat',
  },
  grok: {
    id: 'grok',
    name: 'xAI Grok',
    badgeColor: 'border-neutral-400/30 bg-neutral-400/10 text-neutral-200',
    iconColor: 'text-neutral-300',
    defaultModel: 'grok-2',
  },
  mistral: {
    id: 'mistral',
    name: 'Mistral AI',
    badgeColor: 'border-orange-500/30 bg-orange-500/10 text-orange-300',
    iconColor: 'text-orange-400',
    defaultModel: 'mistral-large',
  },
  cohere: {
    id: 'cohere',
    name: 'Cohere',
    badgeColor: 'border-teal-500/30 bg-teal-500/10 text-teal-300',
    iconColor: 'text-teal-400',
    defaultModel: 'command-r-plus',
  },
  perplexity: {
    id: 'perplexity',
    name: 'Perplexity',
    badgeColor: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300',
    iconColor: 'text-indigo-400',
    defaultModel: 'sonar-pro',
  },
  qwen: {
    id: 'qwen',
    name: 'Alibaba Qwen',
    badgeColor: 'border-purple-500/30 bg-purple-500/10 text-purple-300',
    iconColor: 'text-purple-400',
    defaultModel: 'qwen-max',
  },
  llama: {
    id: 'llama',
    name: 'Meta Llama',
    badgeColor: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
    iconColor: 'text-sky-400',
    defaultModel: 'llama-3.3-70b',
  },
};

interface ProviderBadgeProps {
  providerId?: string;
  modelName?: string;
  latencyMs?: number;
  autoSelected?: boolean;
}

export const ProviderBadge: React.FC<ProviderBadgeProps> = ({
  providerId,
  modelName,
  latencyMs,
  autoSelected,
}) => {
  const meta = (providerId && PROVIDER_CATALOG[providerId.toLowerCase()]) || {
    id: providerId || 'sora',
    name: providerId ? providerId.toUpperCase() : 'SORA Core',
    badgeColor: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300',
    iconColor: 'text-cyan-400',
    defaultModel: modelName || 'auto-router',
  };

  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono border backdrop-blur-md transition-all duration-200">
      <div className={`p-0.5 rounded-full ${meta.badgeColor}`}>
        <Zap className="w-3 h-3" />
      </div>
      <span className="font-semibold text-slate-200">{meta.name}</span>
      <span className="text-slate-500 text-[10px]">({modelName || meta.defaultModel})</span>
      {autoSelected && (
        <span className="text-[9px] uppercase px-1 py-0.2 bg-cyan-950 text-cyan-400 border border-cyan-800/60 rounded">
          Auto
        </span>
      )}
      {typeof latencyMs === 'number' && latencyMs > 0 && (
        <span className="text-[10px] text-slate-500 ml-1">{latencyMs}ms</span>
      )}
    </div>
  );
};
