import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import {
  X,
  Send,
  Sparkles,
  Bot,
  User,
  Zap,
  HeartPulse,
  RotateCcw,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  modelUsed?: string;
  timestamp: string;
}

export const AiSommelierChat: React.FC = () => {
  const { isAiSommelierOpen, setIsAiSommelierOpen } = useStore();

  const [role, setRole] = useState<'nutritionist' | 'dietary_analyst' | 'quick_assistant'>('nutritionist');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      role: 'assistant',
      content: `Assalam-o-Alaikum. I am Hakim Daniyal, Chief Nutritionist & Sourcing Sommelier at Eirvan Foods® (Natural Goodness • Better Tomorrow).\n\nHow may I guide your nutrition today? I can advise on Kashmiri Mamra almond oil concentrations, memory-boosting blends for students, diabetic-friendly combinations, or authentic stone-ground superfood formulations.`,
      modelUsed: 'gemini-2.5-flash',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isAiSommelierOpen) {
      scrollToBottom();
    }
  }, [messages, isAiSommelierOpen]);

  if (!isAiSommelierOpen) return null;

  const quickPrompts = [
    'Which dry fruits are safe for my diabetic parent?',
    'What dry fruit powder blend is best for toddler growth?',
    'Why is Kashmiri Mamra almond superior to California almond?',
    'What are shipping rates and delivery times across Pakistan?',
  ];

  const handleSend = async (messageText?: string) => {
    const textToSend = (messageText || input).trim();
    if (!textToSend || loading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newHistory.map((m) => ({ role: m.role, content: m.content })),
          role,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to get answer from advisor.');
      }

      const assistantMsg: ChatMessage = {
        id: `reply-${Date.now()}`,
        role: 'assistant',
        content: data.reply,
        modelUsed: data.modelUsed,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error(err);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `I apologize, I encountered a brief connection error: ${err.message}. Please try asking again.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = (newRole: 'nutritionist' | 'dietary_analyst' | 'quick_assistant') => {
    setRole(newRole);
    let intro = '';
    let modelTag = '';

    if (newRole === 'nutritionist') {
      intro = `Switched to **Hakim Daniyal** (General Nutrition & Mountain Sourcing). Powered by **gemini-2.5-flash**. Ask about traditional uses, morning vitality, or Kashmiri Mamra almond oil content.`;
      modelTag = 'gemini-2.5-flash';
    } else if (newRole === 'dietary_analyst') {
      intro = `Switched to **Dr. Ayesha** (Clinical & Dietary Specialist). Powered by **gemini-2.5-pro** for complex nutritional analysis. Ask about glycemic index, fatty acid ratios, or gestational wellness.`;
      modelTag = 'gemini-2.5-pro';
    } else {
      intro = `Switched to **Eirvan Concierge** (Fast Shopping Assistant). Powered by **gemini-2.5-flash-lite** for instant answers on Pakistani shipping rates, courier tracking, and gift boxes.`;
      modelTag = 'gemini-2.5-flash-lite';
    }

    setMessages((prev) => [
      ...prev,
      {
        id: `sys-${Date.now()}`,
        role: 'assistant',
        content: intro,
        modelUsed: modelTag,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const resetChat = () => {
    setMessages([
      {
        id: 'init-1',
        role: 'assistant',
        content: `Assalam-o-Alaikum. Conversation history has been reset. How may I assist your healthy lifestyle today?`,
        modelUsed: 'gemini-2.5-flash',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#072B47]/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 md:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white border border-[#0A3D62]/20 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[85vh] max-h-[720px]">
        {/* Header */}
        <div className="px-5 py-4 bg-[#0A3D62] text-[#FBF9F4] flex items-center justify-between border-b border-[#072B47]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white p-1 flex items-center justify-center shadow-xs shrink-0">
              <img
                src="/assets/aistudio/Eirvan_Foods_Natural_Goodness_Logo_8d5cce5b.png"
                alt="Eirvan Foods"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-serif text-base tracking-wide text-white">
                  Eirvan Nutrition Advisor
                </h3>
                <span className="text-[10px] font-sans font-bold uppercase tracking-wider bg-[#4E9B36] text-white px-2 py-0.5 rounded-full">
                  Gemini AI
                </span>
              </div>
              <p className="text-[11px] text-[#EEF5FA]/80 font-sans font-light">
                Mountain harvests wisdom, clinical nutrition &amp; dietary guidance
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={resetChat}
              className="p-1.5 hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer rounded-lg"
              title="Reset Conversation"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsAiSommelierOpen(false)}
              className="p-1.5 hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer rounded-lg"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Specialized Role Switcher Bar */}
        <div className="bg-[#072B47] px-4 py-2.5 border-b border-white/10 flex items-center justify-between text-xs overflow-x-auto">
          <span className="text-[#EEF5FA]/70 text-[11px] font-mono uppercase tracking-wider hidden sm:inline mr-2 shrink-0">
            Specialist:
          </span>
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => handleRoleChange('nutritionist')}
              className={`px-3 py-1 text-[11px] rounded-lg tracking-wider transition-all flex items-center space-x-1.5 cursor-pointer ${
                role === 'nutritionist'
                  ? 'bg-[#4E9B36] text-white font-bold shadow-xs'
                  : 'bg-white/10 text-[#EEF5FA] hover:bg-white/20'
              }`}
            >
              <Sparkles className="w-3 h-3 text-[#C6842D]" />
              <span>Hakim Daniyal (Flash)</span>
            </button>

            <button
              onClick={() => handleRoleChange('dietary_analyst')}
              className={`px-3 py-1 text-[11px] rounded-lg tracking-wider transition-all flex items-center space-x-1.5 cursor-pointer ${
                role === 'dietary_analyst'
                  ? 'bg-[#4E9B36] text-white font-bold shadow-xs'
                  : 'bg-white/10 text-[#EEF5FA] hover:bg-white/20'
              }`}
            >
              <HeartPulse className="w-3 h-3 text-[#C6842D]" />
              <span>Dr. Ayesha (Pro)</span>
            </button>

            <button
              onClick={() => handleRoleChange('quick_assistant')}
              className={`px-3 py-1 text-[11px] rounded-lg tracking-wider transition-all flex items-center space-x-1.5 cursor-pointer ${
                role === 'quick_assistant'
                  ? 'bg-[#4E9B36] text-white font-bold shadow-xs'
                  : 'bg-white/10 text-[#EEF5FA] hover:bg-white/20'
              }`}
            >
              <Zap className="w-3 h-3 text-[#C6842D]" />
              <span>Concierge (Lite)</span>
            </button>
          </div>
        </div>

        {/* Scrollable Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-[#FBF9F4]">
          {messages.map((m) => {
            const isUser = m.role === 'user';
            return (
              <div
                key={m.id}
                className={`flex items-start space-x-2.5 ${
                  isUser ? 'flex-row-reverse space-x-reverse' : ''
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-mono shadow-2xs ${
                    isUser
                      ? 'bg-[#0A3D62] text-white'
                      : 'bg-[#4E9B36] text-white'
                  }`}
                >
                  {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                </div>

                <div
                  className={`max-w-[82%] sm:max-w-[75%] p-4 text-xs sm:text-sm leading-relaxed rounded-2xl ${
                    isUser
                      ? 'bg-[#0A3D62] text-[#FBF9F4] rounded-tr-xs'
                      : 'bg-white text-[#15222E] border border-[#0A3D62]/10 shadow-xs rounded-tl-xs'
                  }`}
                >
                  <div className="whitespace-pre-line font-normal">{m.content}</div>

                  <div
                    className={`mt-2 flex items-center justify-between text-[10px] font-mono ${
                      isUser ? 'text-white/60' : 'text-[#15222E]/50'
                    }`}
                  >
                    <span>{m.timestamp}</span>
                    {m.modelUsed && (
                      <span className="bg-black/5 px-1.5 py-0.5 rounded border border-black/10">
                        {m.modelUsed}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-full bg-[#4E9B36] text-white flex items-center justify-center">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <div className="bg-white border border-[#0A3D62]/15 rounded-2xl p-3 flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-[#0A3D62] animate-bounce" />
                <div className="w-2 h-2 rounded-full bg-[#4E9B36] animate-bounce delay-150" />
                <div className="w-2 h-2 rounded-full bg-[#C6842D] animate-bounce delay-300" />
                <span className="text-xs text-[#15222E]/60 font-sans ml-1">Analyzing botanical nutrients...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Quick Prompt Chips */}
        <div className="px-4 py-2 bg-white border-t border-[#0A3D62]/10 flex items-center space-x-2 overflow-x-auto">
          {quickPrompts.map((qp, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(qp)}
              className="text-[11px] rounded-full px-3 py-1 bg-[#EEF5FA] hover:bg-[#0A3D62]/10 text-[#0A3D62] whitespace-nowrap shrink-0 border border-[#0A3D62]/15 transition-colors cursor-pointer font-medium"
            >
              {qp}
            </button>
          ))}
        </div>

        {/* Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="p-3 bg-white border-t border-[#0A3D62]/10 flex items-center space-x-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask ${
              role === 'dietary_analyst'
                ? 'Dr. Ayesha (Clinical analysis)'
                : role === 'quick_assistant'
                ? 'Eirvan Concierge (Shipping & Orders)'
                : 'Hakim Daniyal (Nutrition & Harvest)'
            }...`}
            className="flex-1 bg-[#FBF9F4] border border-[#0A3D62]/15 rounded-xl text-xs sm:text-sm px-4 py-2.5 text-[#15222E] focus:outline-hidden focus:border-[#0A3D62]"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="p-2.5 bg-[#0A3D62] hover:bg-[#072B47] text-white rounded-xl disabled:opacity-40 transition-colors cursor-pointer shadow-xs"
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
