import React, { useState, useRef, useEffect } from 'react';
import { generateChatResponseLite, generateChatResponseDetailed } from '../services/geminiService';
import { ChatMessage } from '../types';
import { MessageSquare, X, Send, Sparkles, Zap, Minimize2, Maximize2 } from 'lucide-react';

interface Props {
  contextData: any;
  view: string;
}

export const ChatAssistant: React.FC<Props> = ({ contextData, view }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'ai',
      content: `Hello! I'm your AI assistant. I have access to the ${view} data currently on your screen. Ask me anything!`,
      timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  // Reset welcome message when view changes
  useEffect(() => {
    setMessages(prev => [
      ...prev,
      {
        id: `context-switch-${Date.now()}`,
        role: 'ai',
        content: `I see you switched to the ${view} view. I'm updated with the latest data here.`,
        timestamp: Date.now()
      }
    ]);
  }, [view]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Context preparation
    const contextString = contextData ? JSON.stringify(contextData).slice(0, 10000) : "No specific data loaded.";
    const query = input;

    // 1. FAST RESPONSE (Lite Model)
    try {
      const liteResponse = await generateChatResponseLite(query, contextString);
      
      const aiMsgId = (Date.now() + 1).toString();
      const liteMsg: ChatMessage = {
        id: aiMsgId,
        role: 'ai',
        content: liteResponse,
        isLite: true,
        timestamp: Date.now()
      };
      
      setMessages(prev => [...prev, liteMsg]);
      
      // 2. DETAILED RESPONSE (Flash Model with Search)
      // Call in background, then update the message
      generateChatResponseDetailed(query, contextString).then(detailedResponse => {
        setMessages(prev => prev.map(msg => 
          msg.id === aiMsgId 
            ? { ...msg, content: detailedResponse, isLite: false } 
            : msg
        ));
      });

    } catch (error) {
      console.error("Chat Error", error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'ai',
        content: "Sorry, I'm having trouble connecting right now.",
        timestamp: Date.now()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-indigo-600 hover:bg-indigo-500 text-white p-4 rounded-full shadow-2xl transition-all hover:scale-105 z-50 group flex items-center gap-2"
      >
        <MessageSquare size={24} />
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 font-bold whitespace-nowrap">Ask AI</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col z-50 animate-fade-in-up overflow-hidden">
      {/* Header */}
      <div className="bg-slate-800 p-4 border-b border-slate-700 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-500/20 p-1.5 rounded-lg">
             <Sparkles size={16} className="text-indigo-400" />
          </div>
          <div>
            <h3 className="text-white font-bold text-sm">Research Assistant</h3>
            <div className="flex items-center gap-1">
               <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
               <span className="text-[10px] text-slate-400 uppercase">Online &bull; {view} Context</span>
            </div>
          </div>
        </div>
        <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white transition-colors">
          <X size={20} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900/50">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div 
              className={`max-w-[85%] rounded-2xl p-3 text-sm leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-tr-none' 
                  : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'
              }`}
            >
              {msg.isLite && (
                <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-300 mb-1 opacity-70">
                   <Zap size={10} /> Fast Response
                </div>
              )}
              <div className="whitespace-pre-wrap">{msg.content}</div>
              {msg.isLite && (
                 <div className="mt-2 text-[10px] text-slate-500 flex items-center gap-1 animate-pulse">
                    <Sparkles size={10} /> Fetching detailed analysis...
                 </div>
              )}
            </div>
          </div>
        ))}
        {isTyping && (
           <div className="flex justify-start">
              <div className="bg-slate-800 rounded-2xl rounded-tl-none p-3 border border-slate-700">
                 <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce delay-75"></span>
                    <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce delay-150"></span>
                 </div>
              </div>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 bg-slate-800 border-t border-slate-700 flex gap-2">
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about data or market trends..."
          className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
        />
        <button 
          type="submit" 
          disabled={!input.trim() || isTyping}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2 rounded-xl transition-colors flex items-center justify-center"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
};
