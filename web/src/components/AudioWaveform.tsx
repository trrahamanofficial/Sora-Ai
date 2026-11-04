import React from 'react';

interface AudioWaveformProps {
  isListening: boolean;
  isSpeaking: boolean;
  audioLevel: number;
}

export const AudioWaveform: React.FC<AudioWaveformProps> = ({
  isListening,
  isSpeaking,
  audioLevel,
}) => {
  // Generate 24 dynamic bars
  const barCount = 24;
  const bars = Array.from({ length: barCount }, (_, i) => i);

  return (
    <div className="flex flex-col items-center justify-center px-4 py-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl relative overflow-hidden group">
      {/* Ambient background glow */}
      <div
        className={`absolute -inset-1 rounded-2xl opacity-30 blur-xl transition-all duration-700 pointer-events-none ${
          isListening
            ? 'bg-gradient-to-r from-cyan-500 via-teal-400 to-blue-500 opacity-60'
            : isSpeaking
            ? 'bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 opacity-60'
            : 'bg-slate-700/20'
        }`}
      />

      {/* Futuristic status badge */}
      <div className="flex items-center gap-2 mb-4 z-10">
        <span
          className={`h-2.5 w-2.5 rounded-full transition-all duration-300 ${
            isListening
              ? 'bg-cyan-400 animate-ping'
              : isSpeaking
              ? 'bg-purple-400 animate-pulse'
              : 'bg-slate-600'
          }`}
        />
        <span className="text-xs uppercase font-mono tracking-widest text-slate-400">
          {isListening
            ? 'MIC ACTIVE • LISTENING'
            : isSpeaking
            ? 'SORA IS SPEAKING'
            : 'VOICE STANDBY'}
        </span>
      </div>

      {/* Waveform bars */}
      <div className="flex items-center justify-center gap-1.5 h-12 w-full max-w-md z-10 px-4">
        {bars.map((index) => {
          // Calculate dynamic height based on audioLevel and wave sin
          let scale = 0.15;
          if (isListening) {
            const distance = Math.abs(index - barCount / 2) / (barCount / 2);
            const wave = Math.sin((index / barCount) * Math.PI) * (audioLevel * 1.5 + 0.25);
            scale = Math.max(0.12, Math.min(1.0, wave + (Math.random() * 0.1 * audioLevel)));
          } else if (isSpeaking) {
            const time = Date.now() / 150;
            const wave = (Math.sin(index * 0.5 + time) + 1) / 2 * 0.75 + 0.2;
            scale = wave;
          }

          const heightPercent = Math.round(scale * 100);

          return (
            <div
              key={index}
              style={{ height: `${heightPercent}%` }}
              className={`w-1.5 rounded-full transition-all duration-75 ${
                isListening
                  ? 'bg-gradient-to-t from-cyan-600 to-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.6)]'
                  : isSpeaking
                  ? 'bg-gradient-to-t from-purple-600 to-pink-300 shadow-[0_0_8px_rgba(168,85,247,0.6)]'
                  : 'bg-slate-800'
              }`}
            />
          );
        })}
      </div>

      <div className="mt-2 text-[10px] text-slate-500 font-mono z-10 flex items-center gap-4">
        <span>STT: WebSpeech / Natural</span>
        <span>•</span>
        <span>TTS: Multi-Voice Bengali/English</span>
      </div>
    </div>
  );
};
