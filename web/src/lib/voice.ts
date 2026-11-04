// Voice recognition and synthesis helper for SORA

export interface VoiceState {
  isListening: boolean;
  isSpeaking: boolean;
  permissionGranted: boolean | null; // null = not requested, true = granted, false = denied
  audioLevel: number; // 0 to 1 for visualizer
  error: string | null;
  transcript: string;
}

export type VoiceLanguage = 'bn-BD' | 'en-US';

// Extended window interface for speech recognition
interface IWindow extends Window {
  webkitSpeechRecognition?: any;
  SpeechRecognition?: any;
}

export class VoiceAssistantController {
  private recognition: any = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private animationFrameId: number | null = null;
  private currentLanguage: VoiceLanguage = 'bn-BD';
  private onStateChange: (state: Partial<VoiceState>) => void;
  private onFinalTranscript: (text: string) => void;
  private isExplicitlyStarted = false;

  constructor(
    onStateChange: (state: Partial<VoiceState>) => void,
    onFinalTranscript: (text: string) => void
  ) {
    this.onStateChange = onStateChange;
    this.onFinalTranscript = onFinalTranscript;
  }

  public setLanguage(lang: VoiceLanguage) {
    this.currentLanguage = lang;
    if (this.recognition && this.isExplicitlyStarted) {
      this.recognition.lang = lang;
    }
  }

  public async startListening(): Promise<boolean> {
    const win = window as unknown as IWindow;
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      this.onStateChange({
        error: 'Speech recognition is not supported in this browser. Please use Google Chrome, Edge, or a WebSpeech-compatible browser.',
        isListening: false,
      });
      return false;
    }

    try {
      // 1. Explicitly request microphone stream for permission check and real-time audio visualization
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaStream = stream;
      this.setupAudioAnalysis(stream);

      // 2. Initialize recognition
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = this.currentLanguage;
      this.recognition.maxAlternatives = 1;

      this.isExplicitlyStarted = true;

      this.recognition.onstart = () => {
        this.onStateChange({
          isListening: true,
          permissionGranted: true,
          error: null,
          transcript: '',
        });
      };

      this.recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i];
          if (item.isFinal) {
            finalTranscript += item[0].transcript;
          } else {
            interimTranscript += item[0].transcript;
          }
        }

        const displayTranscript = finalTranscript || interimTranscript;
        this.onStateChange({ transcript: displayTranscript });

        if (finalTranscript.trim().length > 0) {
          this.onFinalTranscript(finalTranscript.trim());
        }
      };

      this.recognition.onerror = (event: any) => {
        if (event.error === 'no-speech') {
          // Normal idle, ignore
          return;
        }
        if (event.error === 'not-allowed') {
          this.onStateChange({
            error: 'Microphone access denied. Please allow microphone permissions in your browser.',
            permissionGranted: false,
            isListening: false,
          });
          this.stopListening();
          return;
        }
        this.onStateChange({
          error: `Speech recognition error: ${event.error}`,
        });
      };

      this.recognition.onend = () => {
        // If user didn't stop it and it naturally timed out, restart only if explicitly active
        if (this.isExplicitlyStarted) {
          try {
            this.recognition.start();
          } catch {
            this.stopListening();
          }
        } else {
          this.onStateChange({ isListening: false });
        }
      };

      this.recognition.start();
      return true;
    } catch (err: any) {
      this.onStateChange({
        error: err.message || 'Failed to access microphone. Please check permissions.',
        permissionGranted: false,
        isListening: false,
      });
      this.cleanupAudio();
      return false;
    }
  }

  public stopListening() {
    this.isExplicitlyStarted = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // ignore
      }
      this.recognition = null;
    }
    this.cleanupAudio();
    this.onStateChange({ isListening: false, audioLevel: 0 });
  }

  private setupAudioAnalysis(stream: MediaStream) {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      this.audioContext = new AudioCtx();
      const source = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);

      const dataArray = new Uint8Array(this.analyser.frequencyBinCount);

      const checkLevel = () => {
        if (!this.analyser || !this.isExplicitlyStarted) return;
        this.analyser.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        const normalized = Math.min(1, average / 128); // 0 to 1

        this.onStateChange({ audioLevel: normalized });
        this.animationFrameId = requestAnimationFrame(checkLevel);
      };

      checkLevel();
    } catch (e) {
      console.warn('Audio visualization not supported', e);
    }
  }

  private cleanupAudio() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch {}
      this.audioContext = null;
    }
    this.analyser = null;
  }

  // Text to Speech
  public speak(
    text: string,
    language: 'bn' | 'en' = 'en',
    onStart?: () => void,
    onEnd?: () => void
  ) {
    if (!('speechSynthesis' in window)) {
      console.warn('Text-to-speech is not supported in this browser.');
      return;
    }

    // Cancel any previous utterances
    window.speechSynthesis.cancel();

    // Clean text of markdown artifacts for natural speaking
    const cleanText = text
      .replace(/```[\s\S]*?```/g, 'Code block omitted.')
      .replace(/[*_#`~]/g, '')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    const targetLang = language === 'bn' ? 'bn-BD' : 'en-US';
    utterance.lang = targetLang;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Pick best matching voice
    const voices = window.speechSynthesis.getVoices();
    const matchingVoice = voices.find(
      (v) =>
        v.lang.toLowerCase().startsWith(language === 'bn' ? 'bn' : 'en') ||
        (language === 'bn' && v.name.toLowerCase().includes('bangla'))
    );
    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }

    utterance.onstart = () => {
      this.onStateChange({ isSpeaking: true });
      if (onStart) onStart();
    };

    utterance.onend = () => {
      this.onStateChange({ isSpeaking: false });
      if (onEnd) onEnd();
    };

    utterance.onerror = (e) => {
      console.warn('TTS error:', e);
      this.onStateChange({ isSpeaking: false });
      if (onEnd) onEnd();
    };

    window.speechSynthesis.speak(utterance);
  }

  public stopSpeaking() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      this.onStateChange({ isSpeaking: false });
    }
  }
}
