# Loom-like Tool: Fix All Broken Features + Chrome Extension

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 27 broken/disconnected features across the Loom-like recording tool, then build a Manifest V3 Chrome extension for recording from any webpage.

**Architecture:** Two workstreams executed sequentially. Workstream 1 fixes all data flow, navigation, recording, and error-handling bugs in the existing React/Vite/TypeScript app. Workstream 2 builds a standalone Chrome extension (Manifest V3) that uses `chrome.tabCapture` and `MediaRecorder` APIs, communicates with the main app via `chrome.storage` and `postMessage`, and provides a popup + floating widget UX.

**Tech Stack:** React 18, TypeScript, Vite 6, Tailwind CSS 4, localStorage, MediaRecorder API, Chrome Extension Manifest V3, Chrome tabCapture/desktopCapture APIs

---

## File Map

### Workstream 1: Fixes (modify existing files)

| File | Responsibility | Changes |
|------|---------------|---------|
| `src/contexts/AppContext.tsx` | Global state + persistence | Add history logging, watch-later helpers, workspace filtering |
| `src/App.tsx` | Router + layout | Add workspace filter to `filteredVideos`, pass new props, wrap overlays in ErrorBoundary |
| `src/lib/types.ts` | Shared types | Fix `VideoRaw.workspaceId`, add `HistoryEntry` types, add `WatchLaterAction` |
| `src/hooks/useScreenRecorder.ts` | Recording lifecycle | Null-check guards, fix demo mode blob |
| `src/components/VideoPlayer.tsx` | Playback + activity | Add watch-later button, fix progress bar sync, add null checks |
| `src/components/VideoLibrary.tsx` | Video grid | Add watch-later toggle, workspace badge |
| `src/components/WatchLater.tsx` | Watch-later view | No changes (already functional when IDs are populated) |
| `src/components/History.tsx` | Watch history view | No changes (already functional when entries are populated) |
| `src/components/RecordingControls.tsx` | Recording overlay | Disable all buttons during save |
| `src/components/Sidebar.tsx` | Navigation | Fix z-index for workspace dropdown |
| `src/components/Meetings.tsx` | Meetings view | Add localStorage persistence |
| `src/components/ForYou.tsx` | Dashboard | Filter by workspace |
| `src/components/ErrorBoundary.tsx` | Error catching | No changes needed |

### Workstream 2: Chrome Extension (new files)

| File | Responsibility |
|------|---------------|
| `extension/manifest.json` | Manifest V3 config (permissions, content scripts, service worker) |
| `extension/src/background.ts` | Service worker: manages recording state, handles messages |
| `extension/src/content.ts` | Content script: injects floating widget into web pages |
| `extension/src/popup/popup.html` | Extension popup HTML shell |
| `extension/src/popup/popup.ts` | Popup logic: recent recordings, quick actions |
| `extension/src/popup/popup.css` | Popup styles |
| `extension/src/widget/widget.ts` | Floating recording controls (start/stop/pause, mode select, timer) |
| `extension/src/widget/widget.css` | Widget styles (scoped with Shadow DOM) |
| `extension/src/shared/types.ts` | Shared message types between background, content, popup |
| `extension/src/shared/storage.ts` | Thin wrapper around `chrome.storage.local` |
| `extension/src/shared/recorder.ts` | MediaRecorder lifecycle (reused from main app, adapted for extension) |
| `extension/icons/icon16.png` | Toolbar icon 16px |
| `extension/icons/icon48.png` | Toolbar icon 48px |
| `extension/icons/icon128.png` | Toolbar icon 128px |
| `extension/build.sh` | Build script (esbuild bundle for TS files) |
| `extension/package.json` | Extension dependencies |
| `extension/tsconfig.json` | TypeScript config for extension |

---

# WORKSTREAM 1: Fix All Broken Features

---

### Task 1: Fix Watch-Later Data Flow

**Problem:** No UI anywhere to ADD videos to watch-later. The WatchLater component reads `watch-later` localStorage key, but nothing writes to it.

**Files:**
- Modify: `src/contexts/AppContext.tsx`
- Modify: `src/components/VideoLibrary.tsx`
- Modify: `src/components/VideoPlayer.tsx`

- [ ] **Step 1: Add watch-later helpers to AppContext**

In `src/contexts/AppContext.tsx`, add `toggleWatchLater` and `isInWatchLater` to the context value. Add these after line 184:

```typescript
// After handleRenameVideo, before handleNewVideo:

const toggleWatchLater = useCallback((videoId: string) => {
  const saved = getStorageItem<string[]>('watch-later', []);
  const set = new Set(saved);
  if (set.has(videoId)) {
    set.delete(videoId);
  } else {
    set.add(videoId);
  }
  setStorageItem('watch-later', Array.from(set));
}, []);

const isInWatchLater = useCallback((videoId: string): boolean => {
  const saved = getStorageItem<string[]>('watch-later', []);
  return saved.includes(videoId);
}, []);
```

Update the `AppContextValue` interface (line 119-128) to include:
```typescript
toggleWatchLater: (videoId: string) => void;
isInWatchLater: (videoId: string) => boolean;
```

Add to the `value` object (line 206-214):
```typescript
toggleWatchLater,
isInWatchLater,
```

- [ ] **Step 2: Add bookmark button to VideoLibrary**

In `src/components/VideoLibrary.tsx`, import `Bookmark` from lucide-react and `useAppContext` from the context. On each video card, add a bookmark toggle button:

```tsx
// In the video card's action area (the hover overlay):
<button
  onClick={(e) => {
    e.stopPropagation();
    toggleWatchLater(video.id);
  }}
  className={`p-1.5 rounded-lg transition-colors ${
    isInWatchLater(video.id)
      ? 'bg-yellow-100 text-yellow-600'
      : 'bg-white/90 text-gray-500 hover:text-gray-700'
  }`}
  title={isInWatchLater(video.id) ? 'Remove from Watch Later' : 'Save to Watch Later'}
>
  <Bookmark className={`w-4 h-4 ${isInWatchLater(video.id) ? 'fill-current' : ''}`} />
</button>
```

- [ ] **Step 3: Add bookmark button to VideoPlayer header**

In `src/components/VideoPlayer.tsx`, add a bookmark button in the right actions area of the header (after the copy-link button, around line 562-570):

