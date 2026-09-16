import { useColorScheme } from "react-native";

export interface ThemeColors {
  isDark: boolean;
  background: string;
  surface: string;
  surfaceHover: string;
  surfaceSubtle: string;
  border: string;
  borderSubtle: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  card: string;
  buttonPrimaryBg: string;
  buttonPrimaryText: string;
  buttonSecondaryBg: string;
  buttonSecondaryText: string;
  errorBg: string;
  errorText: string;
}

export const lightTheme: ThemeColors = {
  isDark: false,
  background: "#FFFFFF",
  surface: "#FFFFFF",
  surfaceHover: "#F4F4F5",
  surfaceSubtle: "#FAFAFA",
  border: "#E4E4E7",
  borderSubtle: "#F4F4F5",
  textPrimary: "#09090B",
  textSecondary: "#52525B",
  textMuted: "#71717A",
  card: "#FFFFFF",
  buttonPrimaryBg: "#09090B",
  buttonPrimaryText: "#FFFFFF",
  buttonSecondaryBg: "#F4F4F5",
  buttonSecondaryText: "#09090B",
  errorBg: "rgba(239, 68, 68, 0.1)",
  errorText: "#EF4444",
};

export const darkTheme: ThemeColors = {
  isDark: true,
  background: "#000000",
  surface: "#09090B",
  surfaceHover: "#18181B",
  surfaceSubtle: "#121215",
  border: "rgba(255, 255, 255, 0.1)",
  borderSubtle: "rgba(255, 255, 255, 0.06)",
  textPrimary: "#FFFFFF",
  textSecondary: "#A1A1AA",
  textMuted: "#71717A",
  card: "#09090B",
  buttonPrimaryBg: "#FFFFFF",
  buttonPrimaryText: "#000000",
  buttonSecondaryBg: "#18181B",
  buttonSecondaryText: "#FFFFFF",
  errorBg: "rgba(239, 68, 68, 0.15)",
  errorText: "#EF4444",
};

export function useThemeColors(): ThemeColors {
  const scheme = useColorScheme();
  return scheme === "dark" ? darkTheme : lightTheme;
}
