import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Area, AnswerValue, QuizState, Recommendation } from '@/types'
import config from '@/data/config.json'
import recData from '@/data/recommendations.json'

const STORAGE_KEY = 'pm_flow_state'
const MAX_PER_AREA = 6

export const useQuizStore = defineStore('quiz', () => {
  const state = ref<QuizState>({
    currentQuestionIndex: 0,
    answers: {},
    isFinished: false
  })

  const questions = config.questions
  const progress = computed(() => ((state.value.currentQuestionIndex + 1) / questions.length) * 100)
  const currentQuestion = computed(() => questions[state.value.currentQuestionIndex])

  const areaScores = computed(() => {
    const scores: Record<Area, number> = {
      goals: 0, stakeholders: 0, planning: 0, risks: 0, team: 0, quality: 0
    }
    questions.forEach(q => {
      const area = q.area as Area
      const val = state.value.answers[q.id] ?? 0
      scores[area] += val
    })
    Object.keys(scores).forEach(k => {
      const area = k as Area
      scores[area] = Math.round((scores[area] / MAX_PER_AREA) * 100)
    })
    return scores
  })

  const healthScore = computed(() => {
    const s = areaScores.value
    const scopeWeighted = Math.min(s.goals * 1.3, 100)
    const total = (scopeWeighted + s.stakeholders + s.planning + s.risks + s.team + s.quality) / 6
    return Math.round(total)
  })

  const recommendations = computed<Recommendation[]>(() => {
    const scores = areaScores.value
    const matchedRecs: Recommendation[] = []

    for (const rule of recData.rules) {
      const isMatch = rule.conditions.every(cond => {
        const score = scores[cond.area as Area]
        if (cond.operator === '<') return score < cond.value
        if (cond.operator === '<=') return score <= cond.value
        if (cond.operator === '>') return score > cond.value
        if (cond.operator === '>=') return score >= cond.value
        return false
      })

      if (isMatch) {
        const rec = recData.recommendations.find(r => r.id === rule.recommendationId)
        if (rec && !matchedRecs.find(r => r.id === rec.id)) {
          matchedRecs.push(rec)
        }
      }
    }

    return matchedRecs
      .sort((a, b) => a.priority - b.priority)
      .slice(0, 5)
  })

  const hash = computed(() => {
    const vals = questions.map(q => state.value.answers[q.id] ?? 0).join('')
    return btoa(vals)
  })

  const setAnswer = (value: AnswerValue) => {
    const q = questions[state.value.currentQuestionIndex]
    state.value.answers[q.id] = value
    syncStorage()
    syncHash()
  }

  const next = () => {
    if (state.value.currentQuestionIndex < questions.length - 1) {
      state.value.currentQuestionIndex++
    } else {
      state.value.isFinished = true
      syncStorage()
    }
  }

  const prev = () => {
    if (state.value.currentQuestionIndex > 0) state.value.currentQuestionIndex--
  }

  const restart = () => {
    state.value.currentQuestionIndex = 0
    state.value.answers = {}
    state.value.isFinished = false
    syncStorage()
    window.location.hash = ''
  }

  const syncHash = () => {
    window.location.hash = hash.value
  }

  const syncStorage = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.value))
  }

  const restore = () => {
    const hashVal = window.location.hash.replace('#', '')
    const stored = localStorage.getItem(STORAGE_KEY)

    if (hashVal) {
      try {
        const decoded = atob(hashVal)
        if (decoded.length === questions.length) {
          decoded.split('').forEach((char, i) => {
            state.value.answers[questions[i].id] = Number(char) as AnswerValue
          })
          state.value.isFinished = true
          state.value.currentQuestionIndex = questions.length - 1
          return
        }
      } catch {}
    }

    if (stored) {
      try {
        Object.assign(state.value, JSON.parse(stored))
      } catch {}
    }
  }

  restore()

  return {
    state, questions, progress, currentQuestion, areaScores, healthScore, recommendations,
    setAnswer, next, prev, restart
  }
})