'use client'

import { useState, useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import { ProblemList } from '@/components/problem/ProblemList'
import { ProblemDetailView } from '@/components/problem/ProblemDetailView'
import { JournalPanel } from '@/components/journal/JournalPanel'
import { ExpertPanel } from '@/components/expert/ExpertPanel'
import type { EntryWithAnalysis, ParentingQuestion } from '@/lib/types'

export default function Home() {
  // 问题清单
  const [questions, setQuestions] = useState<ParentingQuestion[]>([])
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null)

  // 日志
  const [entries, setEntries] = useState<EntryWithAnalysis[]>([])
  const [loadingEntries, setLoadingEntries] = useState(true)

  // 对话
  const [conversationId, setConversationId] = useState<string | null>(null)

  // 新问题弹窗
  const [showNewQuestion, setShowNewQuestion] = useState(false)
  const [newQuestionText, setNewQuestionText] = useState('')
  const [creatingQuestion, setCreatingQuestion] = useState(false)

  // 防止重复提交
  const isCreatingRef = useRef(false)

  // 加载数据
  useEffect(() => {
    loadEntries()
    loadQuestions()
  }, [])

  const loadEntries = async () => {
    try {
      setLoadingEntries(true)
      const res = await fetch('/api/entry?limit=50')
      const data = await res.json()
      if (data.success) {
        setEntries(data.entries)
      }
    } catch (error) {
      console.error('Failed to load entries:', error)
    } finally {
      setLoadingEntries(false)
    }
  }

  const loadQuestions = async () => {
    try {
      const res = await fetch('/api/questions')
      const data = await res.json()
      if (data.success) {
        setQuestions(data.questions)
      }
    } catch (error) {
      console.error('Failed to load questions:', error)
    }
  }

  const handleEntryCreated = (newEntry: EntryWithAnalysis) => {
    setEntries(prev => [newEntry, ...prev])
  }

  // 优化：乐观更新 + 防重复
  const handleEntryOptimistic = (tempEntry: EntryWithAnalysis) => {
    setEntries(prev => [tempEntry, ...prev])
  }

  const handleEntryConfirmed = (tempId: string, confirmedEntry: EntryWithAnalysis) => {
    setEntries(prev =>
      prev.map(e => (e.id === tempId ? confirmedEntry : e))
    )
  }

  const handleEntryFailed = (tempId: string) => {
    setEntries(prev => prev.filter(e => e.id !== tempId))
  }

  const handleAddNewQuestion = async () => {
    if (!newQuestionText.trim()) return

    // 防止重复提交
    if (isCreatingRef.current || creatingQuestion) return
    isCreatingRef.current = true
    setCreatingQuestion(true)

    const questionText = newQuestionText.trim()

    // 乐观更新：立即显示
    const tempId = `temp-${Date.now()}`
    const tempQuestion: ParentingQuestion = {
      id: tempId,
      question: questionText,
      stage: 'observing',
      currentConclusion: null,
      conclusionSource: null,
      displayOrder: 0,
      relatedEntryIds: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      observations: [],
      discussions: [],
    }
    setQuestions(prev => [tempQuestion, ...prev])
    setNewQuestionText('')
    setShowNewQuestion(false)

    try {
      const res = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: questionText }),
      })

      const data = await res.json()
      if (data.success) {
        // 替换临时数据为真实数据
        setQuestions(prev =>
          prev.map(q => (q.id === tempId ? data.question : q))
        )
      } else {
        // 失败时移除
        setQuestions(prev => prev.filter(q => q.id !== tempId))
      }
    } catch (error) {
      console.error('Failed to create question:', error)
      setQuestions(prev => prev.filter(q => q.id !== tempId))
    } finally {
      setCreatingQuestion(false)
      isCreatingRef.current = false
    }
  }

  const handleQuestionUpdate = (updatedQuestion: ParentingQuestion) => {
    setQuestions(prev =>
      prev.map(q => (q.id === updatedQuestion.id ? updatedQuestion : q))
    )
  }

  // 获取选中的问题详情
  const selectedQuestion = questions.find(q => q.id === selectedQuestionId)

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* 顶部：问题清单区 (约 20%) */}
      <div className="flex-shrink-0">
        <ProblemList
          questions={questions}
          selectedId={selectedQuestionId}
          onSelect={setSelectedQuestionId}
          onAddNew={() => setShowNewQuestion(true)}
        />
      </div>

      {/* 底部：主内容区 (约 80%) */}
      <div className="flex-1 flex overflow-hidden">
        {selectedQuestion ? (
          // 问题详情视图
          <ProblemDetailView
            question={selectedQuestion}
            onUpdate={handleQuestionUpdate}
          />
        ) : (
          // 默认视图：日志 + 专家讨论
          <>
            {/* 左侧：日志记录 */}
            <div className="w-[320px] border-r border-gray-200">
              <JournalPanel
                entries={entries}
                onEntryCreated={handleEntryCreated}
                onEntryOptimistic={handleEntryOptimistic}
                onEntryConfirmed={handleEntryConfirmed}
                onEntryFailed={handleEntryFailed}
              />
            </div>

            {/* 右侧：专家讨论 */}
            <div className="flex-1">
              <ExpertPanel
                conversationId={conversationId}
                onConversationCreated={setConversationId}
              />
            </div>
          </>
        )}
      </div>

      {/* 新问题弹窗 */}
      {showNewQuestion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">添加新问题</h3>
            <textarea
              value={newQuestionText}
              onChange={(e) => setNewQuestionText(e.target.value)}
              placeholder="描述你的育儿问题..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none resize-none"
              autoFocus
              disabled={creatingQuestion}
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => {
                  setShowNewQuestion(false)
                  setNewQuestionText('')
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                disabled={creatingQuestion}
              >
                取消
              </button>
              <button
                onClick={handleAddNewQuestion}
                disabled={!newQuestionText.trim() || creatingQuestion}
                className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {creatingQuestion && <Loader2 className="w-4 h-4 animate-spin" />}
                {creatingQuestion ? '添加中...' : '添加'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
