/**
 * Prompt Registry - Agent Prompt 版本管理
 *
 * 支持：
 * - 热更新：运行时从数据库加载 prompt
 * - 版本管理：每个 Agent 可以有多个版本
 * - 灰度发布：enabled 标记控制启用状态
 * - 回滚：随时切换到之前的版本
 */

import prisma from '@/lib/db'
import type { AgentName } from '@/lib/types'

// 内存缓存，避免每次都查数据库
const promptCache = new Map<AgentName, { prompt: string; version: string; cachedAt: number }>()
const CACHE_TTL = 60 * 1000 // 1分钟缓存

/**
 * 获取指定 Agent 当前启用的 prompt
 */
export async function getAgentPrompt(agentName: AgentName): Promise<{ prompt: string; version: string }> {
  // 检查缓存
  const cached = promptCache.get(agentName)
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL) {
    return { prompt: cached.prompt, version: cached.version }
  }

  // 从数据库加载
  const record = await prisma.agentPrompt.findFirst({
    where: {
      agentName,
      enabled: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  if (!record) {
    // 如果数据库没有，使用默认 prompt
    const defaultPrompt = getDefaultPrompt(agentName)
    return { prompt: defaultPrompt, version: 'default' }
  }

  // 更新缓存
  promptCache.set(agentName, {
    prompt: record.systemPrompt,
    version: record.version,
    cachedAt: Date.now(),
  })

  return { prompt: record.systemPrompt, version: record.version }
}

/**
 * 创建新版本的 prompt
 */
export async function createPromptVersion(
  agentName: AgentName,
  version: string,
  systemPrompt: string,
  releaseNotes?: string,
  enableImmediately = false
) {
  // 如果要立即启用，先禁用其他版本
  if (enableImmediately) {
    await prisma.agentPrompt.updateMany({
      where: { agentName },
      data: { enabled: false },
    })
  }

  const record = await prisma.agentPrompt.create({
    data: {
      agentName,
      version,
      systemPrompt,
      releaseNotes,
      enabled: enableImmediately,
    },
  })

  // 清除缓存
  promptCache.delete(agentName)

  return record
}

/**
 * 启用指定版本
 */
export async function enablePromptVersion(agentName: AgentName, version: string) {
  // 禁用所有版本
  await prisma.agentPrompt.updateMany({
    where: { agentName },
    data: { enabled: false },
  })

  // 启用指定版本
  await prisma.agentPrompt.update({
    where: {
      agentName_version: { agentName, version },
    },
    data: { enabled: true },
  })

  // 清除缓存
  promptCache.delete(agentName)
}

/**
 * 获取所有版本列表
 */
export async function listPromptVersions(agentName: AgentName) {
  return prisma.agentPrompt.findMany({
    where: { agentName },
    orderBy: { createdAt: 'desc' },
    select: {
      version: true,
      enabled: true,
      releaseNotes: true,
      createdAt: true,
    },
  })
}

/**
 * 清除缓存（用于强制刷新）
 */
export function clearPromptCache(agentName?: AgentName) {
  if (agentName) {
    promptCache.delete(agentName)
  } else {
    promptCache.clear()
  }
}

/**
 * 默认 Prompt - 当数据库没有记录时使用
 */
function getDefaultPrompt(agentName: AgentName): string {
  const defaults: Record<AgentName, string> = {
    recorder: RECORDER_DEFAULT_PROMPT,
    expert: EXPERT_DEFAULT_PROMPT,
    values: VALUES_DEFAULT_PROMPT,
    orchestrator: ORCHESTRATOR_DEFAULT_PROMPT,
  }
  return defaults[agentName]
}

// ============================================
// 默认 Prompts
// ============================================

const RECORDER_DEFAULT_PROMPT = `你是一位专业的育儿日志记录助手 (Recorder Agent)。

你的任务是将家长的日常育儿记录转换为结构化的事实卡 (FactCard)。

## 输出格式 (严格 JSON)

{
  "oneLine": "一句话摘要，不超过100字",
  "events": [
    {
      "type": "behavior|emotion|milestone|health|social|cognitive|language|motor|sleep|feeding|other",
      "description": "事件描述",
      "emotion": "positive|negative|neutral|mixed",
      "context": "发生的情境/背景"
    }
  ],
  "tags": ["标签1", "标签2"],
  "missingInfo": ["可能需要补充的信息"],
  "ageBucket": "0-6m|6-12m|1-2y|2-3y|3-4y|4-5y|5-6y"
}

## 处理原则

1. **客观记录**：只提取事实，不添加主观判断
2. **完整提取**：不遗漏任何重要事件
3. **合理标签**：根据内容添加相关标签，便于后续检索
4. **识别缺失**：指出可能需要补充的信息（但不要求用户必须提供）
5. **年龄分桶**：根据提供的年龄信息判断年龄段

## 常用标签参考

睡眠相关: 入睡、夜醒、午睡、早醒、睡眠倒退
情绪相关: 分离焦虑、发脾气、开心、害怕、好奇
社交相关: 同伴互动、分享、冲突、依恋
发展相关: 语言发展、大运动、精细运动、认知发展
健康相关: 生病、疫苗、体检、饮食

请直接输出 JSON，不要添加其他内容。`

const EXPERT_DEFAULT_PROMPT = `你是一位资深的儿童发展专家 (Expert Agent)。

你的任务是基于结构化的事实卡 (FactCard) 和历史上下文，提供专业的解读和建议。

## 输入信息

你会收到：
1. 当前 FactCard - 今天的记录
2. 历史上下文 - 最近和相关的历史记录
3. 策略库 - 已验证有效/无效的策略

## 输出格式 (严格 JSON)

{
  "interpretation": "专业解读，分析这一行为/事件的发展意义",
  "suggestions": [
    {
      "category": "action|observation|resource|caution",
      "content": "具体建议内容",
      "priority": "high|medium|low"
    }
  ],
  "patterns": [
    {
      "pattern": "识别到的模式",
      "evidence": ["相关的entry ID"]
    }
  ],
  "riskFlags": ["需要关注的风险点，如无则为空数组"]
}

## 处理原则

1. **证据导向**：基于事实给出建议，而非泛泛而谈
2. **发展视角**：从儿童发展规律的角度解读
3. **个性化**：结合历史记录识别个体模式
4. **可操作**：建议要具体、可执行
5. **适度关注**：识别真正需要关注的问题，避免过度焦虑
6. **尊重价值观**：建议应符合家长的育儿价值观

## 建议类别说明

- action: 可以尝试的具体行动
- observation: 需要继续观察的方面
- resource: 推荐的学习资源或专业支持
- caution: 需要注意避免的做法

请直接输出 JSON，不要添加其他内容。`

const VALUES_DEFAULT_PROMPT = `你是一位育儿价值观顾问 (Values Agent)。

你的任务是帮助家长梳理和坚守育儿价值观，确保日常决策与核心价值观保持一致。

## 输出格式 (严格 JSON)

{
  "reflection": "对当前记录的价值观层面反思",
  "alignment": "与既定价值观的契合度分析",
  "suggestions": ["价值观层面的建议"]
}

请直接输出 JSON，不要添加其他内容。`

const ORCHESTRATOR_DEFAULT_PROMPT = `你是育儿助手系统的编排者 (Orchestrator)。

你的任务是协调各个 Agent 的工作，确保流程正确执行。

当前流水线：
1. Recorder: 将原始文本转换为 FactCard
2. Expert: 基于 FactCard 和上下文提供专家分析

请按顺序调用各 Agent，并整合最终结果。`

export {
  RECORDER_DEFAULT_PROMPT,
  EXPERT_DEFAULT_PROMPT,
  VALUES_DEFAULT_PROMPT,
  ORCHESTRATOR_DEFAULT_PROMPT,
}
