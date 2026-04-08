import { useRef, useState, useCallback, useEffect } from 'react';

interface RecordingResult {
  url: string;
  duration: number;
  thumbnail: string;
}

export interface UseScreenRecorderReturn {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  cameraStream: MediaStream | null;
  startRecording: (mode?: 'screen' | 'screen-camera') => Promise<boolean>;
  stopRecording: () => Promise<RecordingResult | null>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  cancelRecording: () => void;
}

/** Generate a thumbnail data-URL from the first frame of a video blob */
async function generateThumbnail(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    const url = URL.createObjectURL(blob);
    video.src = url;

    video.onloadeddata = () => {
      video.currentTime = 0.1;
    };

    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }
      const thumbnail = canvas.toDataURL('image/jpeg', 0.8);
      URL.revokeObjectURL(url);
      resolve(thumbnail);
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(generatePlaceholderThumbnail(0));
    };
  });
}

/** Generate a placeholder thumbnail (no video blob available) */
function generatePlaceholderThumbnail(durationSecs: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#EF4444';
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2 - 60, 40, 0, 2 * Math.PI);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 52px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Screen Recording', canvas.width / 2, canvas.height / 2 + 40);

    const mins = Math.floor(durationSecs / 60);
    const secs = durationSecs % 60;
    const durationStr = `${mins}:${secs.toString().padStart(2, '0')}`;
    ctx.font = '36px sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(durationStr, canvas.width / 2, canvas.height / 2 + 100);
  }
  return canvas.toDataURL('image/jpeg', 0.85);
}

/**
 * Mix multiple audio-capable MediaStreams into a single destination stream.
 * Returns [destinationStream, audioContext] so caller can close the context later.
 */
function mixAudioStreams(streams: MediaStream[]): [MediaStream, AudioContext] {
  const audioCtx = new AudioContext();
  const dest = audioCtx.createMediaStreamDestination();

  for (const stream of streams) {
    if (stream.getAudioTracks().length > 0) {
      audioCtx.createMediaStreamSource(stream).connect(dest);
    }
  }

  return [dest.stream, audioCtx];
}

export function useScreenRecorder(): UseScreenRecorderReturn {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedDurationRef = useRef<number>(0);
  const pauseStartRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      stopAllStreams();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopAllStreams = () => {
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current = null;

    cameraStreamRef.current?.getTracks().forEach(t => t.stop());
    cameraStreamRef.current = null;
    setCameraStream(null);

    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
  };

  const startTimer = () => {
    startTimeRef.current = Date.now() - pausedDurationRef.current * 1000;
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setDuration(elapsed);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startRecording = useCallback(async (mode: 'screen' | 'screen-camera' = 'screen'): Promise<boolean> => {
    try {
      // ── Step 1: Capture screen (always) ──────────────────
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        audio: true, // system audio (may be unavailable on macOS without extension)
      });
      screenStreamRef.current = screenStream;

      // ── Step 2: Capture camera + mic (screen-camera mode) ─
      let camStream: MediaStream | null = null;
      if (mode === 'screen-camera') {
        try {
          camStream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: 'user',
            },
            audio: true, // microphone
          });
          cameraStreamRef.current = camStream;
          setCameraStream(camStream);
        } catch (camErr) {
          console.warn('Camera/mic access denied, falling back to screen-only:', camErr);
        }
      } else {
        // Screen-only mode: still try to grab microphone for voiceover
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          cameraStreamRef.current = micStream; // store it so we clean it up
        } catch {
          // Mic not available — continue silently
        }
      }

      // ── Step 3: Build the composite stream for MediaRecorder ──
      // Video track: always the screen
      const videoTrack = screenStream.getVideoTracks()[0];
      const compositeStream = new MediaStream([videoTrack]);

      // Audio: mix screen audio + mic/camera audio using AudioContext
      const audioSourceStreams: MediaStream[] = [];
      if (screenStream.getAudioTracks().length > 0) {
        audioSourceStreams.push(screenStream);
      }
      if (cameraStreamRef.current && cameraStreamRef.current.getAudioTracks().length > 0) {
        audioSourceStreams.push(cameraStreamRef.current);
      }

      if (audioSourceStreams.length > 0) {
        const [mixedAudioStream, audioCtx] = mixAudioStreams(audioSourceStreams);
        audioCtxRef.current = audioCtx;
        mixedAudioStream.getAudioTracks().forEach(t => compositeStream.addTrack(t));
      }

      // ── Step 4: Create MediaRecorder on the composite stream ──
      const mimeType = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
        'video/mp4',
      ].find(t => MediaRecorder.isTypeSupported(t)) || '';

      chunksRef.current = [];
      pausedDurationRef.current = 0;

      const recorder = new MediaRecorder(compositeStream, mimeType ? { mimeType } : {});
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      // Handle user closing the OS share picker / ending share
      screenStream.getVideoTracks()[0]?.addEventListener('ended', () => {
        if (mediaRecorderRef.current?.state !== 'inactive') {
          mediaRecorderRef.current?.stop();
        }
        setIsRecording(false);
        setIsPaused(false);
        stopTimer();
        stopAllStreams();
      });

      recorder.start(1000);
      setIsRecording(true);
      setIsPaused(false);
      setDuration(0);
      startTimer();

      return true;
    } catch (err) {
      // User denied screen permission — enter demo mode
      console.warn('Screen capture unavailable, using demo mode:', err);

      chunksRef.current = [];
      pausedDurationRef.current = 0;
      mediaRecorderRef.current = null;

      setIsRecording(true);
      setIsPaused(false);
      setDuration(0);
      startTimer();

      return true;
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<RecordingResult | null> => {
    stopTimer();
    const finalDuration = Math.floor((Date.now() - startTimeRef.current) / 1000);

    setIsRecording(false);
    setIsPaused(false);
    setDuration(0);

    const recorder = mediaRecorderRef.current;

    if (recorder && recorder.state !== 'inactive') {
      return new Promise((resolve) => {
        recorder.onstop = async () => {
          const mimeType = recorder.mimeType || 'video/webm';
          const blob = new Blob(chunksRef.current, { type: mimeType });
          stopAllStreams();
          mediaRecorderRef.current = null;

          const url = URL.createObjectURL(blob);
          const thumbnail = await generateThumbnail(blob);

          resolve({ url, duration: finalDuration, thumbnail });
        };

        recorder.stop();
      });
    }

    // Demo mode fallback
    stopAllStreams();
    const thumbnail = generatePlaceholderThumbnail(finalDuration || 5);
    const demoBlob = new Blob([''], { type: 'video/webm' });
    const url = URL.createObjectURL(demoBlob);

    return { url, duration: Math.max(finalDuration, 1), thumbnail };
  }, []);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.pause();
    }
    pauseStartRef.current = Date.now();
    stopTimer();
    setIsPaused(true);
  }, []);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.resume();
    }
    pausedDurationRef.current += Math.floor((Date.now() - pauseStartRef.current) / 1000);
    startTimer();
    setIsPaused(false);
  }, []);

  const cancelRecording = useCallback(() => {
    stopTimer();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    stopAllStreams();
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    setIsRecording(false);
    setIsPaused(false);
    setDuration(0);
  }, []);

  return {
    isRecording,
    isPaused,
    duration,
    cameraStream,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cancelRecording,
  };
}
