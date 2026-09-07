/**
 * Premium In-Car Assistant Voice Engine for 'व्यापार'
 *
 * Emulates a calm, sophisticated, warm female voice assistant
 * (similar to a luxury BMW or Mercedes in-vehicle startup greeting).
 *
 * Characteristics:
 * - Soft, feminine, calm, and sophisticated
 * - Warm and welcoming, clear and natural
 * - Unhurried cadence (rate ~0.90)
 * - Safe fallbacks: if browser speech synthesis is restricted or unavailable,
 *   callbacks complete gracefully without stalling the sequence.
 */

class WelcomeVoiceService {
  private isMuted: boolean = false;

  constructor() {
    try {
      const saved = localStorage.getItem('vyapar_welcome_muted');
      if (saved !== null) {
        this.isMuted = saved === 'true';
      }
    } catch {
      this.isMuted = false;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      // Pre-warm voices list
      window.speechSynthesis.getVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => {
          window.speechSynthesis.getVoices();
        };
      }
    }
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (muted && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore
      }
    }
  }

  public isVoiceMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Speaks "Welcome <username>" with a warm, calm, sophisticated female voice.
   * 
   * @param username Actual logged-in user display name
   * @param onStart Callback when voice begins speaking
   * @param onEnd Callback when voice finishes speaking completely
   */
  public speakWelcome(
    username: string,
    onStart?: () => void,
    onEnd?: () => void
  ): void {
    const safeUsername = username?.trim() || 'User';

    // If muted or speech synthesis is not supported, invoke callbacks safely
    if (
      this.isMuted ||
      typeof window === 'undefined' ||
      !('speechSynthesis' in window)
    ) {
      onStart?.();
      // Simulate natural speech duration (~1.5s) before signaling completion
      setTimeout(() => {
        onEnd?.();
      }, 1500);
      return;
    }

    try {
      // Cancel any leftover utterance
      window.speechSynthesis.cancel();

      const text = `Welcome, ${safeUsername}`;
      const utterance = new SpeechSynthesisUtterance(text);

      const voices = window.speechSynthesis.getVoices();
      const bestFemaleVoice = this.selectBestFemaleVoice(voices);

      if (bestFemaleVoice) {
        utterance.voice = bestFemaleVoice;
        utterance.lang = bestFemaleVoice.lang || 'en-US';
      } else {
        utterance.lang = 'en-US';
      }

      // BMW luxury assistant delivery: unhurried, calm, composed, warm
      utterance.rate = 0.90;   // Calm, unhurried cadence
      utterance.pitch = 1.05;  // Warm, natural feminine pitch
      utterance.volume = 0.85; // Soft, comfortable listening volume

      let hasFinished = false;
      const finish = () => {
        if (!hasFinished) {
          hasFinished = true;
          onEnd?.();
        }
      };

      utterance.onstart = () => {
        onStart?.();
      };

      utterance.onend = () => {
        finish();
      };

      utterance.onerror = () => {
        // In case speech fails or is blocked by browser policy
        finish();
      };

      // Watchdog timeout to guarantee sequence progression even if speech API stalls
      const estimatedDurationMs = Math.max(3000, safeUsername.length * 140 + 1500);
      setTimeout(() => {
        if (!hasFinished) {
          finish();
        }
      }, estimatedDurationMs);

      window.speechSynthesis.speak(utterance);
    } catch {
      onStart?.();
      onEnd?.();
    }
  }

  /**
   * Prioritizes high-end, natural female English voices.
   */
  private selectBestFemaleVoice(
    voices: SpeechSynthesisVoice[]
  ): SpeechSynthesisVoice | null {
    if (!voices || voices.length === 0) return null;

    // Preferred natural, high-fidelity female voices
    const preferredVoices = [
      'Microsoft Jenny Online (Natural)',
      'Microsoft Aria Online (Natural)',
      'Microsoft Sonia Online (Natural)',
      'Microsoft Libby Online (Natural)',
      'Google UK English Female',
      'Google US English',
      'Samantha',
      'Victoria',
      'Karen',
      'Moira',
      'Tessa',
      'Microsoft Zira',
    ];

    for (const name of preferredVoices) {
      const match = voices.find((v) =>
        v.name.toLowerCase().includes(name.toLowerCase())
      );
      if (match) return match;
    }

    // Secondary: Any English voice flagged as female or natural
    const englishVoices = voices.filter((v) => v.lang.startsWith('en'));
    const femaleMatch = englishVoices.find((v) => {
      const lower = v.name.toLowerCase();
      return lower.includes('female') || lower.includes('natural');
    });
    if (femaleMatch) return femaleMatch;

    // Fallback: First English voice
    if (englishVoices.length > 0) return englishVoices[0];

    return voices[0] || null;
  }
}

export const welcomeVoice = new WelcomeVoiceService();
