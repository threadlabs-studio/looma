import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import CodeBlock from "@theme/CodeBlock";
import type { Props as RootProps } from "@theme/Root";

export type FrameworkMode = "html-next" | "vue" | "svelte" | "react";

export interface FrameworkExample {
  code: string;
  language: "html" | "tsx" | "vue" | "svelte";
}

export type FrameworkExamples = Readonly<Record<FrameworkMode, FrameworkExample>>;

const STORAGE_KEY = "looma-docs-framework-mode";
const DEFAULT_MODE: FrameworkMode = "html-next";

const modes = [
  { id: "html-next", label: "HTML Next", preview: false },
  { id: "vue", label: "Vue", preview: false },
  { id: "svelte", label: "Svelte", preview: true },
  { id: "react", label: "React", preview: true }
] as const;

interface FrameworkModeContextValue {
  mode: FrameworkMode;
  setMode: (mode: FrameworkMode) => void;
}

const FrameworkModeContext = createContext<FrameworkModeContextValue | undefined>(undefined);

function isFrameworkMode(value: string | null): value is FrameworkMode {
  return modes.some((mode) => mode.id === value);
}

/**
 * Keeps the code-example lens consistent across the documentation. The selected
 * framework changes only how the shared Looma contract is presented; it does
 * not select a different component implementation.
 */
export function FrameworkModeProvider({ children }: RootProps): JSX.Element {
  const [mode, setModeState] = useState<FrameworkMode>(DEFAULT_MODE);

  useEffect(() => {
    try {
      const savedMode = window.localStorage.getItem(STORAGE_KEY);
      if (isFrameworkMode(savedMode)) setModeState(savedMode);
    } catch {
      // Storage can be unavailable in privacy-restricted contexts. HTML Next
      // remains the deterministic default in that case.
    }
  }, []);

  const value = useMemo<FrameworkModeContextValue>(() => ({
    mode,
    setMode(nextMode) {
      if (nextMode === mode) return;
      setModeState(nextMode);
      try {
        window.localStorage.setItem(STORAGE_KEY, nextMode);
      } catch {
        // The in-memory selection still works when persistence is unavailable.
      }
    }
  }), [mode]);

  return (
    <FrameworkModeContext.Provider value={value}>
      {children}
    </FrameworkModeContext.Provider>
  );
}

export function useFrameworkMode(): FrameworkModeContextValue {
  const value = useContext(FrameworkModeContext);
  if (!value) throw new Error("useFrameworkMode must be used within FrameworkModeProvider.");
  return value;
}

/** Accessible, persistent framework lens shared by every interactive example. */
export function FrameworkModeSelector(): JSX.Element {
  const { mode: selectedMode, setMode } = useFrameworkMode();

  return (
    <div className="looma-mode-switch" role="group" aria-label="Example framework">
      <span className="looma-mode-switch__label">Example syntax</span>
      <div className="looma-mode-switch__options">
        {modes.map((mode) => (
          <button
            key={mode.id}
            type="button"
            aria-pressed={selectedMode === mode.id}
            onClick={() => setMode(mode.id)}
          >
            <span>{mode.label}</span>
            {mode.preview ? <small aria-hidden="true">Preview</small> : null}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Shows one implementation syntax while preserving a single live result. */
export function FrameworkModeCode({ examples }: { examples: FrameworkExamples }): JSX.Element {
  const { mode } = useFrameworkMode();
  const example = examples[mode];

  return (
    <div className="looma-mode-code" data-framework-mode={mode}>
      <CodeBlock language={example.language}>{example.code}</CodeBlock>
    </div>
  );
}