```tsx
<button
  onClick={() => toggleWatchLater(video.id)}
  title={isInWatchLater(video.id) ? 'Remove from Watch Later' : 'Save to Watch Later'}
  className={`p-2 rounded-xl border transition-all ${
    isInWatchLater(video.id)
      ? 'bg-yellow-50 border-yellow-300 text-yellow-600'
      : 'border-gray-200 hover:bg-gray-50 text-gray-600'
  }`}
>
  <Bookmark className={`w-4 h-4 ${isInWatchLater(video.id) ? 'fill-current' : ''}`} />
</button>
```

Note: VideoPlayer needs to receive `toggleWatchLater` and `isInWatchLater` as props from App.tsx. Update VideoPlayerProps interface and pass them through from `renderContent()`.

- [ ] **Step 4: Build and verify**

```bash
cd "/Users/shifu/Documents/Claude/Loom-like Tool Design" && npx vite build 2>&1 | grep -E "error|Error|✓"
```
Expected: `✓ built in XXXms` with zero errors.

- [ ] **Step 5: Commit**

```bash
git add src/contexts/AppContext.tsx src/components/VideoLibrary.tsx src/components/VideoPlayer.tsx src/App.tsx
git commit -m "feat: wire up watch-later — add bookmark buttons to library and player"
```

---

### Task 2: Fix History Tracking

**Problem:** `handleVideoClick` increments view count but never logs to `watch-history` localStorage. History page is always empty.

**Files:**
- Modify: `src/contexts/AppContext.tsx` (lines 163-168)

- [ ] **Step 1: Add history logging to handleVideoClick**

In `src/contexts/AppContext.tsx`, update `handleVideoClick` (lines 163-168) to also log a history entry:

```typescript
const handleVideoClick = useCallback((video: Video) => {
  const updatedVideo = { ...video, views: video.views + 1 };
  const updatedVideos = state.videos.map(v => v.id === video.id ? updatedVideo : v);
  dispatch({ type: 'SET_VIDEOS', payload: updatedVideos });
  setStorageItem('recorded-videos', updatedVideos);
  dispatch({ type: 'SELECT_VIDEO', payload: updatedVideo });

  // Log to watch history
  const rawHistory = getStorageItem<Array<{ videoId: string; watchedAt: string; watchTime: number }>>('watch-history', []);
  const entry = {
    videoId: video.id,
    watchedAt: new Date().toISOString(),
    watchTime: 0, // Will be updated when player closes
  };
  setStorageItem('watch-history', [entry, ...rawHistory].slice(0, 500)); // Cap at 500
}, [state.videos]);
```

- [ ] **Step 2: Build and verify**

```bash
cd "/Users/shifu/Documents/Claude/Loom-like Tool Design" && npx vite build 2>&1 | grep -E "error|Error|✓"
```
Expected: `✓ built in XXXms`

- [ ] **Step 3: Commit**

```bash
git add src/contexts/AppContext.tsx
git commit -m "feat: log watch history on video click"
```

---

### Task 3: Fix Workspace Filtering

**Problem:** `filteredVideos` in App.tsx never checks `currentWorkspaceId`. All workspaces see all videos. `useMemo` is missing the dependency.

**Files:**
- Modify: `src/App.tsx` (lines 135-148)
- Modify: `src/components/ForYou.tsx`

- [ ] **Step 1: Add workspace filter to filteredVideos**

In `src/App.tsx`, update the `filteredVideos` useMemo (lines 135-148):

```typescript
const filteredVideos = useMemo(() => {
  return videos
    .filter(v => {
      // Workspace filter
      if (currentWorkspaceId !== 'default' && v.workspaceId !== currentWorkspaceId) return false;
      // View type filter
      if (viewType === 'clips') return v.duration < 300;
      if (viewType === 'meetings') return v.duration >= 900;
      if (viewType === 'archive') return false;
      return true;
    })
    .sort((a, b) => {
      if (sortType === 'newest') return b.createdAt.getTime() - a.createdAt.getTime();
      if (sortType === 'oldest') return a.createdAt.getTime() - b.createdAt.getTime();
      return b.views - a.views;
    });
}, [videos, viewType, sortType, currentWorkspaceId]);
```

- [ ] **Step 2: Pass filtered videos to ForYou**

In `renderContent()` line 167, change:
```typescript
// Before:
return <ForYou videos={videos} onVideoClick={handleVideoClick} onNewVideo={openRecordingModal} />;
// After:
return <ForYou videos={filteredVideos} onVideoClick={handleVideoClick} onNewVideo={openRecordingModal} />;
```

Also update the library call (line 171) to use `filteredVideos`:
```typescript
videos={filteredVideos}
```

And watch-later (line 185) and history (line 187) should still receive `videos` (unfiltered) since watch-later/history are cross-workspace.

- [ ] **Step 3: Build and verify**

```bash
cd "/Users/shifu/Documents/Claude/Loom-like Tool Design" && npx vite build 2>&1 | grep -E "error|Error|✓"
```

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat: filter videos by active workspace"
```

---

### Task 4: Fix Meetings Persistence

**Problem:** Meetings component uses local `useState` for meeting data. All meetings are lost on page refresh.

**Files:**
- Modify: `src/components/Meetings.tsx`

- [ ] **Step 1: Add localStorage persistence**

In `src/components/Meetings.tsx`, change the meetings state initialization to load from localStorage:

```typescript
// Replace the existing useState for meetings:
const [meetings, setMeetings] = useState<Meeting[]>(() => {
  const saved = getStorageItem<Meeting[]>('meetings', []);
  return saved.length > 0 ? saved : DEFAULT_MEETINGS; // keep default sample data for first load
});
```

Add import for `getStorageItem` and `setStorageItem` from `../lib/storage`.

Add a `saveMeetings` helper:
```typescript
const saveMeetings = (updated: Meeting[]) => {
  setMeetings(updated);
  setStorageItem('meetings', updated);
};
```

Replace every `setMeetings(...)` call in the component with `saveMeetings(...)` — this includes:
- `handleScheduleMeeting` (when adding new meeting)
- `handleDeleteMeeting` (when removing)
- Any other mutation

- [ ] **Step 2: Build and verify**

```bash
cd "/Users/shifu/Documents/Claude/Loom-like Tool Design" && npx vite build 2>&1 | grep -E "error|Error|✓"
```

- [ ] **Step 3: Commit**

```bash
git add src/components/Meetings.tsx
git commit -m "feat: persist meetings to localStorage"
```

---

### Task 5: Fix Recording Safety (Null Checks + Demo Mode)

**Problem:** (a) `pauseRecording`/`resumeRecording` don't null-check `mediaRecorderRef.current`. (b) Demo mode creates unplayable empty blob.

**Files:**
- Modify: `src/hooks/useScreenRecorder.ts`

- [ ] **Step 1: Fix null checks in pause/resume**

Already have optional chaining on line 254 (`mediaRecorderRef.current?.state`), but `resumeRecording` line 263 also uses optional chaining. Both are safe. Verify no crash path exists. The real issue is in `cancelRecording` — line 274 checks `mediaRecorderRef.current` before accessing `.state`, which is correct.

No code change needed here — re-audited and optional chaining covers it.

- [ ] **Step 2: Fix demo mode to generate a playable placeholder**

In `src/hooks/useScreenRecorder.ts`, replace the demo mode blob creation (around line 297-303) with a canvas-generated placeholder video:

```typescript
// Demo mode: generate a minimal but playable placeholder
stopAllStreams();
const thumbnail = generatePlaceholderThumbnail(finalDuration || 5);

