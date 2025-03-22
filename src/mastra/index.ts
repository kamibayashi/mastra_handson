import { Mastra } from '@mastra/core/mastra'
import { createLogger } from '@mastra/core/logger'
import { cursorRulesAgent } from './agents/cursorRulesAgent'
import { webNewsAgent } from './agents/webNewsAgent'
import { aiResearchAgent } from './agents/aiResearchAgent'

export const mastra = new Mastra({
  agents: {
    cursorRulesAgent,
    webNewsAgent,
    aiResearchAgent,
  },
  logger: createLogger({
    name: 'Assistant',
    level: 'info',
  }),
})
