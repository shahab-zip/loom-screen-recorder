/**
 * IndexedDB-backed blob store for recorded videos, plus a Supabase Storage
 * uploader for public shareable links.
 */

import { supabase } from './supabase';

const VIDEOS_BUCKET = 'videos';

const DB_NAME = 'loom-video-storage';
const STORE = 'blobs';
const VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function putVideoBlob(id: string, blob: Blob): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(blob, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function getVideoBlob(id: string): Promise<Blob | null> {
  const db = await openDb();
  const blob = await new Promise<Blob | null>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => resolve((req.result as Blob | undefined) ?? null);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return blob;
}

export async function deleteVideoBlob(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

/** Pull a blob from a blob:/data: URL so we can persist it. */
export async function blobFromUrl(url: string): Promise<Blob | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.blob();
  } catch {
    return null;
  }
}

/** Regenerate a playable object URL for a video id, or null if not stored. */
export async function resolveVideoUrl(id: string): Promise<string | null> {
  const blob = await getVideoBlob(id);
  return blob ? URL.createObjectURL(blob) : null;
}

/**
 * Upload a recording to Supabase Storage and return its public URL.
 * The path is `<auth.uid()>/<videoId>.<ext>` so RLS owner policies apply.
 */
export async function uploadVideoForSharing(
  id: string,
  blob: Blob,
): Promise<{ url: string | null; error: { message: string } | null }> {
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) return { url: null, error: { message: 'not authenticated' } };

  const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
  const path = `${userRes.user.id}/${id}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from(VIDEOS_BUCKET)
    .upload(path, blob, {
      cacheControl: '3600',
      upsert: true,
      contentType: blob.type || `video/${ext}`,
    });
  if (upErr) return { url: null, error: { message: upErr.message } };

  const { data } = supabase.storage.from(VIDEOS_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}
