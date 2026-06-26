import { ref, watch, onMounted } from 'vue'

const isDark = ref(false)

export function useDarkMode() {
  onMounted(() => {
    const stored = localStorage.getItem('pm_flow_theme')
    if (stored) {
      isDark.value = stored === 'dark'
    } else {
      isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    applyTheme()
  })

  const toggle = () => {
    isDark.value = !isDark.value
    localStorage.setItem('pm_flow_theme', isDark.value ? 'dark' : 'light')
    applyTheme()
  }

  const applyTheme = () => {
    if (isDark.value) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  return { isDark, toggle }
}