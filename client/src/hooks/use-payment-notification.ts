import { useCallback, useRef, useEffect } from "react";

// Base64-encoded short "cha-ching" cash register sound
const PAYMENT_SOUND_BASE64 = "data:audio/mp3;base64,//uQxAAAAAANIAAAAAExBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVXl0aW1lIGlzIDAuMDAwMDAwIHNlY29uZHMK//uQxCYAAADSAAAAAAAAANIAAAAA";

interface UsePaymentNotificationOptions {
  enabled?: boolean;
  volume?: number;
}

export function usePaymentNotification(options: UsePaymentNotificationOptions = {}) {
  const { enabled = true, volume = 0.5 } = options;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastPlayedRef = useRef<number>(0);

  useEffect(() => {
    if (typeof window !== "undefined" && enabled) {
      // Create audio element with a simple notification sound
      audioRef.current = new Audio();
      audioRef.current.volume = volume;
      
      // Use Web Audio API for generating a simple notification sound
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create a simple beep sound
      const createSound = () => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(1100, audioContext.currentTime + 0.1);
        oscillator.frequency.setValueAtTime(880, audioContext.currentTime + 0.2);
        
        gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
      };
      
      audioRef.current = { play: createSound } as any;
    }
    
    return () => {
      audioRef.current = null;
    };
  }, [enabled, volume]);

  const playNotification = useCallback(() => {
    if (!enabled) return;
    
    // Throttle to prevent multiple sounds in rapid succession
    const now = Date.now();
    if (now - lastPlayedRef.current < 1000) return;
    lastPlayedRef.current = now;

    try {
      if (audioRef.current?.play) {
        audioRef.current.play();
      }
    } catch (error) {
      console.log("Could not play notification sound:", error);
    }
  }, [enabled]);

  const requestPermission = useCallback(async () => {
    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }
  }, []);

  const showNotification = useCallback(
    (title: string, body: string) => {
      if (!enabled) return;

      // Play sound
      playNotification();

      // Show browser notification if permitted
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, {
          body,
          icon: "/icons/icon-192x192.png",
          badge: "/icons/icon-72x72.png",
          tag: "payment",
        });
      }
    },
    [enabled, playNotification]
  );

  return {
    playNotification,
    showNotification,
    requestPermission,
  };
}
