'use client'

import { useState, useEffect } from 'react'
import { EntryForm } from '@/components/entry/EntryForm'
import { Timeline } from '@/components/timeline/Timeline'
import { Header } from '@/components/ui/Header'
import type { EntryWithAnalysis } from '@/lib/types'

export default function Home() {
  const [entries, setEntries] = useState<EntryWithAnalysis[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 加载日志列表
  const loadEntries = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/entry?limit=50')
      const data = await res.json()
      if (data.success) {
        setEntries(data.entries)
      } else {
        setError(data.error)
      }
    } catch (err) {
      setError('加载失败，请刷新重试')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEntries()
  }, [])

  // 新日志创建成功后刷新列表
  const handleEntryCreated = (newEntry: EntryWithAnalysis) => {
    setEntries((prev) => [newEntry, ...prev])
  }

  return (
    <main>
      <Header />

      <div className="mt-8 space-y-8">
        {/* 日志输入区域 */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            记录今天
          </h2>
          <EntryForm onSuccess={handleEntryCreated} />
        </section>

        {/* 时间线区域 */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            成长轨迹
          </h2>
          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4">
              {error}
            </div>
          )}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-pulse-soft text-gray-500">
                加载中...
              </div>
            </div>
          ) : (
            <Timeline entries={entries} />
          )}
        </section>
      </div>
    </main>
  )
}
