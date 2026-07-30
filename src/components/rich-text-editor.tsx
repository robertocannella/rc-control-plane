"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { Editor } from "@tinymce/tinymce-react";

const DARK_QUERY = "(prefers-color-scheme: dark)";

function subscribeToColorScheme(onChange: () => void) {
  const mql = window.matchMedia(DARK_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

function useIsDarkMode(): boolean {
  return useSyncExternalStore(
    subscribeToColorScheme,
    () => window.matchMedia(DARK_QUERY).matches,
    () => false, // server snapshot: no window, default to light
  );
}

export function RichTextEditor({
  name,
  initialValue,
}: {
  name: string;
  initialValue: string;
}) {
  const [value, setValue] = useState(initialValue);
  const dark = useIsDarkMode();

  // Memoized so it's the same object across re-renders (e.g. every
  // keystroke, via onEditorChange below) — a fresh object here previously
  // made the editor re-apply its content mid-edit, snapping the cursor
  // back to the start. Only the color scheme should ever require a change,
  // which we handle via a full remount (the `key` prop) instead.
  const init = useMemo(
    () => ({
      height: 300,
      menubar: false,
      skin: dark ? "oxide-dark" : "oxide",
      content_css: dark ? "dark" : "default",
      plugins: ["lists", "link", "autolink"],
      toolbar:
        "undo redo | bold italic underline | bullist numlist | link | removeformat",
    }),
    [dark],
  );

  return (
    <>
      <input type="hidden" name={name} value={value} />
      <div className="rounded-md border">
        <Editor
          // Remount when the color scheme flips: TinyMCE's skin/content_css
          // are only read at init, they can't be swapped on a live instance.
          key={dark ? "dark" : "light"}
          id={`richtext-${name}`}
          tinymceScriptSrc="/tinymce/tinymce.min.js"
          licenseKey="gpl"
          initialValue={initialValue}
          onEditorChange={(content) => setValue(content)}
          init={init}
        />
      </div>
    </>
  );
}
