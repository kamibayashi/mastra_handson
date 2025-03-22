import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import axios from 'axios'
import * as cheerio from 'cheerio'

/**
 * Webスクレイピングツール
 * 指定されたURLのWebページの内容を取得します
 */
export const webScraperTool = createTool({
  id: 'web-scraper',
  description: '指定されたURLのWebページの内容を取得し、テキスト形式で返します',
  inputSchema: z.object({
    url: z.string().describe('スクレイピングするWebページのURL'),
    selector: z
      .string()
      .optional()
      .describe('取得したい要素のCSSセレクタ（省略時は全体を取得）'),
    extractLinks: z
      .boolean()
      .optional()
      .default(false)
      .describe('ページ内のリンクを抽出するかどうか'),
    timeout: z
      .number()
      .optional()
      .default(10000)
      .describe('リクエストのタイムアウト時間（ミリ秒）'),
  }),
  outputSchema: z.object({
    success: z.boolean().describe('スクレイピングが成功したかどうか'),
    message: z.string().describe('処理結果のメッセージ'),
    content: z.string().optional().describe('取得したWebページのコンテンツ'),
    links: z
      .array(
        z.object({
          text: z.string().describe('リンクのテキスト'),
          href: z.string().describe('リンクのURL'),
        })
      )
      .optional()
      .describe('ページ内のリンク情報（extractLinks=trueの場合）'),
    title: z.string().optional().describe('ページのタイトル'),
    metadata: z
      .record(z.string(), z.string())
      .optional()
      .describe('メタデータ情報'),
  }),
  execute: async ({ context }) => {
    const { url, selector, extractLinks, timeout } = context

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

      console.log(`スクレイピング開始: ${url}`)

      // リクエスト送信
      const response = await axios.get(url, {
        headers,
        timeout,
        maxContentLength: 10485760, // 10MB
      })

      console.log(`ステータスコード: ${response.status}`)
      console.log(`コンテンツタイプ: ${response.headers['content-type']}`)

      // HTML解析
      const $ = cheerio.load(response.data)

      // ページのタイトル取得
      const title = $('title').text().trim()

      // メタデータ取得
      const metadata: Record<string, string> = {}
      $('meta').each((_, element) => {
        const name = $(element).attr('name') || $(element).attr('property')
        const content = $(element).attr('content')
        if (name && content) {
          metadata[name] = content
        }
      })

      // 指定されたセレクタに基づいてコンテンツを取得
      let content = ''
      if (selector) {
        $(selector).each((_, element) => {
          content += $(element).text().trim() + '\n'
        })
      } else {
        // セレクタが指定されていない場合は、本文のテキストを取得
        // スクリプト、スタイル、メタ情報を除去
        content = $('body')
          .clone()
          .find('script, style, meta, link, noscript')
          .remove()
          .end()
          .text()
          .replace(/\s+/g, ' ')
          .trim()
      }

      // リンク情報の取得（オプション）
      let links
      if (extractLinks) {
        links = []
        $('a').each((_, element) => {
          const text = $(element).text().trim()
          const href = $(element).attr('href')
          if (href) {
            // 相対URLを絶対URLに変換
            const absoluteHref = new URL(href, url).toString()
            links.push({ text, href: absoluteHref })
          }
        })
      }

      return {
        success: true,
        message: 'Webページのスクレイピングに成功しました',
        content,
        links,
        title,
        metadata,
      }
    } catch (error: any) {
      console.error(`スクレイピングエラー: ${error.message}`)
      return {
        success: false,
        message: `Webページのスクレイピングに失敗しました: ${error.message}`,
      }
    }
  },
})
