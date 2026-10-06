import { useLayoutEffect, useState } from 'react';
export function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('van-tien-ky.theme');
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {
      /* Use system preference. */
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    try {
      localStorage.setItem('van-tien-ky.theme', theme);
    } catch {
      /* In-memory theme still works. */
    }
  }, [theme]);
  return { theme, toggle: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')) };
}