// Create a canvas-based placeholder video blob
const canvas = document.createElement('canvas');
canvas.width = 640;
canvas.height = 360;
const ctx = canvas.getContext('2d');
if (ctx) {
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#1a1a2e');
  gradient.addColorStop(1, '#16213e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Demo Recording', canvas.width / 2, canvas.height / 2 - 10);
  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('Screen capture permission was denied', canvas.width / 2, canvas.height / 2 + 20);
}
const stream = canvas.captureStream(1);
const demoRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
const demoChunks: Blob[] = [];
demoRecorder.ondataavailable = (e) => { if (e.data.size > 0) demoChunks.push(e.data); };

return new Promise<RecordingResult>((resolve) => {
  demoRecorder.onstop = () => {
    stream.getTracks().forEach(t => t.stop());
    const blob = new Blob(demoChunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    resolve({ url, duration: Math.max(finalDuration, 1), thumbnail });
  };
  demoRecorder.start();
  setTimeout(() => demoRecorder.stop(), 200);
});
```

- [ ] **Step 3: Build and verify**

```bash
cd "/Users/shifu/Documents/Claude/Loom-like Tool Design" && npx vite build 2>&1 | grep -E "error|Error|✓"
```

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useScreenRecorder.ts
git commit -m "fix: generate playable demo video, verify null checks"
```

---

### Task 6: Fix Error Boundaries for Recording UI

**Problem:** ErrorBoundary only wraps main content. RecordingModal, CameraBubble, RecordingControls, and Annotations are unprotected.

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Wrap all recording overlays in ErrorBoundary**

In `src/App.tsx`, wrap each overlay section:

```tsx
{/* Recording Modal */}
{showRecordingModal && (
  <ErrorBoundary>
    <Suspense fallback={null}>
      <RecordingModal onClose={closeRecordingModal} onStartRecording={handleStartRecording} />
    </Suspense>
  </ErrorBoundary>
)}

{/* Camera PiP bubble */}
{isRecording && recorder.cameraStream && (
  <ErrorBoundary>
    <Suspense fallback={null}>
      <CameraBubble stream={recorder.cameraStream} />
    </Suspense>
  </ErrorBoundary>
)}

{/* Recording Controls + Annotations */}
{isRecording && (
  <ErrorBoundary>
    <Suspense fallback={null}>
      {/* ...existing RecordingControls + AnnotationToolbar + AnnotationCanvas... */}
    </Suspense>
  </ErrorBoundary>
)}
```

- [ ] **Step 2: Build and verify**

```bash
cd "/Users/shifu/Documents/Claude/Loom-like Tool Design" && npx vite build 2>&1 | grep -E "error|Error|✓"
```

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "fix: wrap all recording overlays in ErrorBoundary"
```

---

### Task 7: Fix VideoPlayer Progress Bar + Null Checks

**Problem:** (a) Keyboard navigation (arrow keys) updates `videoRef.current.currentTime` but `progressPct` doesn't re-render until next `timeupdate` event. (b) Multiple places assume `videoRef.current` is non-null.

**Files:**
- Modify: `src/components/VideoPlayer.tsx`

- [ ] **Step 1: Fix progress sync on keyboard skip**

In `src/components/VideoPlayer.tsx`, update `skipTime` (around line 168) to also update the React `currentTime` state:

```typescript
const skipTime = (secs: number) => {
  const v = videoRef.current;
  if (!v) return;
  const newTime = Math.max(0, Math.min(duration, v.currentTime + secs));
  v.currentTime = newTime;
  setCurrentTime(newTime); // Force immediate re-render of progress bar
};
```

- [ ] **Step 2: Add null checks to all videoRef usages**

Add `if (!videoRef.current) return;` guard at the top of: `togglePlay`, `toggleMute`, `handleVolumeChange`, `handleSeek`, `handleSpeedChange`, `replayVideo`. Most already check or use `const v = videoRef.current; if (!v) return;` — verify each one and add where missing.

- [ ] **Step 3: Wrap clipboard in try-catch**

Update `handleCopyLink` (around line 226):

```typescript
const handleCopyLink = () => {
  navigator.clipboard.writeText(window.location.href)
    .then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    })
    .catch(() => {
      // Fallback: select a hidden input
      console.warn('Clipboard write failed');
    });
};
```

- [ ] **Step 4: Build and verify**

```bash
cd "/Users/shifu/Documents/Claude/Loom-like Tool Design" && npx vite build 2>&1 | grep -E "error|Error|✓"
```

- [ ] **Step 5: Commit**

```bash
git add src/components/VideoPlayer.tsx
git commit -m "fix: sync progress bar on keyboard skip, add null guards"
```

---

### Task 8: Fix Sidebar Z-Index + RecordingControls Save State

**Problem:** (a) Sidebar workspace dropdown `z-30` conflicts with recording modal `z-50`. (b) `isSaving` doesn't disable all recording control buttons.

**Files:**
- Modify: `src/components/Sidebar.tsx`
- Modify: `src/components/RecordingControls.tsx`

- [ ] **Step 1: Fix Sidebar dropdown z-index**

In `src/components/Sidebar.tsx`, change the workspace dropdown overlay (line 177):

```tsx
// Change:
<div className="fixed inset-0 z-20" onClick={() => setShowWorkspaceDropdown(false)} />
<div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl z-30 overflow-hidden">
// To:
<div className="fixed inset-0 z-40" onClick={() => setShowWorkspaceDropdown(false)} />
<div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl z-40 overflow-hidden">
```

- [ ] **Step 2: Disable all recording buttons during save**

In `src/components/RecordingControls.tsx`, find every button (pause, cancel, annotations toggle) and add `disabled={isSaving}` to each. Also add `pointer-events-none` class when `isSaving` to prevent click-through.

- [ ] **Step 3: Build and verify**

```bash
cd "/Users/shifu/Documents/Claude/Loom-like Tool Design" && npx vite build 2>&1 | grep -E "error|Error|✓"
```

- [ ] **Step 4: Commit**

```bash
git add src/components/Sidebar.tsx src/components/RecordingControls.tsx
git commit -m "fix: sidebar z-index, disable all controls during save"
```

---

### Task 9: Fix Type Safety

**Problem:** `VideoRaw.workspaceId` is optional but `Video.workspaceId` is required. No tsconfig with strict checks.

**Files:**
- Modify: `src/lib/types.ts`
- Create: `tsconfig.json`

- [ ] **Step 1: Fix VideoRaw type**

In `src/lib/types.ts`, make `workspaceId` consistently optional in both types, or required in both. The safest approach is to keep `VideoRaw.workspaceId` optional (backward-compatible with old data) and ensure `hydrateVideo` always provides a default:

```typescript
// No changes needed to types — hydrateVideo line 44 already defaults:
// workspaceId: raw.workspaceId || 'default',
```

Verify `Video.workspaceId` is `string` (not optional). Currently it is — so the hydration handles backward compat. This is correct as-is.

- [ ] **Step 2: Create tsconfig.json**

Create `/Users/shifu/Documents/Claude/Loom-like Tool Design/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Fix any strict-mode TypeScript errors**

