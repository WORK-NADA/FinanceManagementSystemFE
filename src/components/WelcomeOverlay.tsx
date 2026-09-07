import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useWelcomeStore } from '../store/welcomeStore';
import { useThemeStore } from '../store/themeStore';
import { typewriterAudio } from '../lib/typewriterAudio';
import { welcomeVoice } from '../lib/welcomeVoice';
import { VyaparIcon } from './VyaparLogo';
import { cn } from '@/lib/cn';
import { Sparkles, ShieldCheck, ArrowRight, Volume2, VolumeX } from 'lucide-react';

/**
 * Typewriter progressive states for 'व्यापार'
 * Handled via linguistic akshara clusters to prevent any broken half-forms or glyph glitching.
 */
const TYPEWRITER_STAGES = [
  'व्',
  'व्या',
  'व्यापा',
  'व्यापार',
];

const STAGE_INTERVAL_MS = 340;     // Slow, elegant, visually pleasing typing cadence
const MIN_HOLD_DURATION_MS = 5000; // Minimum 5-second hold duration

export const WelcomeOverlay: React.FC = () => {
  const { isOpen, username, closeWelcome } = useWelcomeStore();
  const theme = useThemeStore((state) => state.theme);

  const [currentText, setCurrentText] = useState('');
  const [isTypingComplete, setIsTypingComplete] = useState(false);
  const [showGreeting, setShowGreeting] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [progressActive, setProgressActive] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(() => typewriterAudio.isSoundMuted());

  const minHoldFinishedRef = useRef(false);
  const voiceFinishedRef = useRef(false);
  const hasTriggeredExitRef = useRef(false);

  const minHoldTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeStartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Check user preference for reduced motion
  const prefersReducedMotion = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  const triggerRevealAndExit = useCallback(() => {
    if (hasTriggeredExitRef.current) return;
    hasTriggeredExitRef.current = true;

    // Step 9: Play the premium opening & reveal sound
    typewriterAudio.playOpeningReveal();

    // Step 10: Synchronize with smooth fade/transition of the welcome overlay
    fadeStartTimerRef.current = setTimeout(() => {
      setIsExiting(true);
    }, 280);

    // Step 11: Reveal the main application and unmount overlay
    exitTimerRef.current = setTimeout(() => {
      closeWelcome();
    }, 1250);
  }, [closeWelcome]);

  const checkHoldAndReveal = useCallback(() => {
    // Both conditions must be satisfied:
    // 1. Minimum 5-second hold has finished
    // 2. The welcome voice has completely finished speaking
    if (minHoldFinishedRef.current && voiceFinishedRef.current) {
      triggerRevealAndExit();
    }
  }, [triggerRevealAndExit]);

  const handleManualEnter = () => {
    if (hasTriggeredExitRef.current) return;
    // Cancel any ongoing voice immediately on manual bypass
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore
      }
    }
    triggerRevealAndExit();
  };

  const handleToggleMute = () => {
    const next = typewriterAudio.toggleMute();
    welcomeVoice.setMuted(next);
    setIsAudioMuted(next);
  };

  useEffect(() => {
    if (!isOpen) {
      // Reset all internal states when overlay closes
      setCurrentText('');
      setIsTypingComplete(false);
      setShowGreeting(false);
      setIsExiting(false);
      setProgressActive(false);
      setIsMounted(false);
      minHoldFinishedRef.current = false;
      voiceFinishedRef.current = false;
      hasTriggeredExitRef.current = false;

      if (minHoldTimerRef.current) clearTimeout(minHoldTimerRef.current);
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
      if (fadeStartTimerRef.current) clearTimeout(fadeStartTimerRef.current);
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];

      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // Ignore
        }
      }
      return;
    }

    minHoldFinishedRef.current = false;
    voiceFinishedRef.current = false;
    hasTriggeredExitRef.current = false;

    // Trigger mounted entrance animation
    const mountTimer = setTimeout(() => setIsMounted(true), 25);
    timeoutsRef.current.push(mountTimer);

    // If reduced motion is preferred, render text immediately and run audio sequence
    if (prefersReducedMotion) {
      setCurrentText('व्यापार');
      setIsTypingComplete(true);
      setShowGreeting(true);
      setProgressActive(true);

      welcomeVoice.speakWelcome(
        username,
        () => {},
        () => {
          voiceFinishedRef.current = true;
          checkHoldAndReveal();
        }
      );

      minHoldTimerRef.current = setTimeout(() => {
        minHoldFinishedRef.current = true;
        checkHoldAndReveal();
      }, MIN_HOLD_DURATION_MS);

      return () => {
        clearTimeout(mountTimer);
        if (minHoldTimerRef.current) clearTimeout(minHoldTimerRef.current);
        if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
        if (fadeStartTimerRef.current) clearTimeout(fadeStartTimerRef.current);
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          try {
            window.speechSynthesis.cancel();
          } catch {
            // Ignore
          }
        }
      };
    }

    // ── Exact Sequence Execution ──
    // Step 1: Welcome screen appears (0ms - 350ms)
    // Step 2 & 3: “व्यापार” appears character-by-character with slow, elegant typing sound
    const startDelay = 350;

    TYPEWRITER_STAGES.forEach((stage, idx) => {
      const isFinal = idx === TYPEWRITER_STAGES.length - 1;

      const t = setTimeout(() => {
        setCurrentText(stage);

        // Step 3: Play one soft, gentle key-press sound for this individual character
        typewriterAudio.playSoftKeyStroke(isFinal);

        // Step 4: Final character appears ('व्यापार')
        if (isFinal) {
          // Step 5: Wait for final typing sound to finish completely (+280ms acoustic pause)
          const voiceStartTimer = setTimeout(() => {
            setIsTypingComplete(true);
            setShowGreeting(true);

            // Trigger progress bar transition smoothly
            setTimeout(() => setProgressActive(true), 30);

            // Step 6: ONLY NOW start the female voice: “Welcome <username>”
            // Zero overlap with typing sound!
            welcomeVoice.speakWelcome(
              username,
              () => {},
              () => {
                // Welcome voice has finished completely
                voiceFinishedRef.current = true;
                checkHoldAndReveal();
              }
            );

            // Step 7: 5-second minimum hold timer begins right now after typing has finished
            minHoldTimerRef.current = setTimeout(() => {
              minHoldFinishedRef.current = true;
              checkHoldAndReveal();
            }, MIN_HOLD_DURATION_MS);

          }, 280);

          timeoutsRef.current.push(voiceStartTimer);
        }
      }, startDelay + idx * STAGE_INTERVAL_MS);

      timeoutsRef.current.push(t);
    });

    return () => {
      clearTimeout(mountTimer);
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
      if (minHoldTimerRef.current) clearTimeout(minHoldTimerRef.current);
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
      if (fadeStartTimerRef.current) clearTimeout(fadeStartTimerRef.current);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // Ignore
        }
      }
    };
  }, [isOpen, prefersReducedMotion, username, checkHoldAndReveal]);

  if (!isOpen) return null;

  const isDark = theme === 'dark';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to व्यापार Enterprise ERP"
      className={cn(
        'fixed inset-0 z-[99999] flex flex-col items-center justify-center select-none overflow-hidden transition-all duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)]',
        isExiting
          ? 'opacity-0 scale-[1.02] pointer-events-none'
          : 'opacity-100 scale-100 pointer-events-auto',
        isDark
          ? 'bg-[#080C14] text-slate-100'
          : 'bg-[#F4F6F9] text-slate-900'
      )}
      style={{
        backgroundColor: isDark ? '#080C14' : '#F4F6F9',
      }}
    >
      {/* ── Bespoke Sophisticated Ambient Lighting Background ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Subtle executive grid watermark */}
        <div
          className={cn(
            'absolute inset-0 opacity-[0.035] bg-[radial-gradient(#0F7B5C_1px,transparent_1px)] [background-size:24px_24px]',
            isDark ? 'opacity-[0.05]' : 'opacity-[0.04]'
          )}
        />

        {/* Primary Emerald Ambient Glow (Top Center) */}
        <div
          className={cn(
            'absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl transition-all duration-1000',
            isDark
              ? 'w-[520px] h-[520px] bg-emerald-600/15'
              : 'w-[480px] h-[480px] bg-emerald-500/10',
            isMounted ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
          )}
        />

        {/* Prosperity Gold Accent Glow (Bottom Center) */}
        <div
          className={cn(
            'absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/4 rounded-full blur-3xl transition-all duration-1000 delay-150',
            isDark
              ? 'w-[420px] h-[420px] bg-[#C9A227]/10'
              : 'w-[380px] h-[380px] bg-[#C9A227]/8',
            isMounted ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
          )}
        />

        {/* Subtle radial vignette to soften edges */}
        <div
          className={cn(
            'absolute inset-0',
            isDark
              ? 'bg-[radial-gradient(circle_at_center,transparent_40%,rgba(6,9,14,0.85)_100%)]'
              : 'bg-[radial-gradient(circle_at_center,transparent_40%,rgba(230,235,242,0.75)_100%)]'
          )}
        />
      </div>

      {/* ── Center Stage Container ── */}
      <div className="relative z-10 max-w-xl w-full mx-auto px-6 flex flex-col items-center text-center">
        {/* ── 1. The Bespoke “व्यापार” Hero Emblem ── */}
        <div
          className={cn(
            'relative mb-6 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]',
            isMounted ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-4'
          )}
        >
          {/* Subtle Outer Halo Ring */}
          <div
            className={cn(
              'absolute -inset-3 rounded-3xl blur-md transition-all duration-700',
              isDark
                ? 'bg-emerald-500/20 shadow-[0_0_40px_rgba(16,185,129,0.25)]'
                : 'bg-emerald-600/15 shadow-[0_0_35px_rgba(15,123,92,0.18)]'
            )}
          />

          {/* Hero Icon (88px x 88px) */}
          <div className="relative drop-shadow-xl">
            <VyaparIcon size={88} />
          </div>
        </div>

        {/* ── 2. The Application Name “व्यापार” Typewriter Reveal ── */}
        <div className="min-h-[72px] sm:min-h-[84px] flex items-center justify-center">
          <h1
            className={cn(
              'font-devanagari font-bold text-5xl sm:text-6xl md:text-7xl tracking-wide leading-none flex items-center',
              isDark
                ? 'text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-100 to-slate-300 drop-shadow-sm'
                : 'text-transparent bg-clip-text bg-gradient-to-b from-slate-900 via-slate-800 to-slate-700'
            )}
            style={{ letterSpacing: '0.02em' }}
          >
            <span>{currentText || '\u00A0'}</span>

            {/* Glowing Typewriter Caret Cursor */}
            {!isTypingComplete && (
              <span
                className={cn(
                  'inline-block w-[3.5px] h-[0.85em] ml-1 rounded-full animate-pulse align-middle',
                  isDark
                    ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]'
                    : 'bg-emerald-600 shadow-[0_0_8px_rgba(15,123,92,0.6)]'
                )}
                aria-hidden="true"
              />
            )}
          </h1>
        </div>

        {/* ── 3. Enterprise ERP Subtitle ── */}
        <div
          className={cn(
            'mt-2.5 flex items-center gap-2 transition-all duration-500',
            showGreeting ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          )}
        >
          <span
            className={cn(
              'font-sans text-xs sm:text-sm font-semibold tracking-[0.26em] uppercase',
              isDark ? 'text-emerald-400/90' : 'text-[#0F7B5C]'
            )}
          >
            Enterprise ERP &amp; Finance
          </span>
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#C9A227]" />
          <span
            className={cn(
              'font-sans text-[11px] sm:text-xs font-medium tracking-wider',
              isDark ? 'text-slate-400' : 'text-slate-500'
            )}
          >
            Business Management
          </span>
        </div>

        {/* ── 4. Elegant Hairline Divider ── */}
        <div
          className={cn(
            'w-40 sm:w-48 h-px my-6 transition-all duration-700 delay-100',
            isDark
              ? 'bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent'
              : 'bg-gradient-to-r from-transparent via-emerald-600/30 to-transparent',
            showGreeting ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-50'
          )}
        />

        {/* ── 5. Personalized "Welcome <username>" Section ── */}
        <div
          className={cn(
            'space-y-2 transition-all duration-700 ease-out',
            showGreeting ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
          )}
        >
          <div className="flex items-center justify-center gap-2">
            <Sparkles className="h-4 w-4 text-[#C9A227] animate-pulse" />
            <h2 className="text-xl sm:text-2xl md:text-3xl font-serif tracking-normal">
              <span className={isDark ? 'text-slate-300 font-light' : 'text-slate-600 font-light'}>
                Welcome,&nbsp;
              </span>
              <span
                className={cn(
                  'font-semibold',
                  isDark
                    ? 'text-emerald-300 drop-shadow-[0_0_12px_rgba(52,211,153,0.3)]'
                    : 'text-emerald-800'
                )}
              >
                {username}
              </span>
            </h2>
            <Sparkles className="h-4 w-4 text-[#C9A227] animate-pulse" />
          </div>

          <div className="flex items-center justify-center gap-1.5 text-xs sm:text-sm">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
              Session authenticated • Launching your workspace
            </span>
          </div>
        </div>

        {/* ── 6. Minimum 5-Second Executive Progress Track ── */}
        <div
          className={cn(
            'mt-8 w-56 sm:w-64 transition-all duration-500',
            showGreeting ? 'opacity-100' : 'opacity-0'
          )}
        >
          <div
            className={cn(
              'h-1 w-full rounded-full overflow-hidden p-[1px]',
              isDark ? 'bg-slate-800/80 border border-slate-700/50' : 'bg-slate-200/80 border border-slate-300/40'
            )}
          >
            <div
              className={cn(
                'h-full rounded-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-[#C9A227]',
                progressActive ? 'w-full' : 'w-0'
              )}
              style={{
                transition: progressActive
                  ? `width ${MIN_HOLD_DURATION_MS}ms linear`
                  : 'none',
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Discreet Direct Entry & Audio Mute Controls ── */}
      <div
        className={cn(
          'absolute bottom-6 right-6 flex items-center gap-2 transition-all duration-500',
          showGreeting ? 'opacity-80 hover:opacity-100' : 'opacity-0 pointer-events-none'
        )}
      >
        <button
          type="button"
          onClick={handleToggleMute}
          className={cn(
            'flex items-center justify-center p-2 rounded-full text-xs font-medium cursor-pointer transition-all border',
            isDark
              ? 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border-slate-700/60 hover:bg-slate-800/80'
              : 'bg-white/70 text-slate-600 hover:text-slate-900 border-slate-200 hover:bg-white'
          )}
          title={isAudioMuted ? 'Unmute voice & sound' : 'Mute voice & sound'}
          aria-label={isAudioMuted ? 'Unmute voice & sound' : 'Mute voice & sound'}
        >
          {isAudioMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
        </button>

        <button
          type="button"
          onClick={handleManualEnter}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-all border',
            isDark
              ? 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border-slate-700/60 hover:bg-slate-800/80'
              : 'bg-white/70 text-slate-600 hover:text-slate-900 border-slate-200 hover:bg-white'
          )}
          title="Enter workspace immediately"
        >
          <span>Enter now</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

export default WelcomeOverlay;
