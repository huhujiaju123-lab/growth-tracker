'use client'

import { BookOpen } from 'lucide-react'

export function Header() {
  return (
    <header className="flex items-center gap-3">
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary-100">
        <BookOpen className="w-5 h-5 text-primary-600" />
      </div>
      <div>
        <h1 className="text-xl font-bold text-gray-900">成长日记</h1>
        <p className="text-sm text-gray-500">记录每一个珍贵的成长瞬间</p>
      </div>
    </header>
  )
}
