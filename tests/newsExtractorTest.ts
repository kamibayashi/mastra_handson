import { newsExtractorTool } from '../src/mastra/tools/web/newsExtractor'
import * as dotenv from 'dotenv'

// 環境変数の読み込み
dotenv.config({ path: '.env.development' })

// 指定したミリ秒待機する関数
const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

// newsExtractorToolの存在確認
if (typeof newsExtractorTool === 'undefined') {
  console.error('エラー: newsExtractorToolが読み込めません')
  process.exit(1)
}

// ニュース記事のテストURL（アクセス可能なものに更新）
const testArticles = [
  {
    id: 1,
    name: 'Wikipedia記事',
    url: 'https://en.wikipedia.org/wiki/Artificial_intelligence',
    extractImages: true,
  },
  {
    id: 2,
    name: 'MDN Web Docs記事',
    url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript',
    extractImages: false,
  },
  {
    id: 3,
    name: 'W3Schools記事',
    url: 'https://www.w3schools.com/html/html_intro.asp',
    extractImages: true,
  },
]

/**
 * ニュース抽出ツールをテスト
 */
async function testNewsExtractor(): Promise<void> {
  console.log('===== ニュース抽出ツール テスト開始 =====')

  for (const test of testArticles) {
    console.log(`\nテスト ${test.id}: ${test.name}`)
    console.log(`URL: ${test.url}`)
    console.log(`画像抽出: ${test.extractImages ? 'あり' : 'なし'}`)

    try {
      // newsExtractorToolの実行
      const result = await newsExtractorTool.execute({
        context: {
          url: test.url,
          extractImages: test.extractImages,
        },
      })

      console.log('\n結果:')
      console.log(`ステータス: ${result.success ? '成功' : '失敗'}`)
      console.log(`メッセージ: ${result.message}`)

      if (result.article) {
        console.log(`\nタイトル: ${result.article.title}`)

        if (result.article.author) {
          console.log(`著者: ${result.article.author}`)
        }

        if (result.article.publishedDate) {
          console.log(`公開日時: ${result.article.publishedDate}`)
        }

        if (result.article.source) {
          console.log(`ソース: ${result.article.source}`)
        }

        // 本文の一部を表示（最初の200文字）
        console.log('\n本文（抜粋）:')
        console.log(`${result.article.content.substring(0, 200)}...`)
        console.log(`総文字数: ${result.article.content.length}文字`)

        // 画像情報の表示
        if (result.article.images && result.article.images.length > 0) {
          console.log(`\n画像: ${result.article.images.length}件`)
          // 最初の3件の画像を表示
          console.log('画像サンプル（最初の3件）:')
          result.article.images.slice(0, 3).forEach((image, index) => {
            console.log(`[${index + 1}] URL: ${image.url}`)
            if (image.alt) {
              console.log(`    代替テキスト: ${image.alt}`)
            }
          })
        }
      }
    } catch (error) {
      console.error(`テスト ${test.id} 実行エラー:`, error)
    }

    // サーバー負荷軽減のため待機
    if (test.id < testArticles.length) {
      console.log('\nサーバー負荷軽減のため3秒待機中...')
      await sleep(3000)
    }
  }

  console.log('\n===== ニュース抽出ツール テスト完了 =====')
}

// テストの実行
testNewsExtractor().catch((error) => {
  console.error('テスト実行中にエラーが発生しました:', error)
})
