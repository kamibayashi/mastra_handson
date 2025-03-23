import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'

const MODEL_CONFIG = {
  // デフォルトモデル
  DEFAULT: 'gemini',

  // 各モデルの詳細設定
  GEMINI: {
    id: 'gemini-2.0-flash',
    maxOutputTokens: 4096,
    temperature: 0.7,
    topP: 0.9,
  },

  CLAUDE: {
    id: 'claude-3-7-sonnet-20250219',
    maxTokens: 4096,
    temperature: 0.7,
  },

  OPENAI: {
    id: 'gpt-4o',
    maxTokens: 4096,
    temperature: 0.7,
  },
}

// Google Gemini AIプロバイダーの作成
export const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY || '',
})

// Anthropic Claudeプロバイダーの作成
export const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

// OpenAI/OpenRouter プロバイダーの作成
export const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
})

// エンべディングモデルのインスタンス
export const googleEmbeddingModel =
  google.textEmbeddingModel('text-embedding-004')

// 各エージェント用のデフォルトモデル
export function getDefaultModel() {
  switch (MODEL_CONFIG.DEFAULT) {
    case 'claude':
      return anthropic(MODEL_CONFIG.CLAUDE.id)
    case 'openai':
      return openai(MODEL_CONFIG.OPENAI.id)
    default: // 'gemini'
      return google(MODEL_CONFIG.GEMINI.id)
  }
}