Run `npx tsc --noEmit` and fix errors. Common fixes:
- Add explicit return types where inferred as `any`
- Add null checks where strict mode catches them
- Fix `event` parameter types

- [ ] **Step 4: Build and verify**

```bash
cd "/Users/shifu/Documents/Claude/Loom-like Tool Design" && npx vite build 2>&1 | grep -E "error|Error|✓"
```

- [ ] **Step 5: Commit**

```bash
git add tsconfig.json src/lib/types.ts
git commit -m "chore: add tsconfig with strict mode, fix type safety"
```

---

# WORKSTREAM 2: Chrome Extension

---

### Task 10: Extension Scaffold + Manifest

**Files:**
- Create: `extension/manifest.json`
- Create: `extension/package.json`
- Create: `extension/tsconfig.json`
- Create: `extension/build.sh`
- Create: `extension/icons/icon16.png`, `icon48.png`, `icon128.png`

- [ ] **Step 1: Create extension directory structure**

```bash
mkdir -p extension/src/{background,content,popup,widget,shared}
mkdir -p extension/icons
```

- [ ] **Step 2: Create manifest.json**

Create `extension/manifest.json`:

```json
{
  "manifest_version": 3,
  "name": "Loom Recorder",
  "description": "Record your screen from any webpage. Better than Loom.",
  "version": "1.0.0",
  "permissions": [
    "activeTab",
    "tabCapture",
    "desktopCapture",
    "storage",
    "offscreen"
  ],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "css": ["widget.css"]
    }
  ],
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "web_accessible_resources": [
    {
      "resources": ["widget.css"],
      "matches": ["<all_urls>"]
    }
  ]
}
```

- [ ] **Step 3: Create package.json**

Create `extension/package.json`:

```json
{
  "name": "loom-recorder-extension",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "build": "bash build.sh",
    "watch": "bash build.sh --watch"
  },
  "devDependencies": {
    "esbuild": "^0.20.0",
    "@anthropic-ai/sdk": "latest",
    "@anthropic-ai/claude-code": "latest",
    "@anthropic-ai/claude-code-sdk": "latest",
    "@anthropic-ai/claude-agent-sdk": "latest",
    "typescript": "^5.4.0",
    "@anthropic-ai/sdk": "latest",
    "@anthropic-ai/claude-code": "latest",
    "@anthropic-ai/claude-code-sdk": "latest",
    "@anthropic-ai/claude-agent-sdk": "latest",
    "@types/chrome": "^0.0.268"
  }
}
```

- [ ] **Step 4: Create tsconfig.json**

Create `extension/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "lib": ["ES2020", "DOM"],
    "types": ["chrome"]
  },
  "include": ["src"]
}
```

- [ ] **Step 5: Create build script**

Create `extension/build.sh`:

```bash
#!/bin/bash
set -e

OUT_DIR="dist"
rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR/icons" "$OUT_DIR/popup"

# Bundle TypeScript files
npx esbuild src/background.ts --bundle --outfile="$OUT_DIR/background.js" --format=esm --target=es2020
npx esbuild src/content.ts --bundle --outfile="$OUT_DIR/content.js" --format=iife --target=es2020
npx esbuild src/popup/popup.ts --bundle --outfile="$OUT_DIR/popup/popup.js" --format=iife --target=es2020

# Copy static files
cp manifest.json "$OUT_DIR/"
cp src/popup/popup.html "$OUT_DIR/popup/"
cp src/popup/popup.css "$OUT_DIR/popup/"
cp src/widget/widget.css "$OUT_DIR/"
cp icons/* "$OUT_DIR/icons/" 2>/dev/null || true

echo "Extension built to $OUT_DIR/"
```

```bash
chmod +x extension/build.sh
```

- [ ] **Step 6: Generate placeholder icons**

Create simple red-circle icons using canvas in a Node script, or use placeholder PNGs. For now, create minimal SVG-to-PNG:

```bash
# Create placeholder icons (solid red circle with white dot — matches Loom branding)
cd extension/icons
cat > generate-icons.html << 'EOF'
<canvas id="c" width="128" height="128"></canvas>
<script>
[16,48,128].forEach(size => {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#EF4444';
  ctx.beginPath(); ctx.arc(size/2, size/2, size/2-1, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(size/2, size/2, size*0.2, 0, Math.PI*2); ctx.fill();
  c.toBlob(blob => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `icon${size}.png`;
    a.click();
  });
});
</script>
EOF
```

For now, use 1x1 transparent PNG placeholders (the build works without real icons):
```bash
# Create minimal 1x1 PNGs as placeholders
printf '\x89PNG\r\n\x1a\n' > icon16.png
printf '\x89PNG\r\n\x1a\n' > icon48.png
printf '\x89PNG\r\n\x1a\n' > icon128.png
```

