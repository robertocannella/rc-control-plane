"use client";

import { useEffect, useState } from "react";

// Not in lib.dom.d.ts yet.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "install-prompt-dismissed";

interface PromptState {
  visible: boolean;
  isIos: boolean;
}

const initialState: PromptState = { visible: false, isIos: false };

// Mobile-only (md:hidden, matching the bottom nav it's positioned
// above) banner inviting a visit to install the site as a standalone
// app — Android/Chrome gets a real install action via
// `beforeinstallprompt`; iOS Safari has no such API at all, so it just
// gets manual "Add to Home Screen" instructions instead.
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [state, setState] = useState<PromptState>(initialState);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (isStandalone || localStorage.getItem(DISMISSED_KEY) === "1") return;

    // iOS never fires beforeinstallprompt — its banner has nothing to
    // wait for, so show it immediately on mount; Android/Chrome instead
    // waits for the event below.
    function checkIos() {
      const iosDevice = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
      setState({ isIos: iosDevice, visible: iosDevice });
    }
    checkIos();

    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setState((s) => ({ ...s, visible: true }));
    }
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () =>
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setState((s) => ({ ...s, visible: false }));
  }

  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    dismiss();
  }

  if (!state.visible) return null;
  const { isIos } = state;

  return (
    <div className="fixed inset-x-4 bottom-20 z-40 flex items-center gap-3 rounded-md border border-border bg-surface p-3 text-sm shadow-lg md:hidden">
      {isIos ? (
        <p className="flex-1">
          Add this to your home screen: tap <strong>Share</strong>, then{" "}
          <strong>Add to Home Screen</strong>.
        </p>
      ) : (
        <>
          <p className="flex-1">Install this app for a better experience.</p>
          <button
            type="button"
            onClick={install}
            className="shrink-0 rounded-md bg-accent px-3 py-1.5 text-accent-foreground hover:opacity-90"
          >
            Install
          </button>
        </>
      )}
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="shrink-0 text-muted-foreground hover:text-foreground"
      >
        ×
      </button>
    </div>
  );
}
