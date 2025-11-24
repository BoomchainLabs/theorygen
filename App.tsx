
import React, { useState, useCallback, useEffect } from 'react';
import { analyzeMusicRequest, MusicTheoryResponse } from './lib/gemini';
import Piano from './components/Piano';
import { Loader2, Music, Search, AlertCircle, Sparkles, Bookmark, Trash2, History } from 'lucide-react';

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
  "Blues Scale in A",
  "G Mixolydian",
  "F Lydian",
  "E Phrygian",
  "Db Major 7",
  "B Minor 11"
];

interface Preset {
  id: string;
  name: string;
  data: MusicTheoryResponse;
  timestamp: number;
}

function App() {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<MusicTheoryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [presets, setPresets] = useState<Preset[]>([]);

  // Load presets from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('theorygen_presets');
    if (saved) {
      try {
        setPresets(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse presets", e);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    await handleRequest(prompt);
  };

  const handleRequest = async (requestText: string) => {
    setPrompt(requestText);
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await analyzeMusicRequest(requestText);
      setData(result);
    } catch (err) {
      console.error(err);
      setError("Failed to analyze music theory request. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePreset = () => {
    if (!data) return;
    
    const newPreset: Preset = {
      id: Date.now().toString(),
      name: `${data.root} ${data.type}`,
      data: data,
      timestamp: Date.now()
    };

    const updatedPresets = [newPreset, ...presets];
    setPresets(updatedPresets);
    localStorage.setItem('theorygen_presets', JSON.stringify(updatedPresets));
  };

  const handleDeletePreset = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updatedPresets = presets.filter(p => p.id !== id);
    setPresets(updatedPresets);
    localStorage.setItem('theorygen_presets', JSON.stringify(updatedPresets));
  };

  const handleLoadPreset = (preset: Preset) => {
    setData(preset.data);
    setPrompt(preset.name);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950 text-slate-200 flex flex-col items-center font-sans selection:bg-purple-500/30">
      
      {/* Header */}
      <header className="w-full max-w-4xl mx-auto p-6 flex items-center justify-between border-b border-slate-800/50">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setData(null); setPrompt(''); }}>
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
        
        {/* Hero Section (Only show when no data is active) */}
        {!data && (
          <section className="text-center space-y-6 mt-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white">
              Visualize <span className="text-purple-400">Music Theory</span> <br/> in Real-Time
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed">
              Ask for any scale, chord, or mode. Our AI will break it down and visualize it on the piano for you instantly.
            </p>
          </section>
        )}

        {/* Search Bar */}
        <div className="max-w-xl mx-auto w-full relative group z-10">
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

        {/* Suggestions (Only show when no data is active) */}
        {!data && !isLoading && (
          <div className="animate-in fade-in slide-in-from-bottom-4 delay-100 duration-500">
            <p className="text-center text-slate-500 text-sm mb-3 font-medium">TRY THESE</p>
            <div className="flex flex-wrap justify-center gap-2">
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
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 flex items-center gap-3 justify-center animate-in fade-in slide-in-from-bottom-4">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}

        {/* Results Section */}
        {data && (
          <section className="animate-in fade-in slide-in-from-bottom-8 duration-700 space-y-8 mb-10">
            
            {/* Piano Viz */}
            <div className="flex justify-center overflow-x-auto pb-4">
              <Piano activeNotes={data.notes} rootNote={data.root} />
            </div>

            {/* Info Cards */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Main Info */}
              <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-2xl p-6 space-y-4 hover:border-slate-700 transition-colors relative group">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-3xl font-bold text-white">{data.root}</h3>
                    <p className="text-purple-400 font-medium text-lg">{data.type}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="px-3 py-1 bg-slate-800 rounded-full text-xs font-bold tracking-wider uppercase text-slate-400">
                      {data.category}
                    </span>
                    <button 
                      onClick={handleSavePreset}
                      className="p-2 bg-slate-800/50 hover:bg-purple-600/20 text-slate-400 hover:text-purple-400 rounded-lg transition-colors flex items-center gap-2 text-sm"
                      title="Save as Preset"
                    >
                      <Bookmark className="w-4 h-4" />
                      <span className="hidden sm:inline">Save</span>
                    </button>
                  </div>
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

        {/* Saved Presets */}
        {presets.length > 0 && (
          <section className="animate-in fade-in slide-in-from-bottom-8 duration-700 border-t border-slate-800/50 pt-8">
            <div className="flex items-center gap-2 mb-6">
              <History className="w-5 h-5 text-purple-400" />
              <h3 className="text-xl font-bold text-white">Your Library</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {presets.map((preset) => (
                <div 
                  key={preset.id}
                  onClick={() => handleLoadPreset(preset)}
                  className="group bg-slate-900/50 border border-slate-800 hover:border-purple-500/30 rounded-xl p-4 cursor-pointer transition-all hover:bg-slate-800/50 relative"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-slate-200 group-hover:text-white truncate pr-6">{preset.name}</h4>
                    <button 
                      onClick={(e) => handleDeletePreset(e, preset.id)}
                      className="text-slate-600 hover:text-red-400 transition-colors p-1 rounded opacity-0 group-hover:opacity-100 absolute top-3 right-3"
                      title="Delete Preset"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {preset.data.notes.slice(0, 5).map((note, i) => (
                      <span key={i} className="text-xs bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">
                        {note}
                      </span>
                    ))}
                    {preset.data.notes.length > 5 && (
                      <span className="text-xs text-slate-600 px-1 py-0.5">+ {preset.data.notes.length - 5}</span>
                    )}
                  </div>
                  <div className="flex justify-between items-center text-xs text-slate-500">
                    <span className="uppercase tracking-wider">{preset.data.category}</span>
                    <span>{new Date(preset.timestamp).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

      </main>
    </div>
  );
}

export default App;
