import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { fetchVideoById, incrementVideoViews } from '../lib/video-repo';
import type { Video } from '../lib/types';

/**
 * Public, unauthenticated video viewer for shared `/videos/:id` links.
 *
 * Mounted by AuthGuard when a logged-out visitor lands on a video URL. Reads
 * the video row directly from Supabase (RLS allows anon SELECT on `link`
 * visibility), and plays from the stored public Storage URL. No app chrome,
 * no sidebar — just the player and a Sign In CTA.
 */
export function PublicVideoView() {
  const { videoId } = useParams<{ videoId: string }>();
  const [searchParams] = useSearchParams();
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const viewBumpedRef = useRef<string | null>(null);
  const seekAppliedRef = useRef(false);

  useEffect(() => {
    if (!videoId) return;
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    fetchVideoById(videoId)
      .then((v) => {
        if (cancelled) return;
        if (v) setVideo(v);
        else setNotFound(true);
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [videoId]);

  // Bump view counter once per (route, video).
  useEffect(() => {
    if (!video || viewBumpedRef.current === video.id) return;
    viewBumpedRef.current = video.id;
    incrementVideoViews(video.id).catch(() => {});
  }, [video]);

  // Honour ?t=<seconds> deep-link.
  const handleLoadedMetadata = () => {
    if (seekAppliedRef.current) return;
    const t = Number(searchParams.get('t'));
    if (Number.isFinite(t) && t > 0 && videoRef.current) {
      videoRef.current.currentTime = t;
    }
    seekAppliedRef.current = true;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="w-8 h-8 border-[3px] border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !video || !video.publicUrl) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white p-8 text-center">
        <h1 className="text-2xl font-semibold mb-2">Video not available</h1>
        <p className="text-sm text-white/60 max-w-md">
          This video may have been deleted, set to private, or the link may be incorrect.
        </p>
        <Link
          to="/"
          className="mt-6 px-4 py-2 rounded-lg bg-white text-black text-sm font-medium hover:bg-white/90"
        >
          Go to Recodor
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 text-white">
        <Link to="/" className="text-lg font-semibold tracking-tight">
          Recodor
        </Link>
        <Link
          to="/"
          className="px-3 py-1.5 rounded-lg bg-white text-black text-sm font-medium hover:bg-white/90"
        >
          Sign in
        </Link>
      </header>
      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-8">
        <div className="w-full max-w-5xl">
          <video
            ref={videoRef}
            src={video.publicUrl}
            controls
            autoPlay
            playsInline
            preload="metadata"
            onLoadedMetadata={handleLoadedMetadata}
            className="w-full rounded-xl bg-black shadow-2xl"
          />
          <div className="mt-4 text-white">
            <h1 className="text-xl font-semibold">{video.title}</h1>
            <p className="text-sm text-white/60 mt-1">
              {video.views.toLocaleString()} {video.views === 1 ? 'view' : 'views'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
