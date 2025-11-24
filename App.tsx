import React, { useState, useCallback } from 'react';
import { analyzeMusicRequest, MusicTheoryResponse } from './lib/gemini';
import Piano from './components/Piano';
import { Loader2, Music, Search, AlertCircle, Sparkles } from 'lucide-react';

const SUGGESTIONS = [
  "C Major Scale",
  "D Dorian Mode",
  "F# Dominant 7th Chord",
  "A Harmonic Minor",
  "Gb Major Pentatonic",
  "B Locrian Mode",
  "Eb Minor 9",
  "C# Diminished 7",
  "Whole Tone Scale",
  "Blues Scale in A"
];

function App() {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [data,QXData] = useState<MusicTheoryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    await handleRequest(prompt);
  };

  const handleRequest = async (requestText: string) => {
    setPrompt(requestText);
    setIsLoading(true);
    setError(null);
    // Keep previous data visible while loading new? No, clear it to avoid confusion.
    // Actually, keeping it is better UX, but let's clear for clarity of "new state".
    
    try {
      const result = await analyzeMusicRequest(requestText);
      QXData(result);
    } catch (err) {
      console.error(err);
      setError("Failed to analyze music theory request. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950 text-slate-200 flex flex-col items-center font-sans selection:bg-purple-500/30">
      
      {/* Header */}
      <header className="w-full max-w-4xl mx-auto p-6 flex items-center justify-between border-b border-slate-800/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-600 rounded-lg shadow-lg shadow-purple-900/20">
            <Music className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            TheoryGen
          </h1>
        </div>
        <a href="https://ai.google.dev" target="_blank" rel="noreferrer" className="text-xs font-medium text-slate-500 hover:text-purple-400 transition-colors">
          Powered by Gemini
        </a>
      </header>

      <main className="flex-1 w-full max-w-4xl mx-auto p-6 flex flex-col gap-10">
        
        {/* Hero Section */}
        <section className="text-center space-y-6 mt-10">
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white">
            Visualize <span className="text-purple-400">Music Theory</span> <br/> in Real-Time
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed">
            Ask for any scale, chord, or mode. Our AI will break it down and visualize it on the piano for you instantly.
          </p>

          {/* Search Bar */}
          <div className="max-w-xl mx-auto relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <form onSubmit={handleSubmit} className="relative flex items-center">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., Bb Minor Scale, Cmaj9 Chord..."
                className="w-full bg-slate-900/90 backdrop-blur-xl border border-slate-700 text-white px-6 py-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 placeholder:text-slate-500 text-lg shadow-xl"
                disabled={isLoading}
              />
              <button 
                type="submit"
                disabled={isLoading || !prompt.trim()}
                className="absolute right-2 bg-slate-800 hover:bg-purple-600 text-white p-2.5 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:hover:bg-slate-800"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              </button>
            </form>
          </div>

          {/* Suggestions */}
          {!data && !isLoading && (
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleRequest(s)}
                  className="px-3 py-1.5 bg-slate-900/50 border border-slate-800 rounded-full text-sm text-slate-400 hover:border-purple-500/50 hover:text-purple-300 transition-all hover:scale-105"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Error State */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 flex items-center gap-3 justify-center animate-in fade-in slide-in-from-bottom-4">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}

        {/* Results Section */}
        {data && (
          <section className="animate-in fade-in slide-in-from-bottom-8 duration-700 space-y-8 mb-20">
            
            {/* Piano Viz */}
            <div className="flex justify-center overflow-x-auto pb-4">
              <Piano activeNotes={data.notes} rootNote={data.root} />
            </div>

            {/* Info Cards */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Main Info */}
              <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-2xl p-6 space-y-4 hover:border-slate-700 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-3xl font-bold text-white">{data.root}</h3>
                    <p className="text-purple-400 font-medium text-lg">{data.type}</p>
                  </div>
                  <span className="px-3 py-1 bg-slate-800 rounded-full text-xs font-bold tracking-wider uppercase text-slate-400">
                    {data.category}
                  </span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  {data.description}
                </p>
              </div>

              {/* Theory Details */}
              <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-2xl p-6 space-y-8 hover:border-slate-700 transition-colors flex flex-col justify-center">
                
                {/* Key Signature */}
                <div>
                  <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Key Signature</h4>
                  {data.keySignature && data.keySignature.type !== 'none' ? (
                    <div className="flex items-center gap-4 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                      <div className="flex -space-x-3">
                        {Array.from({ length: Math.min(data.keySignature.count, 7) }).map((_, i) => (
                          <div key={i} className="w-10 h-10 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center text-xl font-serif text-white shadow-md relative z-10" style={{zIndex: 10-i}}>
                            {data.keySignature!.type === 'sharp' ? '♯' : '♭'}
                          </div>
                        ))}
                      </div>
                      <div>
                        <div className="text-white font-medium text-lg">
                          {data.keySignature.count} {data.keySignature.type === 'sharp' ? 'Sharps' : 'Flats'}
                        </div>
                        <div className="text-slate-400 text-sm font-mono">
                          {data.keySignature.notes.join(' ')}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                      <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center text-xl font-serif text-slate-400 shadow-md">
                        ♮
                      </div>
                      <div className="text-slate-300 font-medium">
                        Natural Key (No Sharps/Flats)
                      </div>
                    </div>
                  )}
                </div>

                {/* Notes List */}
                <div>
                  <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Notes</h4>
                  <div className="flex flex-wrap gap-2">
                    {data.notes.map((note, idx) => (
                      <div key={idx} className="flex flex-col items-center gap-1">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg shadow-lg 
                          ${idx === 0 ? 'bg-purple-600 text-white shadow-purple-900/30' : 'bg-slate-800 text-slate-200 border border-slate-700'}`}>
                          {note}
                        </div>
                        {/* Show Interval below note if available */}
                        {data.intervals && data.intervals[idx] && (
                          <span className="text-[10px] text-slate-500 font-mono">{data.intervals[idx]}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;