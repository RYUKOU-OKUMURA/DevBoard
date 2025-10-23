/**
 * Open external URL safely.
 * - In Tauri environment, attempts to use shell.open to open in external browser.
 * - In browsers, uses window.open with noopener/noreferrer, falling back to same-tab navigation.
 */
export function openExternal(url: string): void {
  try {
    // Tauri/WebView environment detection
    const anyWindow = window as any;
    const tauriShellOpen = anyWindow?.__TAURI__?.shell?.open;
    if (typeof tauriShellOpen === 'function') {
      try {
        // Fire and forget
        tauriShellOpen(url);
        return;
      } catch {
        // fall through to web fallback
      }
    }

    const newWin = window.open(url, '_blank', 'noopener,noreferrer');
    if (!newWin) {
      // Popup blocked or failed — fallback
      window.location.href = url;
    }
  } catch {
    // As a last resort, navigate current tab
    window.location.href = url;
  }
}
