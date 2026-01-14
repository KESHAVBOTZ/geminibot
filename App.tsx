
import React, { useState, useEffect, useRef } from 'react';
import { editImageWithGemini } from './services/geminiService';
import { ImageDropzone } from './components/ImageDropzone';
import { HistoryItem } from './types';
import { TelegramBotManager } from './services/telegramService';

interface LogEntry {
  id: string;
  msg: string;
  type: 'info' | 'error' | 'success';
  time: string;
}

const App: React.FC = () => {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Telegram States
  const [botToken, setBotToken] = useState(localStorage.getItem('tg_bot_token') || '');
  const [isBotActive, setIsBotActive] = useState(false);
  const [botLogs, setBotLogs] = useState<LogEntry[]>([]);
  const botManagerRef = useRef<TelegramBotManager | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('tg_bot_token', botToken);
  }, [botToken]);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [botLogs]);

  const addLog = (msg: string, type: 'info' | 'error' | 'success') => {
    setBotLogs(prev => [...prev, {
      id: Math.random().toString(),
      msg,
      type,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    }].slice(-50));
  };

  const handleEditImage = async () => {
    if (!originalImage || !prompt.trim()) {
      setError("Please provide an image and instructions.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await editImageWithGemini(originalImage, prompt);
      if (result.imageUrl) {
        setEditedImage(result.imageUrl);
        const newHistoryItem: HistoryItem = {
          id: Date.now().toString(),
          originalImage,
          editedImage: result.imageUrl,
          prompt,
          timestamp: Date.now(),
        };
        setHistory(prev => [newHistoryItem, ...prev].slice(0, 10));
      } else {
        setError(result.text || "No image was returned. Try a different prompt.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleBot = () => {
    if (isBotActive) {
      botManagerRef.current?.stop();
      setIsBotActive(false);
    } else {
      if (!botToken) {
        alert("Please enter a Telegram Bot Token first!");
        return;
      }
      botManagerRef.current = new TelegramBotManager(botToken, addLog);
      botManagerRef.current.start();
      setIsBotActive(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
              Gemini Bot Studio
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${isBotActive ? 'bg-emerald-100 text-emerald-700 animate-pulse' : 'bg-slate-100 text-slate-500'}`}>
              <div className={`w-2 h-2 rounded-full ${isBotActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
              {isBotActive ? 'BOT LIVE' : 'BOT OFFLINE'}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Workspace */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Source Image</label>
                <ImageDropzone onImageSelected={setOriginalImage} currentImage={originalImage} />
              </div>
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">AI Result</label>
                <div className={`relative h-64 border-2 border-dashed rounded-2xl overflow-hidden flex items-center justify-center transition-colors ${editedImage ? 'border-emerald-500 bg-white' : 'border-slate-200 bg-slate-50'}`}>
                  {editedImage ? <img src={editedImage} alt="Edited" className="w-full h-full object-contain" /> : <div className="text-center px-6 text-slate-400 text-sm">Your creation will appear here</div>}
                  {isLoading && <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-300">
                    <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                    <p className="text-indigo-600 font-semibold text-sm">Gemini is thinking...</p>
                  </div>}
                </div>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-slate-100 space-y-4">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your transformation..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-700 focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none h-24"
              />
              {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}
              <div className="flex gap-3">
                <button
                  onClick={handleEditImage}
                  disabled={isLoading || !originalImage || !prompt.trim()}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold py-4 rounded-xl shadow-lg transition-all"
                >
                  {isLoading ? 'Processing...' : 'Generate Transformation'}
                </button>
              </div>
            </div>
          </div>

          {/* Bot Console */}
          <div className="bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-800 text-slate-300 font-mono text-sm h-64 flex flex-col">
            <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-2">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Live Bot Console</span>
              <span className="text-[10px] text-slate-600">v1.0.0</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
              {botLogs.length === 0 ? (
                <div className="text-slate-600 italic">Waiting for activity...</div>
              ) : (
                botLogs.map(log => (
                  <div key={log.id} className="flex gap-2">
                    <span className="text-slate-600">[{log.time}]</span>
                    <span className={log.type === 'error' ? 'text-red-400' : log.type === 'success' ? 'text-emerald-400' : 'text-indigo-400'}>
                      {log.type === 'error' ? '✖' : log.type === 'success' ? '✔' : 'ℹ'}
                    </span>
                    <span className="break-all">{log.msg}</span>
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-6">
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.11.02-1.93 1.23-5.46 3.62-.51.35-.98.52-1.4.51-.46-.01-1.35-.26-2.01-.48-.81-.27-1.45-.41-1.39-.87.03-.24.37-.48 1.02-.73 4-1.74 6.67-2.88 8.01-3.43 3.81-1.56 4.6-1.83 5.12-1.84.11 0 .37.03.53.17.14.12.18.28.2.44-.01.06.01.22 0 .28z"/></svg>
                Telegram Configuration
              </h2>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Bot API Token</label>
                <input
                  type="password"
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                  placeholder="Enter token from @BotFather"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <button
                onClick={toggleBot}
                className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${isBotActive ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-blue-600 text-white shadow-lg shadow-blue-200'}`}
              >
                {isBotActive ? 'Stop Telegram Bot' : 'Start Telegram Bot'}
              </button>
              <p className="text-[10px] text-slate-400 leading-tight">
                Once started, this tab must stay open for the bot to process messages. Uses long polling.
              </p>
            </div>
            
            <div className="pt-6 border-t border-slate-100">
              <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Recent Generations
              </h2>
              <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                {history.map((item) => (
                  <div key={item.id} className="bg-slate-50 p-2 rounded-xl border border-slate-100 flex gap-3">
                    <img src={item.editedImage} className="w-12 h-12 rounded object-cover border" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">{new Date(item.timestamp).toLocaleTimeString()}</p>
                      <p className="text-xs text-slate-600 line-clamp-1 italic">"{item.prompt}"</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
      <footer className="mt-auto py-8 text-center text-slate-400 text-xs font-medium">
        Powered by Gemini 2.5 Flash & Telegram Bot API
      </footer>
    </div>
  );
};

export default App;
