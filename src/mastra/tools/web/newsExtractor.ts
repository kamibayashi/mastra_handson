import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import axios from 'axios'
import * as cheerio from 'cheerio'

/**
 * ニュース記事抽出ツール
 * ニュースサイトから記事の内容を抽出します
 */
export const newsExtractorTool = createTool({
  id: 'news-extractor',
  description: 'ニュースサイトから記事の内容を抽出します',
  inputSchema: z.object({
    url: z.string().describe('ニュース記事のURL'),
    extractImages: z
      .boolean()
      .optional()
      .default(false)
      .describe('画像情報も抽出するかどうか'),
  }),
  outputSchema: z.object({
    success: z.boolean().describe('抽出が成功したかどうか'),
    message: z.string().describe('処理結果のメッセージ'),
    article: z
      .object({
        title: z.string().describe('記事のタイトル'),
        content: z.string().describe('記事の本文'),
        author: z.string().optional().describe('著者名'),
        publishedDate: z.string().optional().describe('公開日時'),
        source: z.string().optional().describe('情報ソース'),
        images: z
          .array(
            z.object({
              url: z.string().describe('画像のURL'),
              alt: z.string().optional().describe('画像の代替テキスト'),
            })
          )
          .optional()
          .describe('記事内の画像情報（extractImages=trueの場合）'),
      })
      .optional()
      .describe('抽出された記事情報'),
  }),
  execute: async ({ context }) => {
    const { url, extractImages } = context

    try {
      // ユーザーエージェントを設定して、ボット検出を回避
      const headers = {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
      }

      console.log(`記事取得開始: ${url}`)

      // リクエスト送信
      const response = await axios.get(url, {
        headers,
        timeout: 10000,
      })

      console.log(`ステータスコード: ${response.status}`)
      console.log(`コンテンツタイプ: ${response.headers['content-type']}`)

      // HTML解析
      const $ = cheerio.load(response.data)

      // 記事タイトルの抽出（一般的なセレクタを試す）
      let title = $('h1').first().text().trim()
      if (!title) {
        // 代替セレクタを試す
        title =
          $('meta[property="og:title"]').attr('content') ||
          $('title').text().trim()
      }

      // 著者情報の抽出
      const author =
        $('[rel="author"]').first().text().trim() ||
        $('meta[name="author"]').attr('content') ||
        $('.author').first().text().trim() ||
        $('.byline').first().text().trim() ||
        undefined

      // 公開日の抽出
      const publishedDate =
        $('meta[property="article:published_time"]').attr('content') ||
        $('time').attr('datetime') ||
        $('[itemprop="datePublished"]').attr('content') ||
        $('.date').first().text().trim() ||
        undefined

      // 情報ソースの抽出
      const source =
        $('meta[property="og:site_name"]').attr('content') ||
        new URL(url).hostname ||
        undefined

      // 記事本文の抽出（複数のセレクタを試す）
      let content = ''
      const contentSelectors = [
        'article',
        '[itemprop="articleBody"]',
        '.article-body',
        '.entry-content',
        '.post-content',
        '.story-body',
        '#article-body',
        '.article__body',
      ]

      for (const selector of contentSelectors) {
        const element = $(selector).first()
        if (element.length > 0) {
          // スクリプトとスタイル要素を除去
          element.find('script, style').remove()
          content = element.text().trim().replace(/\s+/g, ' ')
          break
        }
      }

      // 本文が見つからない場合、より一般的なセレクタを試す
      if (!content) {
        content = $('main').text().trim().replace(/\s+/g, ' ')
      }

      // 画像情報の抽出（オプション）
      let images: Array<{ url: string; alt?: string }> = []
      if (extractImages) {
        const contentSelector = contentSelectors.find(
          (selector) => $(selector).length > 0
        )
        const imgElements = contentSelector
          ? $(contentSelector).find('img')
          : $('article img, .article img, .entry-content img')

        imgElements.each((_, element) => {
          const imgUrl = $(element).attr('data-src') || $(element).attr('src')
          const alt = $(element).attr('alt')

          if (imgUrl) {
            // 相対URLを絶対URLに変換
            const absoluteUrl = new URL(imgUrl, url).toString()
            images.push({
              url: absoluteUrl,
              alt: alt || undefined,
            })
          }
        })
      }

      // 記事情報が不十分な場合
      if (!title || !content) {
        return {
          success: false,
          message:
            '記事の抽出に失敗しました。サポートされていないサイト形式かもしれません。',
        }
      }

      return {
        success: true,
        message: '記事の抽出に成功しました。',
        article: {
          title,
          content,
          author,
          publishedDate,
          source,
          images: images?.length ? images : undefined,
        },
      }
    } catch (error: any) {
      console.error(`記事抽出エラー: ${error.message}`)
      return {
        success: false,
        message: `記事の抽出に失敗しました: ${error.message}`,
      }
    }
  },
})
