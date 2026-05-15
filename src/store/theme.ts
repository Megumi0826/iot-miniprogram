import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export type ThemeMode = 'dark' | 'light'

export const useThemeStore = defineStore(
  'theme',
  () => {
    const themeMode = ref<ThemeMode>('dark')

    const isDark = computed(() => themeMode.value === 'dark')
    const themeClass = computed(() => `theme-${themeMode.value}`)

    function setTheme(mode: ThemeMode) {
      themeMode.value = mode
    }

    function toggleTheme() {
      setTheme(isDark.value ? 'light' : 'dark')
    }

    return {
      themeMode,
      isDark,
      themeClass,
      setTheme,
      toggleTheme,

    }
  },
  {
    persist: true,
  },
)