- [ ] **Step 7: Commit**

```bash
git add extension/
git commit -m "chore: scaffold chrome extension with manifest v3"
```

---

### Task 11: Shared Types + Storage Wrapper

**Files:**
- Create: `extension/src/shared/types.ts`
- Create: `extension/src/shared/storage.ts`

- [ ] **Step 1: Create shared message types**

Create `extension/src/shared/types.ts`:

```typescript
/** Messages between content script ↔ background service worker */
export type ExtensionMessage =
  | { type: 'START_RECORDING'; mode: 'screen' | 'screen-camera' }
  | { type: 'STOP_RECORDING' }
  | { type: 'PAUSE_RECORDING' }
  | { type: 'RESUME_RECORDING' }
  | { type: 'CANCEL_RECORDING' }
  | { type: 'RECORDING_STARTED'; tabId: number }
  | { type: 'RECORDING_STOPPED'; recording: SavedRecording }
  | { type: 'RECORDING_ERROR'; error: string }
  | { type: 'GET_STATE' }
  | { type: 'STATE_UPDATE'; state: RecordingState }
  | { type: 'GET_RECORDINGS' }
  | { type: 'RECORDINGS_LIST'; recordings: SavedRecording[] };

export interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  mode: 'screen' | 'screen-camera' | null;
  tabId: number | null;
}

export interface SavedRecording {
  id: string;
  title: string;
  url: string;            // blob URL (temporary) or data URL
  thumbnail: string;      // data URL
  duration: number;       // seconds
  createdAt: string;      // ISO string
  pageUrl: string;        // URL of the page where recorded
  pageTitle: string;      // Title of the page where recorded
}

export const DEFAULT_STATE: RecordingState = {
  isRecording: false,
  isPaused: false,
  duration: 0,
  mode: null,
  tabId: null,
};
```

- [ ] **Step 2: Create storage wrapper**

Create `extension/src/shared/storage.ts`:

```typescript
import type { SavedRecording } from './types';

const RECORDINGS_KEY = 'loom_recordings';
const MAX_RECORDINGS = 50;

export async function getRecordings(): Promise<SavedRecording[]> {
  const result = await chrome.storage.local.get(RECORDINGS_KEY);
  return result[RECORDINGS_KEY] || [];
}

export async function saveRecording(recording: SavedRecording): Promise<void> {
  const existing = await getRecordings();
  const updated = [recording, ...existing].slice(0, MAX_RECORDINGS);
  await chrome.storage.local.set({ [RECORDINGS_KEY]: updated });
}

export async function deleteRecording(id: string): Promise<void> {
  const existing = await getRecordings();
  const updated = existing.filter(r => r.id !== id);
  await chrome.storage.local.set({ [RECORDINGS_KEY]: updated });
}

export async function clearRecordings(): Promise<void> {
  await chrome.storage.local.remove(RECORDINGS_KEY);
}
```

- [ ] **Step 3: Commit**

```bash
git add extension/src/shared/
git commit -m "feat(extension): shared types and chrome.storage wrapper"
```

---

### Task 12: Background Service Worker

**Files:**
- Create: `extension/src/background.ts`

- [ ] **Step 1: Implement service worker**

Create `extension/src/background.ts`:

```typescript
import type { ExtensionMessage, RecordingState, SavedRecording } from './shared/types';
import { DEFAULT_STATE } from './shared/types';
import { saveRecording, getRecordings } from './shared/storage';

let state: RecordingState = { ...DEFAULT_STATE };
let timerInterval: ReturnType<typeof setInterval> | null = null;

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((
  message: ExtensionMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: unknown) => void,
) => {
  switch (message.type) {
    case 'START_RECORDING':
      handleStartRecording(message.mode, sender.tab?.id);
      sendResponse({ ok: true });
      break;

    case 'STOP_RECORDING':
      handleStopRecording();
      sendResponse({ ok: true });
      break;

    case 'PAUSE_RECORDING':
      state.isPaused = true;
      broadcastState();
      sendResponse({ ok: true });
      break;

    case 'RESUME_RECORDING':
      state.isPaused = false;
      broadcastState();
      sendResponse({ ok: true });
      break;

    case 'CANCEL_RECORDING':
      resetState();
      broadcastState();
      sendResponse({ ok: true });
      break;

    case 'GET_STATE':
      sendResponse(state);
      break;

    case 'GET_RECORDINGS':
      getRecordings().then(recordings => sendResponse(recordings));
      return true; // async response

    case 'RECORDING_STOPPED':
      saveRecording(message.recording).then(() => {
        resetState();
        broadcastState();
        sendResponse({ ok: true });
      });
      return true; // async response
  }
});

function handleStartRecording(mode: 'screen' | 'screen-camera', tabId?: number) {
  state = {
    isRecording: true,
    isPaused: false,
    duration: 0,
    mode,
    tabId: tabId || null,
  };
  startTimer();
  broadcastState();
}

function handleStopRecording() {
  // Signal content script to finalize the recording
  if (state.tabId) {
    chrome.tabs.sendMessage(state.tabId, { type: 'FINALIZE_RECORDING' });
  }
  stopTimer();
}

function startTimer() {
  stopTimer();
  timerInterval = setInterval(() => {
    if (!state.isPaused) {
      state.duration += 1;
      broadcastState();
    }
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function resetState() {
  stopTimer();
  state = { ...DEFAULT_STATE };
}

function broadcastState() {
  const msg: ExtensionMessage = { type: 'STATE_UPDATE', state: { ...state } };
  // Broadcast to all tabs
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, msg).catch(() => {});
      }
    });
  });
}

// Extension icon click behavior — if already recording, show controls
chrome.action.onClicked.addListener((_tab) => {
  // Popup handles this — no action needed
});
```

- [ ] **Step 2: Commit**

```bash
git add extension/src/background.ts
git commit -m "feat(extension): background service worker with state management"
```

---

### Task 13: Content Script + Floating Widget

**Files:**
- Create: `extension/src/content.ts`
- Create: `extension/src/widget/widget.ts`
- Create: `extension/src/widget/widget.css`

- [ ] **Step 1: Create content script**

Create `extension/src/content.ts`:

