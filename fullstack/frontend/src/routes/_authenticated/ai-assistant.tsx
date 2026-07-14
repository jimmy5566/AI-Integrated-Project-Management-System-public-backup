import { useState, useRef, useEffect } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Send, Bot, User, Sparkles, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react'

export const Route = createFileRoute('/_authenticated/ai-assistant')({
  component: AIChatbot,
})

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const initialMessages: Message[] = [
  {
    id: '1',
    role: 'assistant',
    content: "Hello! I'm your AI Project Assistant for GAMA Consulting. I can help you with project status updates, risk analysis, task prioritization, and actionable insights. What would you like to know?",
    timestamp: new Date(),
  },
]

const quickActions = [
  { label: 'Project Status Summary', icon: TrendingUp },
  { label: 'Risk Analysis', icon: AlertTriangle },
  { label: 'Overdue Tasks', icon: CheckCircle },
  { label: 'Revenue Insights', icon: Sparkles },
]

const aiResponses: Record<string, string> = {
  'project status': `Project Status Summary (as of ${new Date().toLocaleDateString()})

Active Projects: 12

High Priority:
1. Downtown Office Complex (65% complete)
   - Status: On track
   - Next milestone: Steel frame design completion
   - Due: April 15, 2026

2. Highway Bridge Restoration (42% complete)
   - Status: At risk - Soil testing deadline approaching
   - Action needed: Schedule GeoCon Labs by April 5
   - Due: June 30, 2026

3. Residential Tower Foundation (15% complete)
   - Status: Planning phase
   - Next milestone: Foundation design approval
   - Due: July 20, 2026

Key Metrics:
- Tasks completed this week: 12
- Revenue secured (YTD): $2.4M
- Team utilization: 87%`,

  'risk': `AI Risk Analysis - Critical Items Detected

High Priority Risks:

1. Soil Testing Deadline - Highway Bridge Project
   - Risk: Project delay of 2-3 weeks if missed
   - Deadline: April 5, 2026 (6 days away)
   - Action: Schedule with GeoCon Labs immediately
   - Impact: $45K potential cost overrun

2. Uninvoiced Milestone - Downtown Office Complex
   - Risk: Revenue leakage of $95,000
   - Milestone: Steel Frame Design Phase 2 (completed 5 days ago)
   - Action: Generate and send invoice

3. Dependency Bottleneck - Foundation Design
   - Risk: 3 tasks blocked waiting for approval
   - Action: Expedite client review meeting
   - Potential delay: 1 week

Recommendations:
- Address soil testing immediately
- Generate pending invoice today
- Schedule client meeting within 48 hours`,

  'overdue': `Overdue Tasks & Actions Required

Critical Overdue Items:

1. Submit permit application
   - Project: Highway Bridge Restoration
   - Assignee: Mike Rodriguez
   - Due: March 28, 2026 (1 day overdue)
   - Action: Follow up with Mike today

2. Load calculation verification
   - Project: Downtown Office Complex
   - Assignee: Sarah Chen
   - Due: March 27, 2026 (2 days overdue)
   - Action: Escalate to team lead

Upcoming Deadlines (Next 7 Days):
- Foundation design review - April 2
- CAD drawings update - April 3
- Structural analysis - April 5`,

  'revenue': `Revenue & Commercial Intelligence

Financial Summary:

Revenue (YTD 2026):
- Total: $2.4M (+18% vs 2025)
- Paid: $383K
- Pending: $120K
- Overdue: $38K

AI-Detected Opportunities:

1. Uninvoiced Work: $95,000
   - Project: Downtown Office Complex
   - Action: Generate invoice immediately

2. Early Invoice Opportunity: $65,000
   - Project: Highway Bridge Restoration
   - Action: Consider early billing

3. Scope Change Revenue: $42,000
   - Project: Residential Tower
   - Action: Review with client

Recommendation: Focus on uninvoiced milestone to capture $95K revenue today.`,

  'default': `I can help you with:

- Project Status: Get summaries of all active projects and upcoming milestones
- Risk Analysis: Identify potential delays and critical path items
- Task Management: View overdue tasks and team workload
- Revenue Intelligence: Track uninvoiced work and payment status

Try asking me:
- "What's the status of my projects?"
- "Show me critical risks"
- "Which tasks are overdue?"
- "Any revenue opportunities?"`,
}

function getAIResponse(userMessage: string): string {
  const lowerMessage = userMessage.toLowerCase()
  if (lowerMessage.includes('project') || lowerMessage.includes('status') || lowerMessage.includes('summary')) {
    return aiResponses['project status']
  } else if (lowerMessage.includes('risk') || lowerMessage.includes('alert') || lowerMessage.includes('critical')) {
    return aiResponses['risk']
  } else if (lowerMessage.includes('overdue') || lowerMessage.includes('task') || lowerMessage.includes('deadline')) {
    return aiResponses['overdue']
  } else if (lowerMessage.includes('revenue') || lowerMessage.includes('invoice') || lowerMessage.includes('financial')) {
    return aiResponses['revenue']
  } else {
    return aiResponses['default']
  }
}

function AIChatbot() {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async (text?: string) => {
    const messageText = text || input
    if (!messageText.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsTyping(true)

    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: getAIResponse(messageText),
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, aiResponse])
      setIsTyping(false)
    }, 1000)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)]">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
            <Bot className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">AI Project Assistant</h1>
            <p className="text-gray-600 dark:text-gray-400">Conversational intelligence for project insights</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-4 flex flex-wrap gap-2">
        {quickActions.map((action) => (
          <button
            key={action.label}
            onClick={() => handleSend(action.label)}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm text-gray-700 dark:text-gray-300"
          >
            <action.icon size={16} className="text-blue-600" />
            {action.label}
          </button>
        ))}
      </div>

      {/* Chat Messages */}
      <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Bot className="text-white" size={16} />
                </div>
              )}

              <div className={`max-w-[80%] rounded-lg px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
              }`}>
                <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                <div className={`text-xs mt-2 ${message.role === 'user' ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              {message.role === 'user' && (
                <div className="w-8 h-8 bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                  <User className="text-white" size={16} />
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Bot className="text-white" size={16} />
              </div>
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          <form onSubmit={(e) => { e.preventDefault(); handleSend() }} className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything about your projects..."
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white placeholder:text-gray-400"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <Send size={20} />
              Send
            </button>
          </form>
          <p className="text-xs text-gray-500 mt-2">
            💡 Tip: Ask about project status, risks, overdue tasks, or revenue opportunities
          </p>
        </div>
      </div>

      {/* Capabilities */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/10 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mb-3">
            <TrendingUp className="text-white" size={20} />
          </div>
          <h3 className="font-medium text-gray-900 dark:text-white mb-1">Project Intelligence</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Real-time status and progress insights</p>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-900/10 rounded-lg p-4 border border-red-200 dark:border-red-800">
          <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center mb-3">
            <AlertTriangle className="text-white" size={20} />
          </div>
          <h3 className="font-medium text-gray-900 dark:text-white mb-1">Risk Detection</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Proactive identification of issues</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/10 rounded-lg p-4 border border-green-200 dark:border-green-800">
          <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center mb-3">
            <CheckCircle className="text-white" size={20} />
          </div>
          <h3 className="font-medium text-gray-900 dark:text-white mb-1">Task Management</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Automated tracking and alerts</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-900/10 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
          <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center mb-3">
            <Sparkles className="text-white" size={20} />
          </div>
          <h3 className="font-medium text-gray-900 dark:text-white mb-1">Revenue AI</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Commercial intelligence & insights</p>
        </div>
      </div>
    </div>
  )
}