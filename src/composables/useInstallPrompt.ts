import { ref, onMounted } from 'vue'

export function useInstallPrompt() {
  const deferredPrompt = ref<any>(null)
  const isInstallable = ref(false)
  const isIOS = ref(false)
  const isStandalone = ref(false)

  onMounted(() => {
    isStandalone.value = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone
    if (isStandalone.value) return

    const ua = window.navigator.userAgent
    isIOS.value = /iphone|ipad|ipod/i.test(ua)

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      deferredPrompt.value = e
      isInstallable.value = true
    })
  })

  const install = async () => {
    if (isIOS.value) {
      alert('Нажмите кнопку "Поделиться" (Share) и выберите "На экран «Домой»" (Add to Home Screen)')
      return
    }
    if (deferredPrompt.value) {
      deferredPrompt.value.prompt()
      await deferredPrompt.value.userChoice
      deferredPrompt.value = null
      isInstallable.value = false
    }
  }

  return { isInstallable, isIOS, isStandalone, install }
}