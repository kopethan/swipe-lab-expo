import React, { createContext, useCallback, useContext, useMemo, useState, type PropsWithChildren } from "react";
import { useColorScheme } from "react-native";

export type ThemeMode = "light" | "dark";
export type ThemePreference = "system" | ThemeMode;

export type ThemePalette = {
  mode: ThemeMode;
  // Canvas / screen background (accent-tinted in main app; neutral here)
  background: string;

  // Opaque monochrome surfaces
  surface: string;
  surfaceAlt: string;

  text: string;
  muted: string;
  border: string;
  danger: string;

  // Deck depth surfaces
  deckSurface0: string;
  deckSurface1: string;
  deckSurface2: string;
  deckSurface3: string;
};

type ThemeContextValue = {
  palette: ThemePalette;
  mode: ThemeMode;
  preference: ThemePreference;
  systemMode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  setPreference: (preference: ThemePreference) => void;
  toggleMode: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolvePalette(mode: ThemeMode): ThemePalette {
  const isLight = mode === "light";

  const background = isLight ? "#f9f9f9" : "#0f0f0f";
  const surface = isLight ? "#ffffff" : "#000000";
  const surfaceAlt = isLight ? "#f2f2f2" : "#1a1a1a";

  const text = isLight ? "#0f0f0f" : "#f1f1f1";
  const muted = isLight ? "#606060" : "#a6a6a6";
  const border = isLight ? "#e5e5e5" : "#303030";
  const danger = isLight ? "#b42318" : "#ff6b5f";

  // Match the main project's feed deck ramp (opaque only)
  const deckSurface0 = surface;
  const deckSurface1 = isLight ? "#f6f6f6" : "#0a0a0a";
  const deckSurface2 = isLight ? "#efefef" : "#121212";
  const deckSurface3 = isLight ? "#e8e8e8" : "#1a1a1a";

  return {
    mode,
    background,
    surface,
    surfaceAlt,
    text,
    muted,
    border,
    danger,
    deckSurface0,
    deckSurface1,
    deckSurface2,
    deckSurface3,
  };
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const scheme = useColorScheme();
  const systemMode: ThemeMode = scheme === "dark" ? "dark" : "light";
  const [preference, setPreference] = useState<ThemePreference>("system");
  const mode = preference === "system" ? systemMode : preference;

  const setMode = useCallback((nextMode: ThemeMode) => setPreference(nextMode), []);
  const toggleMode = useCallback(
    () => setPreference((current) => {
      const currentMode = current === "system" ? systemMode : current;
      return currentMode === "dark" ? "light" : "dark";
    }),
    [systemMode]
  );

  const palette = useMemo(() => resolvePalette(mode), [mode]);
  const value = useMemo(
    () => ({ palette, mode, preference, systemMode, setMode, setPreference, toggleMode }),
    [mode, palette, preference, setMode, systemMode, toggleMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }
  return value;
}
