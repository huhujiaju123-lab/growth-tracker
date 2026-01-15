// 核心类型定义

import { z } from 'zod'

// ============================================
// FactCard 事件结构
// ============================================

export const EventSchema = z.object({
  type: z.enum(['behavior', 'emotion', 'milestone', 'health', 'social', 'cognitive', 'language', 'motor', 'sleep', 'feeding', 'other']),
  description: z.string(),
  emotion: z.enum(['positive', 'negative', 'neutral', 'mixed']).optional(),
  context: z.string().optional(),
})

export type Event = z.infer<typeof EventSchema>

// ============================================
// Recorder Agent 输出
// ============================================

export const FactCardOutputSchema = z.object({
  oneLine: z.string().max(100),
  events: z.array(EventSchema),
  tags: z.array(z.string()),
  missingInfo: z.array(z.string()),
  ageBucket: z.enum(['0-6m', '6-12m', '1-2y', '2-3y', '3-4y', '4-5y', '5-6y']).optional(),
})

export type FactCardOutput = z.infer<typeof FactCardOutputSchema>

// ============================================
// Expert Agent 输出
// ============================================

export const SuggestionSchema = z.object({
  category: z.enum(['action', 'observation', 'resource', 'caution']),
  content: z.string(),
  priority: z.enum(['high', 'medium', 'low']),
})

export const PatternSchema = z.object({
  pattern: z.string(),
  evidence: z.array(z.string()), // entry IDs
})

export const ExpertOutputSchema = z.object({
  interpretation: z.string(),
  suggestions: z.array(SuggestionSchema),
  patterns: z.array(PatternSchema).optional(),
  riskFlags: z.array(z.string()),
})

export type ExpertOutput = z.infer<typeof ExpertOutputSchema>

// ============================================
// API 请求/响应
// ============================================

export interface CreateEntryRequest {
  rawText: string
  entryDate: string // ISO date string
  childAge?: string
}

export interface EntryWithAnalysis {
  id: string
  rawText: string
  entryDate: Date
  childAge: string | null
  createdAt: Date
  factCard: {
    id: string
    oneLine: string
    events: Event[]
    tags: string[]
    missingInfo: string[]
    ageBucket: string | null
    expertAnalysis: {
      interpretation: string
      suggestions: Array<{
        category: string
        content: string
        priority: string
      }>
      patterns: Array<{
        pattern: string
        evidence: string[]
      }> | null
      riskFlags: string[]
    } | null
  } | null
}

// ============================================
// Agent 类型
// ============================================

export type AgentName = 'recorder' | 'expert' | 'values' | 'orchestrator'

export interface AgentConfig {
  name: AgentName
  model: string
  maxTokens: number
  temperature: number
}

// ============================================
// 检索相关
// ============================================

export interface RetrievalContext {
  recentEntries: EntryWithAnalysis[]
  similarEntries: EntryWithAnalysis[]
  strategies: Array<{
    category: string
    description: string
    conditions: string | null
  }>
}
