import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { lightColors, darkColors } from './colors';

type ThemeType = {
  isDark: boolean;
  colors: typeof lightColors;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeType>({
  isDark: false,
  colors: lightColors,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Default to light mode, but allow toggling
  const [isDark, setIsDark] = useState(false);

  const toggleTheme = () => setIsDark((prev) => !prev);

  const theme = {
    isDark,
    colors: isDark ? darkColors : lightColors,
    toggleTheme,
  };

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
