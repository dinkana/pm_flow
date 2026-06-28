<script setup lang="ts">
import { ref, watch, computed, nextTick } from 'vue'
import { jsPDF } from 'jspdf'
import { useQuizStore } from '@/stores/quiz'
import { useInstallPrompt } from '@/composables/useInstallPrompt'
import { useDarkMode } from '@/composables/useDarkMode'
import type { Area } from '@/types'

const store = useQuizStore()
const { isInstallable, isIOS, isStandalone, install } = useInstallPrompt()
const { isDark, toggle: toggleDark } = useDarkMode()

const METRIKA_ID = 110214305
const track = (goal: string) => {
  if (typeof window !== 'undefined' && (window as any).ym) {
    (window as any).ym(METRIKA_ID, 'reachGoal', goal)
  }
}

type View = 'intro' | 'quiz' | 'result'
const view = ref<View>(
  store.state.isFinished || window.location.hash.replace('#', '').length > 0
    ? 'result'
    : 'intro'
)

const resultRef = ref<HTMLElement | null>(null)

watch(() => store.state.isFinished, async (v) => {
  if (v) {
    view.value = 'result'
    track('finish_quiz')
    await nextTick()
    resultRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
})

const areaLabels: Record<Area, string> = {
  goals: 'Цели и границы',
  stakeholders: 'Стейкхолдеры',
  planning: 'Планирование',
  risks: 'Риски',
  team: 'Команда',
  quality: 'Качество'
}

const enLabels: Record<Area, string> = {
  goals: 'Goals & Scope',
  stakeholders: 'Stakeholders',
  planning: 'Planning',
  risks: 'Risks',
  team: 'Team',
  quality: 'Quality'
}

const recEnMap: Record<string, { title: string; steps: string; expected: string }> = {
  rec_align: {
    title: 'Alignment Workshop',
    steps: '1. Discuss business goal & metric.\n2. Define individual contributions.\n3. Fix uncertainty zones.',
    expected: 'Unified vision, reduced noise.'
  },
  rec_risks: {
    title: 'Weekly Risk Management',
    steps: '1. Create risk registry.\n2. Review top-3 risks weekly.\n3. Assign owners.',
    expected: 'Proactive issue prevention.'
  },
  rec_dod: {
    title: 'Formalize Definition of Done',
    steps: '1. Create acceptance criteria checklist.\n2. No work without agreed criteria.\n3. Bi-weekly user feedback.',
    expected: 'Fewer endless revisions.'
  },
  rec_stakeholders: {
    title: 'Stakeholder Matrix',
    steps: '1. List all stakeholders.\n2. Map Power/Interest.\n3. Define comms format/frequency.',
    expected: 'Fewer sudden blockers.'
  },
  rec_planning: {
    title: 'Relative Estimation & Buffers',
    steps: '1. Use story points/T-shirts.\n2. Calculate velocity (last 3 sprints).\n3. Add 15-20% buffer.',
    expected: 'Realistic forecasts.'
  },
  rec_goals_fallback: {
    title: 'Decompose Business Goal',
    steps: '1. SMART goal formulation.\n2. Visualize in office/Notion.\n3. Link tasks to goal.',
    expected: 'Team focus, less scope creep.'
  }
}

const zone = (p: number) => (p < 40 ? 'red' : p <= 70 ? 'yellow' : 'green')

const zoneClasses: Record<string, { ring: string; text: string; bar: string; bg: string }> = {
  red: { ring: 'ring-red-500', text: 'text-red-600 dark:text-red-400', bar: 'bg-red-500', bg: 'bg-red-500/10' },
  yellow: { ring: 'ring-yellow-500', text: 'text-yellow-600 dark:text-yellow-400', bar: 'bg-yellow-500', bg: 'bg-yellow-500/10' },
  green: { ring: 'ring-green-500', text: 'text-green-600 dark:text-green-400', bar: 'bg-green-500', bg: 'bg-green-500/10' }
}

const expandedRec = ref<string | null>(null)
const toggleRec = (id: string) => {
  expandedRec.value = expandedRec.value === id ? null : id
}

const start = () => { view.value = 'quiz'; track('start_quiz') }
const restart = () => { store.restart(); view.value = 'intro'; expandedRec.value = null }

const reportText = computed(() => {
  const lines = [`Project Health Check`, `Здоровье проекта: ${store.healthScore}%`, ``]
  ;(Object.keys(store.areaScores) as Area[]).forEach(a =>
    lines.push(`${areaLabels[a]}: ${store.areaScores[a]}%`)
  )
  return lines.join('\n')
})

const copyReport = async () => {
  track('copy_report')
  try {
    await navigator.clipboard.writeText(reportText.value)
    flashMsg.value = 'Отчёт скопирован'
  } catch {
    flashMsg.value = 'Не удалось скопировать'
  }
  setTimeout(() => flashMsg.value = '', 2000)
}

const downloadPDF = () => {
  track('download_pdf')
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()

  doc.setFontSize(20)
  doc.text('Project Health Check', pageWidth / 2, 20, { align: 'center' })

  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text(new Date().toLocaleDateString('en-GB'), pageWidth / 2, 28, { align: 'center' })

  doc.setTextColor(0)
  doc.setFontSize(16)
  doc.text(`Overall Health: ${store.healthScore}%`, 20, 45)

  doc.setFontSize(12)
  let y = 60

  ;(Object.keys(store.areaScores) as Area[]).forEach(area => {
    const score = store.areaScores[area]
    doc.text(`${enLabels[area]}: ${score}%`, 20, y)
    doc.setFillColor(220, 220, 220)
    doc.rect(100, y - 4, 70, 5, 'F')
    const color = score < 40 ? [239, 68, 68] : score <= 70 ? [234, 179, 8] : [34, 197, 94]
    doc.setFillColor(color[0], color[1], color[2])
    doc.rect(100, y - 4, (70 * score) / 100, 5, 'F')
    y += 12
  })

  if (store.recommendations.length > 0) {
    y += 10
    doc.setFontSize(16)
    doc.text('Action Plan', 20, y)
    y += 10
    doc.setFontSize(11)

    store.recommendations.forEach((rec, i) => {
      if (y > 250) { doc.addPage(); y = 20; }
      const enRec = recEnMap[rec.id] || { title: rec.title, steps: rec.steps, expected: rec.expected }
      
      doc.setFont('Helvetica', 'bold')
      doc.text(`${i + 1}. ${enRec.title}`, 20, y)
      y += 6
      
      doc.setFont('Helvetica', 'normal')
      doc.setFontSize(10)
      const stepsText = enRec.steps.replace(/\n/g, ' ')
      const stepsLines = doc.splitTextToSize(`Steps: ${stepsText}`, 170)
      doc.text(stepsLines, 20, y)
      y += stepsLines.length * 5 + 2
      
      const expLines = doc.splitTextToSize(`Expected: ${enRec.expected}`, 170)
      doc.text(expLines, 20, y)
      y += expLines.length * 5 + 8
    })
  }

  doc.setFontSize(9)
  doc.setTextColor(120)
  doc.text('Generated by PM Flow', pageWidth / 2, 280, { align: 'center' })
  doc.save(`project-health-${Date.now()}.pdf`)
}

const flashMsg = ref('')
</script>

<template>
  <main class="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-6 flex flex-col items-center transition-colors">
    <div class="w-full max-w-lg flex-1 flex flex-col justify-center space-y-6">
      <div class="flex justify-end">
        <button @click="toggleDark"
          class="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'">
          <svg v-if="isDark" class="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"/>
          </svg>
          <svg v-else class="w-5 h-5 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/>
          </svg>
        </button>
      </div>

      <div v-if="view === 'intro'" class="text-center space-y-6">
        <div class="space-y-3">
          <h1 class="text-3xl font-bold text-blue-600 dark:text-blue-400">Project Health Check</h1>
          <p class="text-gray-600 dark:text-gray-300">Быстрый чекап здоровья проекта</p>
        </div>
        <p class="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
          12 коротких по 6 ключевым областям для оценки и формирования плана действий в помощь менеджерам проектов и бизнес аналитикам.
        </p>
        <button @click="start"
          class="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors">
          Начать
        </button>
        <button v-if="!isStandalone && (isInstallable || isIOS)" @click="install"
          class="w-full py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 font-medium rounded-lg transition-colors flex items-center justify-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
          Установить на устройство
        </button>
      </div>

      <div v-else-if="view === 'quiz'" class="space-y-6">
        <div class="flex justify-between items-center">
          <h1 class="text-lg font-bold text-blue-600 dark:text-blue-400">Project Health Check</h1>
          <span class="text-sm text-gray-500 dark:text-gray-400">{{ store.progress.toFixed(0) }}%</span>
        </div>
        <div class="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"
          role="progressbar"
          :aria-valuenow="Math.round(store.progress)"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-label="`Прогресс опроса: ${Math.round(store.progress)} процентов`">
          <div class="h-full bg-blue-500 transition-all duration-300" :style="{ width: store.progress + '%' }"></div>
        </div>
        <div class="space-y-3">
          <p class="text-lg font-medium leading-relaxed text-gray-900 dark:text-gray-100">{{ store.currentQuestion.text }}</p>
          <p class="text-sm text-gray-500 dark:text-gray-400 italic">{{ store.currentQuestion.tooltip }}</p>
        </div>
        <div class="grid grid-cols-2 gap-3" role="radiogroup">
          <button v-for="opt in ([3, 2, 1, 0] as const)" :key="opt" @click="store.setAnswer(opt)"
            :aria-pressed="store.state.answers[store.currentQuestion.id] === opt"
            :class="store.state.answers[store.currentQuestion.id] === opt
              ? 'bg-blue-600 text-white ring-2 ring-blue-400'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700'"
            class="p-4 rounded-lg text-center font-medium transition-colors">
            {{ opt === 3 ? 'Да' : opt === 2 ? 'Скорее да' : opt === 1 ? 'Скорее нет' : 'Нет' }}
          </button>
        </div>
        <div class="flex justify-between pt-2">
          <button @click="store.prev" :disabled="store.state.currentQuestionIndex === 0"
            class="px-4 py-2 rounded text-sm text-gray-700 dark:text-gray-300 disabled:opacity-30">Назад</button>
          <button @click="store.next"
            :disabled="store.state.answers[store.currentQuestion.id] == null"
            class="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white disabled:opacity-50 transition-colors">
            {{ store.state.currentQuestionIndex === store.questions.length - 1 ? 'Завершить' : 'Далее' }}
          </button>
        </div>
      </div>

      <div v-else ref="resultRef" class="space-y-6">
        <div class="text-center space-y-2">
          <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Результат диагностики</h1>
        </div>
        <div class="flex justify-center">
          <div :class="[zoneClasses[zone(store.healthScore)].ring, zoneClasses[zone(store.healthScore)].bg]"
            class="w-44 h-44 rounded-full ring-8 flex items-center justify-center">
            <div class="text-center">
              <div :class="zoneClasses[zone(store.healthScore)].text" class="text-5xl font-bold">
                {{ store.healthScore }}%
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400 mt-1 uppercase tracking-wide">
                {{ zone(store.healthScore) === 'red' ? 'Критично' : zone(store.healthScore) === 'yellow' ? 'Требует внимания' : 'Здоров' }}
              </div>
            </div>
          </div>
        </div>
        <div class="space-y-3">
          <div v-for="(score, area) in store.areaScores" :key="area" class="space-y-1">
            <div class="flex justify-between text-sm">
              <span class="text-gray-700 dark:text-gray-300 font-medium">{{ areaLabels[area as Area] }}</span>
              <span :class="zoneClasses[zone(score)].text" class="font-semibold">{{ score }}%</span>
            </div>
            <div class="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"
              role="progressbar"
              :aria-valuenow="score"
              aria-valuemin="0"
              aria-valuemax="100"
              :aria-label="`${areaLabels[area as Area]}: ${score} процентов`">
              <div :class="zoneClasses[zone(score)].bar" class="h-full transition-all duration-500" :style="{ width: score + '%' }"></div>
            </div>
          </div>
        </div>
        <div v-if="store.recommendations.length > 0" class="space-y-3">
          <h2 class="text-lg font-bold text-gray-900 dark:text-gray-100">Приоритетные действия</h2>
          <div class="space-y-2">
            <div v-for="(rec, index) in store.recommendations" :key="rec.id"
              class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <button @click="toggleRec(rec.id)" :aria-expanded="expandedRec === rec.id"
                :aria-controls="`rec-panel-${rec.id}`"
                class="w-full flex items-center justify-between p-4 text-left bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <span class="flex items-center gap-3">
                  <span class="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-sm flex items-center justify-center font-bold">
                    {{ index + 1 }}
                  </span>
                  <span class="font-medium text-gray-900 dark:text-gray-100">{{ rec.title }}</span>
                </span>
                <svg :class="{ 'rotate-180': expandedRec === rec.id }" class="w-5 h-5 text-gray-500 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </button>
              <div v-if="expandedRec === rec.id" :id="`rec-panel-${rec.id}`" role="region"
                class="p-4 bg-white dark:bg-gray-900 space-y-3 border-t border-gray-200 dark:border-gray-700">
                <div>
                  <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Шаги:</h4>
                  <p class="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line">{{ rec.steps }}</p>
                </div>
                <div>
                  <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Ожидаемый результат:</h4>
                  <p class="text-sm text-gray-600 dark:text-gray-400">{{ rec.expected }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3 pt-2">
          <button @click="copyReport"
            class="p-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-sm font-medium text-gray-900 dark:text-gray-100 transition-colors">
            📝 Скопировать отчёт
          </button>
          <button @click="downloadPDF"
            class="p-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium text-white transition-colors">
            📄 Скачать PDF
          </button>
        </div>
        <button v-if="!isStandalone && (isInstallable || isIOS)" @click="install"
          class="w-full py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 font-medium rounded-lg transition-colors flex items-center justify-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
          Установить на устройство
        </button>
        <button @click="restart"
          class="w-full py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg text-sm font-medium text-gray-900 dark:text-gray-100 transition-colors">
          Пройти заново
        </button>
      </div>
    </div>
    <footer class="w-full max-w-lg text-center text-xs text-gray-500 dark:text-gray-400 mt-8 pt-4 border-t border-gray-200 dark:border-gray-800">
      Инструмент создан Din Kana, PM/BA.<br>Для сотрудничества:
      <a href="https://t.me/din_kana" target="_blank" rel="noopener" class="text-blue-600 dark:text-blue-400 hover:underline">Telegram</a> ·
      <a href="https://www.linkedin.com/in/din-kana/" target="_blank" rel="noopener" class="text-blue-600 dark:text-blue-400 hover:underline">LinkedIn</a>
    </footer>
    <transition name="fade">
      <div v-if="flashMsg" class="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg shadow-lg text-sm">
        {{ flashMsg }}
      </div>
    </transition>
  </main>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>