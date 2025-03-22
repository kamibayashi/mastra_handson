import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import axios from 'axios'

// 検索結果の共通の型定義
interface BaseSearchResult {
  title: string
  url: string
}

// Web検索結果の型定義
interface WebSearchResult extends BaseSearchResult {
  snippet: string
}

// ニュース検索結果の型定義
interface NewsSearchResult extends BaseSearchResult {
  description: string
  publishDate?: string
  source?: string
}

// ビデオ検索結果の型定義
interface VideoSearchResult extends BaseSearchResult {
  description: string
  thumbnailUrl?: string
  duration?: string
  provider?: string
}

// 画像検索結果の型定義
interface ImageSearchResult extends BaseSearchResult {
  thumbnailUrl: string
  width?: number
  height?: number
}

// 検索タイプの定義
type SearchType = 'web' | 'news' | 'videos' | 'images'

/**
 * Brave Search ツール
 * Brave Search APIを利用して検索クエリに関連する情報を取得します
 */
export const webSearchTool = createTool({
  id: 'web-search',
  description:
    'Brave Searchを使用して、指定されたクエリに関連する情報を検索します',
  inputSchema: z.object({
    query: z.string().describe('検索クエリ'),
    searchType: z
      .enum(['web', 'news', 'videos', 'images'])
      .optional()
      .default('web')
      .describe('検索タイプ（web, news, videos, images）'),
    numResults: z
      .number()
      .optional()
      .default(30)
      .describe('取得する検索結果の数（最大100）'),
    language: z
      .string()
      .optional()
      .default('ja')
      .describe('検索結果の言語コード（例: ja, en）'),
    country: z
      .string()
      .optional()
      .describe(
        "検索結果の国コード（例: 'AR', 'AU', 'AT', 'BE', 'BR', 'CA', 'CL', 'DK', 'FI', 'FR', 'DE', 'HK', 'IN', 'ID', 'IT', 'JP', 'KR', 'MY', 'MX', 'NL', 'NZ', 'NO', 'CN', 'PL', 'PT', 'PH', 'RU', 'SA', 'ZA', 'ES', 'SE', 'CH', 'TW', 'TR', 'GB', 'US' or 'ALL'）"
      ),
    safeSearch: z
      .enum(['strict', 'moderate', 'off'])
      .optional()
      .default('moderate')
      .describe('セーフサーチの設定（strict, moderate, off）'),
    timeRange: z
      .enum(['day', 'week', 'month', 'year', 'all'])
      .optional()
      .default('all')
      .describe('検索結果の時間範囲'),
  }),
  outputSchema: z.object({
    success: z.boolean().describe('検索が成功したかどうか'),
    message: z.string().describe('処理結果のメッセージ'),
    searchType: z.string().describe('実行された検索タイプ'),
    results: z
      .array(
        z.object({
          title: z.string().describe('検索結果のタイトル'),
          url: z.string().describe('検索結果のURL'),
          description: z.string().optional().describe('検索結果の説明・概要'),
          thumbnailUrl: z
            .string()
            .optional()
            .describe('画像/動画のサムネイルURL'),
          publishDate: z.string().optional().describe('公開日（ニュース用）'),
          source: z.string().optional().describe('ソース（ニュース用）'),
          duration: z.string().optional().describe('動画の長さ'),
          provider: z.string().optional().describe('動画のプロバイダ'),
          width: z.number().optional().describe('画像の幅'),
          height: z.number().optional().describe('画像の高さ'),
        })
      )
      .optional()
      .describe('検索結果のリスト'),
    relatedQueries: z
      .array(z.string())
      .optional()
      .describe('関連する検索クエリ'),
  }),
  execute: async ({ context }) => {
    const {
      query,
      searchType = 'web',
      numResults,
      language,
      country,
      safeSearch,
      timeRange,
    } = context

    const braveApiKey = process.env.BRAVE_SEARCH_API_KEY

    if (!braveApiKey) {
      return {
        success: false,
        message:
          'Brave Search APIキーが設定されていません。環境変数 BRAVE_SEARCH_API_KEY を設定してください。',
        searchType,
      }
    }

    // リクエスト数を安全な範囲に制限
    const safeNumResults = Math.min(Math.max(1, numResults), 20)

    try {
      // 時間範囲をBrave Searchのパラメータに変換 (freshness パラメータ)
      let freshness = undefined
      switch (timeRange) {
        case 'day':
          freshness = 'pd' // past day
          break
        case 'week':
          freshness = 'pw' // past week
          break
        case 'month':
          freshness = 'pm' // past month
          break
        case 'year':
          freshness = 'py' // past year
          break
        // デフォルトはundefinedのままにして、パラメータ自体を送信しない
      }

      // 検索タイプに基づいてAPIエンドポイントを決定
      let apiUrl = 'https://api.search.brave.com/res/v1/'
      switch (searchType) {
        case 'web':
          apiUrl += 'web/search'
          break
        case 'news':
          apiUrl += 'news/search'
          break
        case 'videos':
          apiUrl += 'videos/search'
          break
        case 'images':
          apiUrl += 'images/search'
          break
        default:
          apiUrl += 'web/search'
      }

      // リクエストパラメータ - 基本パラメータを設定
      const params: Record<string, any> = {
        q: query,
        count: safeNumResults,
      }

      // search_langパラメータはWeb検索のみで使用
      if (searchType === 'web' && language && language.length === 2) {
        params.search_lang = language.toLowerCase()
      }

      // 国コードを適用（指定がある場合）
      if (country && country.length === 2) {
        params.country = country.toLowerCase()
      } else if (language && language.length === 2) {
        // 言語コードを国コードとしても使用（デフォルト）
        params.country = language.toLowerCase()
      }

      // セーフサーチ設定
      if (safeSearch) {
        params.safesearch = safeSearch
      }

      // freshnessパラメータが定義されていれば追加
      if (freshness) {
        params.freshness = freshness
      }

      // スペルチェックを有効化 - 精度向上のため
      params.spellcheck = 1

      console.log(`検索タイプ: ${searchType}`)
      console.log('リクエストパラメータ:', params)
      console.log(`APIエンドポイント: ${apiUrl}`)

      // APIリクエスト送信
      const response = await axios.get(apiUrl, {
        params,
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': braveApiKey,
        },
        timeout: 10000,
      })

      console.log('レスポンスステータス:', response.status)

      if (response.data) {
        console.log('レスポンスデータ構造:', Object.keys(response.data))
      }

      // 検索タイプに基づいて結果を抽出
      const results: Array<any> = []
      const relatedQueries: string[] = []

      // 関連クエリの抽出（共通処理）
      if (response.data?.query?.related) {
        response.data.query.related.forEach((item: string) => {
          relatedQueries.push(item)
        })
      }

      // 検索タイプごとに異なる結果抽出ロジック
      switch (searchType) {
        case 'web':
          if (response.data?.web?.results) {
            response.data.web.results.forEach((item: any) => {
              if (item.title && item.url) {
                const result: WebSearchResult = {
                  title: item.title,
                  url: item.url,
                  snippet: item.description || item.snippet || '',
                }
                results.push({
                  ...result,
                  description: result.snippet,
                })
              }
            })
          }
          break

        case 'news':
          if (response.data?.results) {
            response.data.results.forEach((item: any) => {
              if (item.title && item.url) {
                const result: NewsSearchResult = {
                  title: item.title,
                  url: item.url,
                  description: item.description || '',
                }

                // オプションフィールド
                if (item.published_time || item.publishTime) {
                  result.publishDate = item.published_time || item.publishTime
                }
                if (item.source) {
                  result.source = item.source
                }

                results.push(result)
              }
            })
          }
          break

        case 'videos':
          if (response.data?.results) {
            response.data.results.forEach((item: any) => {
              if (item.title && item.url) {
                const result: VideoSearchResult = {
                  title: item.title,
                  url: item.url,
                  description: item.description || '',
                }

                // オプションフィールド
                if (item.thumbnail) {
                  // サムネイルオブジェクトからURLを抽出するか、文字列の場合はそのまま使用
                  if (
                    typeof item.thumbnail === 'object' &&
                    item.thumbnail.url
                  ) {
                    result.thumbnailUrl = item.thumbnail.url
                  } else if (typeof item.thumbnail === 'string') {
                    result.thumbnailUrl = item.thumbnail
                  }
                }
                if (item.duration) {
                  result.duration = item.duration
                }
                if (item.provider) {
                  result.provider = item.provider
                }

                results.push(result)
              }
            })
          }
          break

        case 'images':
          if (response.data?.results) {
            response.data.results.forEach((item: any) => {
              if ((item.title || item.alt) && item.url) {
                const result: ImageSearchResult = {
                  title: item.title || item.alt || 'No Title',
                  url: item.url || item.source_url || '',
                  thumbnailUrl: '',
                }

                // サムネイルURLの抽出
                if (typeof item.thumbnail === 'object' && item.thumbnail.url) {
                  result.thumbnailUrl = item.thumbnail.url
                } else if (typeof item.thumbnail === 'string') {
                  result.thumbnailUrl = item.thumbnail
                } else if (typeof item.image === 'string') {
                  result.thumbnailUrl = item.image
                } else if (typeof item.src === 'string') {
                  result.thumbnailUrl = item.src
                } else {
                  result.thumbnailUrl = item.url || ''
                }

                // オプションフィールド
                if (item.width) {
                  result.width = parseInt(String(item.width), 10)
                }
                if (item.height) {
                  result.height = parseInt(String(item.height), 10)
                }

                results.push(result)
              }
            })
          }
          break
      }

      // デバッグ出力
      if (results.length === 0) {
        console.log(
          '結果なし。レスポンス構造:',
          JSON.stringify(response.data, null, 2).substring(0, 500) + '...'
        )
      }

      return {
        success: results.length > 0,
        message:
          results.length > 0
            ? `${results.length}件の${getSearchTypeName(searchType)}結果を取得しました`
            : `${getSearchTypeName(searchType)}結果が見つかりませんでした`,
        searchType,
        results: results.length > 0 ? results : undefined,
        relatedQueries: relatedQueries.length > 0 ? relatedQueries : undefined,
      }
    } catch (error: any) {
      console.error(`検索エラー: ${error.message}`)

      // エラーレスポンスの詳細を表示（存在する場合）
      if (error.response) {
        console.error('エラーステータス:', error.response.status)

        // エラーデータの詳細表示を改善
        if (error.response.data) {
          console.error(
            'エラーデータ:',
            JSON.stringify(error.response.data, null, 2)
          )

          // meta.errorsの詳細を表示
          if (error.response.data.error?.meta?.errors) {
            console.error(
              'バリデーションエラー詳細:',
              JSON.stringify(error.response.data.error.meta.errors, null, 2)
            )
          }
        } else {
          console.error('エラーデータ:', error.response.data)
        }
      }

      return {
        success: false,
        message: `${getSearchTypeName(searchType)}検索に失敗しました: ${error.message}`,
        searchType,
      }
    }
  },
})

/**
 * 検索タイプの日本語名を取得
 */
function getSearchTypeName(searchType: SearchType): string {
  switch (searchType) {
    case 'web':
      return 'Web'
    case 'news':
      return 'ニュース'
    case 'videos':
      return '動画'
    case 'images':
      return '画像'
    default:
      return 'Web'
  }
}
