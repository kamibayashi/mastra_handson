import { aiResearchAgent } from '../src/mastra/agents/aiResearchAgent'
import * as dotenv from 'dotenv'

// 環境変数の読み込み
dotenv.config({ path: '.env.development' })

// API Keyが設定されているか確認
if (!process.env.GOOGLE_API_KEY) {
  console.error('エラー: GOOGLE_API_KEY が設定されていません')
  console.error('`.env.development` ファイルに GOOGLE_API_KEY を設定してください')
  process.exit(1)
}

if (!process.env.BRAVE_SEARCH_API_KEY) {
  console.error('エラー: BRAVE_SEARCH_API_KEY が設定されていません')
  console.error('`.env.development` ファイルに BRAVE_SEARCH_API_KEY を設定してください')
  process.exit(1)
}

// テストする質問リスト
const testQueries = [
  {
    id: 1,
    query: '最新の大規模言語モデル(LLM)の研究トレンドを教えてください',
    description: 'LLM研究トレンド',
  },
  {
    id: 2,
    query: 'AIモデルの量子化技術について最新の情報を教えてください',
    description: 'AI量子化技術',
  },
  {
    id: 3,
    query: '生成AIの倫理問題と規制の最新動向について教えてください',
    description: 'AI倫理と規制',
  },
]

/**
 * aiResearchAgentをテスト実行する関数
 */
async function testAIResearchAgent() {
  console.log('===== AI研究エージェント テスト開始 =====\n')

  // 最初の質問のみテスト実行（すべての質問を実行すると時間がかかりすぎるため）
  const testQuery = testQueries[0]
  console.log(`テスト ${testQuery.id}: ${testQuery.description}`)
  console.log(`質問: "${testQuery.query}"\n`)

  try {
    console.log('エージェントに質問を送信中...')
    const startTime = Date.now()

    // エージェントの実行
    const response = await aiResearchAgent.generate(testQuery.query)

    const endTime = Date.now()
    const executionTime = (endTime - startTime) / 1000 // 秒単位

    console.log(`\n回答時間: ${executionTime.toFixed(2)}秒\n`)
    console.log('===== 回答 =====\n')
    console.log(response.text)
    console.log('\n===== 回答終了 =====')

    // ツール使用状況の集計
    if (response.toolUses && response.toolUses.length > 0) {
      console.log('\n使用されたツール:')

      const toolCounts: Record<string, number> = {}
      response.toolUses.forEach(tool => {
        const toolName = tool.toolName
        toolCounts[toolName] = (toolCounts[toolName] || 0) + 1
      })

      Object.entries(toolCounts).forEach(([tool, count]) => {
        console.log(`- ${tool}: ${count}回`)
      })
    }
  } catch (error) {
    console.error('エージェント実行エラー:', error)
  }

  console.log('\n===== AI研究エージェント テスト完了 =====')
}

// テスト実行
testAIResearchAgent().catch(error => {
  console.error('テスト実行中にエラーが発生しました:', error)
})