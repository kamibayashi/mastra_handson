import { webScraperTool } from '../src/mastra/tools/web/webScraper'
import * as dotenv from 'dotenv'

// 環境変数の読み込み
dotenv.config({ path: '.env.development' })

// テスト対象のURL
const testUrls = [
  {
    id: 1,
    name: '一般的なニュースサイト',
    url: 'https://news.yahoo.co.jp/',
    selector: 'article',
    extractLinks: true,
  },
  {
    id: 2,
    name: '技術ブログ',
    url: 'https://github.blog/',
    selector: '.post-item',
    extractLinks: true,
  },
  {
    id: 3,
    name: 'シンプルなHTML',
    url: 'https://example.com',
    selector: '', // セレクタなし - ページ全体
    extractLinks: false,
  },
]

// 指定したミリ秒待機する関数
const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

// webScraperTool型の存在確認
if (!webScraperTool || typeof webScraperTool.execute !== 'function') {
  console.error(
    'エラー: webScraperToolが正しく読み込まれていないか、executeメソッドがありません'
  )
  process.exit(1)
}

/**
 * Webスクレイピングツールをテスト
 */
async function testWebScraper(): Promise<void> {
  console.log('===== Webスクレイピングツール テスト開始 =====')

  for (const test of testUrls) {
    console.log(`\nテスト ${test.id}: ${test.name}`)
    console.log(`URL: ${test.url}`)
    console.log(`セレクタ: ${test.selector || '(なし - ページ全体)'}`)
    console.log(`リンク抽出: ${test.extractLinks ? 'あり' : 'なし'}`)

    try {
      // webScraperToolの実行
      const result = await webScraperTool.execute({
        context: {
          url: test.url,
          selector: test.selector || undefined,
          extractLinks: test.extractLinks,
          timeout: 15000, // タイムアウト15秒
        },
      })

      console.log('\n結果:')
      console.log(`ステータス: ${result.success ? '成功' : '失敗'}`)
      console.log(`メッセージ: ${result.message}`)

      if (result.title) {
        console.log(`タイトル: ${result.title}`)
      }

      if (result.content) {
        // コンテンツの一部を表示（最初の150文字）
        console.log('\nコンテンツ（抜粋）:')
        console.log(`${result.content.substring(0, 150)}...`)
        console.log(`総文字数: ${result.content.length}文字`)
      }

      if (result.links && result.links.length > 0) {
        console.log(`\n抽出されたリンク: ${result.links.length}件`)
        // 最初の5件のリンクを表示
        console.log('リンクサンプル（最初の5件）:')
        result.links.slice(0, 5).forEach((link, index) => {
          console.log(
            `[${index + 1}] ${link.text.substring(0, 30)}: ${link.href}`
          )
        })
      }

      if (result.metadata) {
        const metaKeys = Object.keys(result.metadata)
        console.log(`\nメタデータ: ${metaKeys.length}個`)
        // 重要なメタデータを表示
        const importantMeta = [
          'description',
          'og:title',
          'og:description',
          'keywords',
        ]
        importantMeta.forEach((key) => {
          if (result.metadata?.[key]) {
            console.log(`${key}: ${result.metadata[key].substring(0, 100)}...`)
          }
        })
      }
    } catch (error) {
      console.error(`テスト ${test.id} 実行エラー:`, error)
    }

    // レート制限とサーバー負荷軽減のため待機
    if (test.id < testUrls.length) {
      console.log('\nサーバー負荷軽減のため3秒待機中...')
      await sleep(3000)
    }
  }

  console.log('\n===== Webスクレイピングツール テスト完了 =====')
}

// テストの実行
testWebScraper().catch((error) => {
  console.error('テスト実行中にエラーが発生しました:', error)
})
