/**
 * Type-safe localStorage abstraction with error handling.
 * Prevents crashes from corrupted data, quota limits, or disabled storage.
 */

export function getStorageItem<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    console.warn(`Failed to read localStorage key "${key}", using fallback`);
    return fallback;
  }
}

export function setStorageItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      console.error(`localStorage quota exceeded for key "${key}"`);
    } else {
      console.warn(`Failed to write localStorage key "${key}"`, e);
    }
  }
}

export function removeStorageItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    console.warn(`Failed to remove localStorage key "${key}"`);
  }
}
