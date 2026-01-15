import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '成长日记 - 育儿记录助手',
  description: 'AI驱动的智能育儿日志与成长分析系统',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-stone-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {children}
        </div>
      </body>
    </html>
  )
}
