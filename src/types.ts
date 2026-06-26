export type AnswerValue = 0 | 1 | 2 | 3
export type Area = 'goals' | 'stakeholders' | 'planning' | 'risks' | 'team' | 'quality'

export interface Question {
  id: string
  area: Area
  text: string
  tooltip: string
}

export interface Recommendation {
  id: string
  title: string
  steps: string
  expected: string
  priority: number
}

export interface RuleCondition {
  area: Area
  operator: '<' | '<=' | '>' | '>='
  value: number
}

export interface Rule {
  id: string
  recommendationId: string
  conditions: RuleCondition[]
}

export interface RecommendationsData {
  recommendations: Recommendation[]
  rules: Rule[]
}

export interface QuizState {
  currentQuestionIndex: number
  answers: Record<string, AnswerValue | null>
  isFinished: boolean
}