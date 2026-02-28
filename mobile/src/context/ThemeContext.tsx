import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
} from "react";
import { Paths, File } from "expo-file-system";

// --- Color Palettes ---

export type ThemeColors = {
  background: string;
  primary: string;
  primaryDark: string;
  card: string;
  cardAlt: string;
  accent: string;
  accentSecondary: string;
  iconButtonBg: string;
  iconButtonBgStrong: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textMuted: string;
  textPlaceholder: string;
  inputBg: string;
  inputBgAlt: string;
  border: string;
  borderLight: string;
  separator: string;
  thumbnailBg: string;
  emptyIcon: string;
  sliderTrack: string;
  progressBg: string;
  chipBg: string;
  overlayBg: string;
  modalBg: string;
  shadowColor: string;
  white: string;
  buttonText: string;
  danger: string;
  dangerBg: string;
};

export const lightColors: ThemeColors = {
  background: "#D4ECEC",
  primary: "#376161",
  primaryDark: "#203838",
  card: "#fff",
  cardAlt: "#f9f9f9",
  accent: "#e8f4f4",
  accentSecondary: "#5a8a8a",
  iconButtonBg: "rgba(55, 97, 97, 0.15)",
  iconButtonBgStrong: "rgba(55, 97, 97, 0.25)",
  textPrimary: "#333",
  textSecondary: "#444",
  textTertiary: "#555",
  textMuted: "#666",
  textPlaceholder: "#999",
  inputBg: "#f5f5f5",
  inputBgAlt: "#f8f8f8",
  border: "#ddd",
  borderLight: "#f0f0f0",
  separator: "#f0f0f0",
  thumbnailBg: "#f0f0f0",
  emptyIcon: "#b0d4d4",
  sliderTrack: "#ddd",
  progressBg: "#e0e0e0",
  chipBg: "rgba(255, 255, 255, 0.3)",
  overlayBg: "rgba(0, 0, 0, 0.5)",
  modalBg: "#fff",
  shadowColor: "#000",
  white: "#fff",
  buttonText: "#fff",
  danger: "#c0392b",
  dangerBg: "rgba(231, 76, 60, 0.12)",
};

export const darkColors: ThemeColors = {
  background: "#1a2e2e",
  primary: "#7fb8b8",
  primaryDark: "#a0d4d4",
  card: "#243c3c",
  cardAlt: "#2a4242",
  accent: "#2a4545",
  accentSecondary: "#7fb8b8",
  iconButtonBg: "rgba(127, 184, 184, 0.2)",
  iconButtonBgStrong: "rgba(127, 184, 184, 0.3)",
  textPrimary: "#e8f0f0",
  textSecondary: "#c8dede",
  textTertiary: "#b0cccc",
  textMuted: "#9abcbc",
  textPlaceholder: "#7a9e9e",
  inputBg: "#2a4040",
  inputBgAlt: "#2a4545",
  border: "#4a7070",
  borderLight: "#3a5a5a",
  separator: "#3a5a5a",
  thumbnailBg: "#2a4040",
  emptyIcon: "#5a8a8a",
  sliderTrack: "#4a6e6e",
  progressBg: "#3a5858",
  chipBg: "rgba(255, 255, 255, 0.1)",
  overlayBg: "rgba(0, 0, 0, 0.7)",
  modalBg: "#243c3c",
  shadowColor: "#000",
  white: "#fff",
  buttonText: "#1a2e2e",
  danger: "#e74c3c",
  dangerBg: "rgba(231, 76, 60, 0.2)",
};

// --- Context ---

type ThemeContextType = {
  isDark: boolean;
  colors: ThemeColors;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  colors: lightColors,
  toggleTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

// --- Provider ---

const SETTINGS_FILE = new File(Paths.document, "pixert_settings.json");

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      if (SETTINGS_FILE.exists) {
        const raw = await SETTINGS_FILE.text();
        const data = JSON.parse(raw);
        if (data.theme === "dark") {
          setIsDark(true);
        }
      }
    } catch {}
    setLoaded(true);
  };

  const toggleTheme = async () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    try {
      let data: Record<string, string> = {};
      if (SETTINGS_FILE.exists) {
        const raw = await SETTINGS_FILE.text();
        data = JSON.parse(raw);
      }
      data.theme = newIsDark ? "dark" : "light";
      SETTINGS_FILE.write(JSON.stringify(data));
    } catch {}
  };

  const colors = useMemo(() => (isDark ? darkColors : lightColors), [isDark]);

  const value = useMemo(
    () => ({ isDark, colors, toggleTheme }),
    [isDark, colors],
  );

  if (!loaded) return null;

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