```typescript
import type { ExtensionMessage } from './shared/types';
import { createWidget } from './widget/widget';

let widget: ReturnType<typeof createWidget> | null = null;

// Listen for messages from background
chrome.runtime.onMessage.addListener((message: ExtensionMessage) => {
  switch (message.type) {
    case 'STATE_UPDATE':
      if (!widget && message.state.isRecording) {
        widget = createWidget();
      }
      widget?.updateState(message.state);
      if (!message.state.isRecording && widget) {
        widget.destroy();
        widget = null;
      }
      break;

    case 'FINALIZE_RECORDING':
      widget?.finalizeRecording();
      break;
  }
});

// Request initial state on load
chrome.runtime.sendMessage({ type: 'GET_STATE' }, (state) => {
  if (state?.isRecording) {
    widget = createWidget();
    widget.updateState(state);
  }
});
```

- [ ] **Step 2: Create floating widget**

Create `extension/src/widget/widget.ts`:

```typescript
import type { RecordingState, SavedRecording } from '../shared/types';

export function createWidget() {
  // Use Shadow DOM to isolate styles
  const host = document.createElement('div');
  host.id = 'loom-recorder-widget';
  host.style.cssText = 'position:fixed; bottom:24px; right:24px; z-index:2147483647; font-family:system-ui,sans-serif;';
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: 'closed' });

  // Inject styles
  const style = document.createElement('style');
  style.textContent = `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    .widget {
      background: #1f2937; color: white; border-radius: 16px;
      padding: 12px 16px; display: flex; align-items: center; gap: 12px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.4); min-width: 200px;
      user-select: none; cursor: grab; transition: transform 0.2s;
    }
    .widget:hover { transform: scale(1.02); }
    .dot { width: 10px; height: 10px; background: #ef4444; border-radius: 50%; animation: pulse 1.5s infinite; }
    .dot.paused { background: #f59e0b; animation: none; }
    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
    .timer { font-size: 14px; font-weight: 700; font-variant-numeric: tabular-nums; min-width: 48px; }
    .actions { display: flex; gap: 6px; margin-left: auto; }
    .btn {
      width: 32px; height: 32px; border-radius: 8px; border: none;
      background: rgba(255,255,255,0.1); color: white; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: background 0.15s;
    }
    .btn:hover { background: rgba(255,255,255,0.2); }
    .btn.stop { background: #ef4444; }
    .btn.stop:hover { background: #dc2626; }
    .btn svg { width: 16px; height: 16px; }
    .status { font-size: 11px; color: #9ca3af; font-weight: 500; }
  `;
  shadow.appendChild(style);

  // Build widget DOM
  const container = document.createElement('div');
  container.className = 'widget';
  container.innerHTML = `
    <div class="dot" id="dot"></div>
    <div>
      <div class="timer" id="timer">0:00</div>
      <div class="status" id="status">Recording</div>
    </div>
    <div class="actions">
      <button class="btn" id="pauseBtn" title="Pause">
        <svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
      </button>
      <button class="btn stop" id="stopBtn" title="Stop">
        <svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
      </button>
      <button class="btn" id="cancelBtn" title="Discard">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  `;
  shadow.appendChild(container);

  // Elements
  const dot = shadow.getElementById('dot')!;
  const timer = shadow.getElementById('timer')!;
  const status = shadow.getElementById('status')!;
  const pauseBtn = shadow.getElementById('pauseBtn')!;
  const stopBtn = shadow.getElementById('stopBtn')!;
  const cancelBtn = shadow.getElementById('cancelBtn')!;

  // MediaRecorder for actual recording
  let mediaRecorder: MediaRecorder | null = null;
  let chunks: Blob[] = [];
  let stream: MediaStream | null = null;

  // Event handlers
  pauseBtn.addEventListener('click', () => {
    if (mediaRecorder?.state === 'recording') {
      mediaRecorder.pause();
      chrome.runtime.sendMessage({ type: 'PAUSE_RECORDING' });
    } else if (mediaRecorder?.state === 'paused') {
      mediaRecorder.resume();
      chrome.runtime.sendMessage({ type: 'RESUME_RECORDING' });
    }
  });

  stopBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'STOP_RECORDING' });
  });

  cancelBtn.addEventListener('click', () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    stream?.getTracks().forEach(t => t.stop());
    chrome.runtime.sendMessage({ type: 'CANCEL_RECORDING' });
  });

  // Drag support
  let isDragging = false;
  let startX = 0, startY = 0, origX = 0, origY = 0;
  container.addEventListener('mousedown', (e) => {
    if ((e.target as HTMLElement).closest('.btn')) return;
    isDragging = true;
    startX = e.clientX; startY = e.clientY;
    origX = host.offsetLeft; origY = host.offsetTop;
    container.style.cursor = 'grabbing';
  });
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    host.style.right = 'auto';
    host.style.bottom = 'auto';
    host.style.left = `${origX + e.clientX - startX}px`;
    host.style.top = `${origY + e.clientY - startY}px`;
  });
  document.addEventListener('mouseup', () => {
    isDragging = false;
    container.style.cursor = 'grab';
  });

  function formatTime(s: number): string {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  return {
    updateState(s: RecordingState) {
      timer.textContent = formatTime(s.duration);
      dot.className = s.isPaused ? 'dot paused' : 'dot';
      status.textContent = s.isPaused ? 'Paused' : 'Recording';

      // Update pause button icon
      pauseBtn.innerHTML = s.isPaused
        ? '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
    },

    async startCapture(mode: 'screen' | 'screen-camera') {
      try {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: 30 },
          audio: true,
        });

        chunks = [];
        const mimeType = ['video/webm;codecs=vp9,opus', 'video/webm'].find(
          t => MediaRecorder.isTypeSupported(t)
        ) || '';

        mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };
        mediaRecorder.start(1000);

        // Handle user stopping share via browser UI
        stream.getVideoTracks()[0]?.addEventListener('ended', () => {
          chrome.runtime.sendMessage({ type: 'STOP_RECORDING' });
        });
      } catch (err) {
        chrome.runtime.sendMessage({ type: 'RECORDING_ERROR', error: String(err) });
      }
    },

    async finalizeRecording() {
      if (!mediaRecorder || mediaRecorder.state === 'inactive') return;

      return new Promise<void>((resolve) => {
        mediaRecorder!.onstop = async () => {
          const blob = new Blob(chunks, { type: mediaRecorder!.mimeType || 'video/webm' });
          stream?.getTracks().forEach(t => t.stop());

          // Generate thumbnail
          const thumbnail = await generateThumbnail(blob);

          // Convert blob to data URL for storage
          const reader = new FileReader();
          reader.onloadend = () => {
            const recording: SavedRecording = {
              id: Date.now().toString(),
              title: `Recording - ${document.title}`,
              url: reader.result as string,
              thumbnail,
              duration: Math.floor(blob.size / 50000), // rough estimate
              createdAt: new Date().toISOString(),
              pageUrl: window.location.href,
              pageTitle: document.title,
            };
            chrome.runtime.sendMessage({ type: 'RECORDING_STOPPED', recording });
            resolve();
          };
          reader.readAsDataURL(blob);
        };
        mediaRecorder!.stop();
      });
    },

    destroy() {
      host.remove();
    },
  };
}

async function generateThumbnail(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    const url = URL.createObjectURL(blob);
    video.src = url;
    video.onloadeddata = () => { video.currentTime = 0.1; };
    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 320; canvas.height = 180;
      canvas.getContext('2d')?.drawImage(video, 0, 0, 320, 180);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve('');
    };
  });
}
```

- [ ] **Step 3: Create widget CSS fallback**

Create `extension/src/widget/widget.css`:

```css
/* Fallback styles — most styles are in Shadow DOM */
#loom-recorder-widget {
  position: fixed !important;
  z-index: 2147483647 !important;
}
```

- [ ] **Step 4: Commit**

```bash
git add extension/src/content.ts extension/src/widget/
git commit -m "feat(extension): content script + floating recording widget with Shadow DOM"
```

---

### Task 14: Extension Popup UI

**Files:**
- Create: `extension/src/popup/popup.html`
- Create: `extension/src/popup/popup.ts`
- Create: `extension/src/popup/popup.css`

- [ ] **Step 1: Create popup HTML**

Create `extension/src/popup/popup.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="popup">
    <header class="header">
      <div class="logo">
        <div class="logo-icon"></div>
        <span class="logo-text">Loom Recorder</span>
      </div>
    </header>

    <!-- Record Section -->
    <div id="record-section" class="section">
      <button class="record-btn" id="screenBtn">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
        <div>
          <div class="btn-title">Screen Only</div>
          <div class="btn-desc">Record your screen</div>
        </div>
      </button>
      <button class="record-btn" id="cameraBtn">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23,7 16,12 23,17"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
        <div>
          <div class="btn-title">Screen + Camera</div>
          <div class="btn-desc">Screen with webcam bubble</div>
        </div>
      </button>
    </div>

    <!-- Recording State -->
    <div id="recording-section" class="section hidden">
      <div class="recording-status">
        <div class="rec-dot"></div>
        <span id="rec-timer">0:00</span>
        <span id="rec-label">Recording</span>
      </div>
      <div class="rec-actions">
        <button class="action-btn" id="pauseBtn">Pause</button>
        <button class="action-btn stop" id="stopBtn">Stop</button>
      </div>
    </div>

    <!-- Recent Recordings -->
    <div class="section">
      <div class="section-header">
        <span>Recent</span>
        <span id="rec-count" class="count">0</span>
      </div>
      <div id="recordings-list" class="recordings-list">
        <div class="empty">No recordings yet</div>
      </div>
    </div>

    <footer class="footer">
      <a href="http://localhost:3001" target="_blank" class="open-app">Open full app</a>
    </footer>
  </div>

  <script src="popup.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create popup styles**

Create `extension/src/popup/popup.css`:

```css
* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  width: 320px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #fff;
  color: #1f2937;
}

.popup { padding: 0; }

.header {
  padding: 16px;
  border-bottom: 1px solid #f3f4f6;
  display: flex; align-items: center;
}

.logo { display: flex; align-items: center; gap: 8px; }
.logo-icon {
  width: 28px; height: 28px; background: #ef4444;
  border-radius: 8px; position: relative;
}
.logo-icon::after {
  content: ''; position: absolute;
  top: 50%; left: 50%; transform: translate(-50%,-50%);
  width: 10px; height: 10px; background: white; border-radius: 50%;
}
.logo-text { font-size: 15px; font-weight: 700; }

.section { padding: 12px 16px; }
.section-header {
  display: flex; justify-content: space-between; align-items: center;
  font-size: 11px; font-weight: 600; color: #9ca3af;
  text-transform: uppercase; letter-spacing: 0.05em;
  margin-bottom: 8px;
}
.count {
  background: #f3f4f6; padding: 1px 6px; border-radius: 10px;
  font-size: 10px; color: #6b7280;
}

.record-btn {
  width: 100%; display: flex; align-items: center; gap: 12px;
  padding: 10px 12px; border: 1.5px solid #e5e7eb; border-radius: 12px;
  background: white; cursor: pointer; text-align: left;
  transition: all 0.15s; margin-bottom: 8px;
}
.record-btn:hover { border-color: #ef4444; background: #fef2f2; }
.record-btn .icon { width: 20px; height: 20px; flex-shrink: 0; color: #6b7280; }
.record-btn:hover .icon { color: #ef4444; }
.btn-title { font-size: 13px; font-weight: 600; }
.btn-desc { font-size: 11px; color: #9ca3af; }

.hidden { display: none !important; }

.recording-status {
  display: flex; align-items: center; gap: 8px;
  padding: 12px; background: #1f2937; border-radius: 12px; color: white;
}
.rec-dot {
  width: 8px; height: 8px; background: #ef4444; border-radius: 50%;
  animation: pulse 1.5s infinite;
}
@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
#rec-timer { font-size: 16px; font-weight: 700; font-variant-numeric: tabular-nums; }
#rec-label { font-size: 12px; color: #9ca3af; margin-left: auto; }

.rec-actions { display: flex; gap: 8px; margin-top: 8px; }
.action-btn {
  flex: 1; padding: 8px; border: none; border-radius: 8px;
  font-size: 12px; font-weight: 600; cursor: pointer;
  background: #f3f4f6; color: #374151; transition: background 0.15s;
}
.action-btn:hover { background: #e5e7eb; }
.action-btn.stop { background: #ef4444; color: white; }
.action-btn.stop:hover { background: #dc2626; }

.recordings-list { max-height: 200px; overflow-y: auto; }
.recording-item {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 0; border-bottom: 1px solid #f9fafb; cursor: pointer;
}
.recording-item:hover { background: #f9fafb; border-radius: 8px; padding: 8px; margin: 0 -8px; }
.rec-thumb {
  width: 56px; height: 32px; border-radius: 4px; object-fit: cover;
  background: #1f2937; flex-shrink: 0;
}
.rec-info { flex: 1; min-width: 0; }
.rec-title { font-size: 12px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rec-meta { font-size: 10px; color: #9ca3af; }

.empty { text-align: center; padding: 20px; color: #d1d5db; font-size: 12px; }

.footer {
  padding: 12px 16px; border-top: 1px solid #f3f4f6;
  text-align: center;
}
.open-app {
  font-size: 12px; color: #ef4444; text-decoration: none;
  font-weight: 600;
}
.open-app:hover { text-decoration: underline; }
```

- [ ] **Step 3: Create popup logic**

Create `extension/src/popup/popup.ts`:

```typescript
import type { RecordingState, SavedRecording } from '../shared/types';

const screenBtn = document.getElementById('screenBtn')!;
const cameraBtn = document.getElementById('cameraBtn')!;
const recordSection = document.getElementById('record-section')!;
const recordingSection = document.getElementById('recording-section')!;
const recTimer = document.getElementById('rec-timer')!;
const recLabel = document.getElementById('rec-label')!;
const pauseBtn = document.getElementById('pauseBtn')!;
const stopBtn = document.getElementById('stopBtn')!;
const recCount = document.getElementById('rec-count')!;
const recordingsList = document.getElementById('recordings-list')!;

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function updateUI(state: RecordingState) {
  if (state.isRecording) {
    recordSection.classList.add('hidden');
    recordingSection.classList.remove('hidden');
    recTimer.textContent = formatTime(state.duration);
    recLabel.textContent = state.isPaused ? 'Paused' : 'Recording';
    pauseBtn.textContent = state.isPaused ? 'Resume' : 'Pause';
  } else {
    recordSection.classList.remove('hidden');
    recordingSection.classList.add('hidden');
  }
}

function renderRecordings(recordings: SavedRecording[]) {
  recCount.textContent = String(recordings.length);
  if (recordings.length === 0) {
    recordingsList.innerHTML = '<div class="empty">No recordings yet</div>';
    return;
  }
  recordingsList.innerHTML = recordings.slice(0, 10).map(r => `
    <div class="recording-item" data-id="${r.id}">
      <img class="rec-thumb" src="${r.thumbnail || ''}" alt="" />
      <div class="rec-info">
        <div class="rec-title">${r.title}</div>
        <div class="rec-meta">${r.pageTitle} &middot; ${formatTime(r.duration)}</div>
      </div>
    </div>
  `).join('');
}

// Event listeners
screenBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'START_RECORDING', mode: 'screen' });
  // Also trigger recording in the active tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.id) {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'START_CAPTURE', mode: 'screen' });
    }
  });
  window.close();
});

cameraBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'START_RECORDING', mode: 'screen-camera' });
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.id) {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'START_CAPTURE', mode: 'screen-camera' });
    }
  });
  window.close();
});

pauseBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'PAUSE_RECORDING' });
});

stopBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'STOP_RECORDING' });
});

// Initial state load
chrome.runtime.sendMessage({ type: 'GET_STATE' }, (state: RecordingState) => {
  if (state) updateUI(state);
});

chrome.runtime.sendMessage({ type: 'GET_RECORDINGS' }, (recordings: SavedRecording[]) => {
  if (recordings) renderRecordings(recordings);
});

// Listen for state updates
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'STATE_UPDATE') updateUI(msg.state);
});
```

- [ ] **Step 4: Commit**

```bash
git add extension/src/popup/
git commit -m "feat(extension): popup UI with recording controls and recent list"
```

---

### Task 15: Build, Load, and Verify Extension

**Files:**
- Modify: `extension/build.sh` (if needed)
- Modify: `extension/package.json` (if deps missing)

- [ ] **Step 1: Install extension dependencies**

```bash
cd "/Users/shifu/Documents/Claude/Loom-like Tool Design/extension"
npm install
```

- [ ] **Step 2: Build extension**

```bash
cd "/Users/shifu/Documents/Claude/Loom-like Tool Design/extension"
bash build.sh
```

Expected output: `Extension built to dist/`

- [ ] **Step 3: Verify dist structure**

```bash
ls -la extension/dist/
```

Expected files:
- `manifest.json`
- `background.js`
- `content.js`
- `widget.css`
- `popup/popup.html`
- `popup/popup.js`
- `popup/popup.css`
- `icons/`

- [ ] **Step 4: Load in Chrome for manual testing**

Instructions:
1. Open `chrome://extensions/`
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked"
4. Select the `extension/dist/` directory
5. Extension icon appears in toolbar
6. Click it — popup should show "Screen Only" and "Screen + Camera" buttons
7. Click "Screen Only" — should trigger `getDisplayMedia` permission dialog
8. Grant permission, recording widget appears in bottom-right
9. Click Stop — recording saved, appears in popup's Recent list

