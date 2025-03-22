import { webSearchTool } from '../src/mastra/tools/web/webSearch'
import * as dotenv from 'dotenv'

// 環境変数の読み込み
dotenv.config({ path: '.env.development' })

// 指定したミリ秒待機する関数
const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

// Brave Search APIキーが設定されているか確認
if (!process.env.BRAVE_SEARCH_API_KEY) {
  console.error('エラー: BRAVE_SEARCH_API_KEY が設定されていません')
  console.error(
    '`.env.development` ファイルに BRAVE_SEARCH_API_KEY を設定してください'
  )
  process.exit(1)
}

// webSearchToolが正しく読み込まれているか確認
if (!webSearchTool || typeof webSearchTool.execute !== 'function') {
  console.error(
    'エラー: webSearchToolが正しく読み込まれていないか、executeメソッドがありません'
  )
  process.exit(1)
}

// テストクエリ定義
const testQueries = [
  {
    id: 1,
    searchType: 'web' as const,
    query: '人工知能 最新技術',
    numResults: 3,
    language: 'jp', // 日本
    timeRange: 'month' as const,
  },
  {
    id: 2,
    searchType: 'news' as const,
    query: 'AI News',
    numResults: 3,
    language: 'us', // アメリカ
    timeRange: 'day' as const,
  },
  {
    id: 3,
    searchType: 'videos' as const,
    query: 'programming tutorial',
    numResults: 2,
    language: 'en',
    country: 'us',
    timeRange: 'month' as const,
  },
  {
    id: 4,
    searchType: 'images' as const,
    query: 'beautiful landscape',
    numResults: 3,
    language: 'en',
    country: 'us',
    safeSearch: 'strict' as const,
    timeRange: 'all' as const,
  },
]

// Brave Search APIのテスト
async function testWebSearch(): Promise<void> {
  console.log('===== Brave Search API テスト開始 =====')

  for (const test of testQueries) {
    console.log(`\nテスト ${test.id}: "${test.query}" (${test.searchType})`)
    console.log('パラメータ:', {
      searchType: test.searchType,
      numResults: test.numResults,
      language: test.language,
      country: test.country || '(自動設定)',
      safeSearch: test.safeSearch || 'moderate',
      timeRange: test.timeRange,
    })

    try {
      const result = await webSearchTool.execute({
        context: {
          query: test.query,
          searchType: test.searchType,
          numResults: test.numResults,
          language: test.language,
          country: test.country,
          safeSearch: test.safeSearch as any,
          timeRange: test.timeRange,
        },
      })

      console.log('テスト結果:', result.success ? '成功' : '失敗')
      console.log('メッセージ:', result.message)

      if (result.results && result.results.length > 0) {
        console.log('\n検索結果サンプル:')
        result.results.slice(0, 2).forEach((item, index) => {
          console.log(`\n[${index + 1}] ${item.title}`)
          console.log(`URL: ${item.url}`)

          if (item.description) {
            console.log(`説明: ${item.description.substring(0, 150)}...`)
          }

          // 検索タイプ別の追加情報を表示
          if (test.searchType === 'news' && item.publishDate) {
            console.log(`公開日: ${item.publishDate}`)
            if (item.source) console.log(`ソース: ${item.source}`)
          } else if (test.searchType === 'videos') {
            if (item.thumbnailUrl)
              console.log(`サムネイル: ${item.thumbnailUrl}`)
            if (item.duration) console.log(`長さ: ${item.duration}`)
            if (item.provider) console.log(`プロバイダ: ${item.provider}`)
          } else if (test.searchType === 'images') {
            if (item.thumbnailUrl)
              console.log(`サムネイル: ${item.thumbnailUrl}`)
            if (item.width && item.height)
              console.log(`サイズ: ${item.width}x${item.height}`)
          }
        })

        console.log(`\n合計: ${result.results.length} 件の結果`)
      }

      if (result.relatedQueries && result.relatedQueries.length > 0) {
        console.log('\n関連検索クエリ:')
        console.log(result.relatedQueries.join(', '))
      }
    } catch (error) {
      console.error(`テスト ${test.id} 実行エラー:`, error)
    }

    // レート制限に対応するため次のテスト前に待機
    if (test.id < testQueries.length) {
      console.log('\nAPIレート制限に対応するため2秒待機中...')
      await sleep(2000)
    }
  }

  console.log('\n===== Brave Search API テスト完了 =====')
}

// テストの実行
testWebSearch().catch((error) => {
  console.error('テスト実行中にエラーが発生しました:', error)
})
