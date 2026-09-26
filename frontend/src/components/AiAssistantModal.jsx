import React, { useState } from 'react'
import api from '../api'

export default function AiAssistantModal({ watershedId, isOpen, onClose }) {
  const [prompt, setPrompt] = useState('')
  const [response, setResponse] = useState(null)
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleQuery = (e) => {
    e.preventDefault()
    if (!prompt) return
    setLoading(true)
    api.aiQuery({ watershed_id: watershedId, prompt: prompt })
      .then((res) => {
        setResponse(res)
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        setLoading(false)
      })
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex justify-end">
      <div className="bg-white w-full max-w-lg h-full shadow-2xl flex flex-col justify-between border-l border-slate-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src="/dharascan_logo.png" alt="DharaScan" className="h-9 w-auto object-contain" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase bg-[#0f3a61] text-white px-2 py-0.5 rounded">AI Explanation Layer</span>
                <span className="text-xs text-slate-500 font-mono">Evidence-Bounded</span>
              </div>
              <h2 className="text-base font-bold text-slate-900 mt-0.5">Ask DharaScan AI</h2>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1">×</button>
        </div>

        {/* Conversation Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 font-sans text-sm">
          {!response && !loading && (
            <div className="text-center py-12 text-slate-500 space-y-3">
              <p className="font-semibold text-slate-700">Ask any question about measured evidence in this watershed.</p>
              <div className="text-xs space-y-1 text-slate-500 font-mono">
                <p className="cursor-pointer hover:underline" onClick={() => setPrompt('Which interventions require field inspection?')}>• "Which interventions require field inspection?"</p>
                <p className="cursor-pointer hover:underline" onClick={() => setPrompt('Why is the evidence confidence low?')}>• "Why is the evidence confidence low?"</p>
                <p className="cursor-pointer hover:underline" onClick={() => setPrompt('What changed in this watershed?')}>• "What changed in this watershed?"</p>
              </div>
            </div>
          )}

          {loading && <div className="text-center py-8 text-slate-600 font-medium">Evaluating computed geospatial evidence...</div>}

          {response && !loading && (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
                <div className="text-xs font-bold text-slate-500 uppercase">Answer:</div>
                <p className="text-slate-900 font-medium leading-relaxed">{response.answer}</p>
              </div>

              <div className="space-y-1">
                <div className="text-xs font-bold text-slate-500 uppercase">Supporting Sources:</div>
                <div className="flex flex-wrap gap-1">
                  {response.supporting_sources.map((src, i) => (
                    <span key={i} className="text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded">
                      {src}
                    </span>
                  ))}
                </div>
              </div>

              <div className="text-[11px] text-slate-400 italic border-t border-slate-100 pt-2">
                {response.disclaimer}
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleQuery} className="p-4 border-t border-slate-200 bg-slate-50 flex gap-2">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Type your question..."
            className="flex-1 bg-white border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-[#0f3a61]"
          />
          <button type="submit" className="bg-[#0f3a61] hover:bg-[#0c2f50] text-white px-4 py-2 rounded-md font-medium text-sm">
            Ask
          </button>
        </form>
      </div>
    </div>
  )
}