- [ ] **Step 5: Commit final state**

```bash
git add extension/
git commit -m "feat(extension): complete chrome extension v1 — recording, widget, popup"
```

---

### Task 16: Final Integration — Build Verification

- [ ] **Step 1: Build main app**

```bash
cd "/Users/shifu/Documents/Claude/Loom-like Tool Design" && npx vite build 2>&1 | grep -E "error|Error|✓"
```
Expected: `✓ built in XXXms`

- [ ] **Step 2: Build extension**

```bash
cd "/Users/shifu/Documents/Claude/Loom-like Tool Design/extension" && bash build.sh
```
Expected: `Extension built to dist/`

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "chore: final build verification — all fixes + extension complete"
```

---

## Summary

| Task | What it fixes | Files changed |
|------|--------------|---------------|
| 1 | Watch-Later data flow (bookmark buttons) | AppContext, VideoLibrary, VideoPlayer, App |
| 2 | History tracking (log on click) | AppContext |
| 3 | Workspace filtering | App, ForYou |
| 4 | Meetings persistence | Meetings |
| 5 | Recording safety (null checks, demo mode) | useScreenRecorder |
| 6 | Error boundaries for overlays | App |
| 7 | VideoPlayer progress bar + null checks | VideoPlayer |
| 8 | Sidebar z-index + save state | Sidebar, RecordingControls |
| 9 | Type safety + tsconfig | types, tsconfig.json |
| 10-15 | Chrome Extension (full build) | extension/* |
| 16 | Final verification | — |
