
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ethers } from 'ethers';
import { Crown, ChevronLeft, ChevronRight, Activity, Zap, Music2 } from 'lucide-react';

interface PianoTokenProps {
  activeNotes?: string[]; // Optional external control
  rootNote?: string;      // Optional external control
}

// --- Configuration ---
const NOTE_TO_OFFSET: Record<string, number> = {
  'C': 0, 'B#': 0,
  'C#': 1, 'DB': 1,
  'D': 2,
  'D#': 3, 'EB': 3,
  'E': 4, 'FB': 4,
  'F': 5, 'E#': 5,
  'F#': 6, 'GB': 6,
  'G': 7,
  'G#': 8, 'AB': 8,
  'A': 9,
  'A#': 10, 'BB': 10,
  'B': 11, 'CB': 11
};

// Helper to map note names to key indices (0-11)
const noteToOffset = (note: string): number => {
  const n = note.toUpperCase().replace(/[0-9]/g, ''); 
  return NOTE_TO_OFFSET[n] ?? -1;
};

const START_OCTAVE = 3;
const DEFAULT_OCTAVES = 2;
const MAX_OCTAVES = 4; // Extended range for token holders

// Base Chain Config
const SLERF_TOKEN_ADDRESS = "0x233dF63325933fa3f2dac8E695Cd84bb2f91aB07"; // Example Address on Base
const BASE_CHAIN_ID = '0x2105'; // 8453 in hex

// ERC-20 Minimal ABI for checking balance
const MINIMAL_ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)"
];

const PianoToken: React.FC<PianoTokenProps> = ({ activeNotes = [], rootNote }) => {
  // --- State ---
  const [hasAccess, setHasAccess] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [playingNotes, setPlayingNotes] = useState<Set<number>>(new Set()); // Track currently playing MIDI notes
  const [octaveShift, setOctaveShift] = useState(0);
  
  // New Features State
  const [waveform, setWaveform] = useState<OscillatorType>('triangle');
  const [sustain, setSustain] = useState(false);

  // --- Refs ---
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorsRef = useRef<Map<number, OscillatorNode>>(new Map());
  const gainNodesRef = useRef<Map<number, GainNode>>(new Map());

  // --- Constants ---
  const octaves = hasAccess ? MAX_OCTAVES : DEFAULT_OCTAVES;
  const whiteKeyWidth = 40;
  const whiteKeyHeight = 160;
  const blackKeyWidth = 24;
  const blackKeyHeight = 100;
  const totalWidth = 7 * whiteKeyWidth * octaves;

  // --- Audio Logic ---
  const initAudio = useCallback(() => {
    if (!audioContextRef.current) {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        audioContextRef.current = new AudioContext();
      }
    }
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume();
    }
  }, []);

  const playNoteStart = useCallback((midiNote: number) => {
    initAudio();
    const ctx = audioContextRef.current;
    if (!ctx) return;

    // If already playing, stop it first to re-trigger cleanly or just ignore
    if (oscillatorsRef.current.has(midiNote)) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    // Frequency calculation: f = 440 * 2^((d - 69)/12)
    const freq = 440 * Math.pow(2, (midiNote - 69) / 12);
    osc.frequency.value = freq;
    osc.type = waveform;

    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.05); // Attack

    osc.start(now);

    // Store refs
    oscillatorsRef.current.set(midiNote, osc);
    gainNodesRef.current.set(midiNote, gain);
    
    setPlayingNotes(prev => new Set(prev).add(midiNote));
  }, [initAudio, waveform]);

  const playNoteStop = useCallback((midiNote: number) => {
    const ctx = audioContextRef.current;
    const osc = oscillatorsRef.current.get(midiNote);
    const gain = gainNodesRef.current.get(midiNote);

    const releaseTime = sustain ? 1.5 : 0.2;

    if (ctx && osc && gain) {
      const now = ctx.currentTime;
      // Release
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + releaseTime);
      osc.stop(now + releaseTime);

      // Cleanup after release
      setTimeout(() => {
        oscillatorsRef.current.delete(midiNote);
        gainNodesRef.current.delete(midiNote);
      }, releaseTime * 1000 + 50);
    }
    
    setPlayingNotes(prev => {
        const next = new Set(prev);
        next.delete(midiNote);
        return next;
    });
  }, [sustain]);


  // --- Web3 Logic ---
  const connectWallet = async () => {
    if (!(window as any).ethereum) {
      alert("Please install a crypto wallet like MetaMask!");
      return;
    }

    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      
      setUserAddress(address);
      setWalletConnected(true);
      checkTokenBalance(signer, address);

      // Switch to Base chain if needed
      try {
        await (window as any).ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: BASE_CHAIN_ID }],
        });
      } catch (switchError: any) {
        // This error code indicates that the chain has not been added to MetaMask.
        if (switchError.code === 4902) {
             alert("Please add the Base network to your wallet.");
        }
      }

    } catch (error) {
      console.error("Connection error:", error);
    }
  };

  const checkTokenBalance = async (signer: ethers.Signer, address: string) => {
    try {
      const contract = new ethers.Contract(SLERF_TOKEN_ADDRESS, MINIMAL_ERC20_ABI, signer);
      const balance = await contract.balanceOf(address);
      const formattedBalance = ethers.formatUnits(balance, 18); // Assuming 18 decimals
      
      if (parseFloat(formattedBalance) > 0) {
        setHasAccess(true);
      }
    } catch (err) {
      console.error("Failed to fetch token balance:", err);
      // Fallback for demo purposes if contract call fails (e.g., wrong network)
      // setHasAccess(true); 
    }
  };


  // --- Rendering Logic ---
  // Pre-calculate active set from props
  const activeIndices = useMemo(() => {
    const s = new Set<number>();
    activeNotes.forEach(n => {
        const offset = noteToOffset(n);
        if (offset !== -1) s.add(offset);
    });
    return s;
  }, [activeNotes]);

  const rootIndex = useMemo(() => rootNote ? noteToOffset(rootNote) : -1, [rootNote]);

  const keys = useMemo(() => {
    const generatedKeys = [];

    for (let oct = 0; oct < octaves; oct++) {
      const xOffset = oct * (whiteKeyWidth * 7);
      const currentOctaveNumber = START_OCTAVE + oct + octaveShift;

      // White Keys
      const whiteNotes = [0, 2, 4, 5, 7, 9, 11];
      whiteNotes.forEach((noteIndex, i) => {
        const midiNote = (currentOctaveNumber + 1) * 12 + noteIndex;
        
        const isExternalActive = activeIndices.has(noteIndex);
        const isRoot = rootIndex === noteIndex;
        const isPressed = playingNotes.has(midiNote);

        let fill = 'white';
        if (isPressed) {
            fill = '#22d3ee'; // Cyan-400 for press feedback
        } else if (isRoot) {
            fill = '#8b5cf6'; // Violet-500 (Requested)
        } else if (isExternalActive) {
            fill = '#60a5fa'; // Blue-400 (Requested)
        }

        generatedKeys.push(
          <rect
            key={`white-${midiNote}`}
            x={xOffset + i * whiteKeyWidth}
            y={0}
            width={whiteKeyWidth}
            height={whiteKeyHeight}
            fill={fill}
            stroke="#cbd5e1"
            strokeWidth="1"
            className="transition-colors duration-100 ease-out hover:opacity-90 cursor-pointer touch-none"
            rx={4}
            ry={4}
            onMouseDown={() => playNoteStart(midiNote)}
            onMouseUp={() => playNoteStop(midiNote)}
            onMouseLeave={() => playNoteStop(midiNote)}
            onTouchStart={(e) => { e.preventDefault(); playNoteStart(midiNote); }}
            onTouchEnd={(e) => { e.preventDefault(); playNoteStop(midiNote); }}
          />
        );

        if (noteIndex === 0) {
            generatedKeys.push(
                <text
                    key={`label-${midiNote}`}
                    x={xOffset + i * whiteKeyWidth + whiteKeyWidth/2}
                    y={whiteKeyHeight - 10}
                    fontSize="10"
                    textAnchor="middle"
                    fill="#94a3b8"
                    pointerEvents="none"
                    className="select-none"
                >
                    C{currentOctaveNumber}
                </text>
            );
        }
      });

      // Black Keys
      const blackNotes = [
        { idx: 1, pos: 1 }, { idx: 3, pos: 2 }, 
        { idx: 6, pos: 4 }, { idx: 8, pos: 5 }, { idx: 10, pos: 6 }
      ];

      blackNotes.forEach(({ idx, pos }) => {
        const midiNote = (currentOctaveNumber + 1) * 12 + idx;
        const xPos = xOffset + (pos * whiteKeyWidth) - (blackKeyWidth / 2);

        const isExternalActive = activeIndices.has(idx);
        const isRoot = rootIndex === idx;
        const isPressed = playingNotes.has(midiNote);

        let fill = '#1e293b'; // Default dark slate
        if (isPressed) {
            fill = '#22d3ee'; // Cyan-400 for press feedback
        } else if (isRoot) {
            fill = '#8b5cf6'; // Violet-500 (Requested)
        } else if (isExternalActive) {
            fill = '#60a5fa'; // Blue-400 (Requested)
        }

        generatedKeys.push(
          <rect
            key={`black-${midiNote}`}
            x={xPos}
            y={0}
            width={blackKeyWidth}
            height={blackKeyHeight}
            fill={fill}
            stroke="#0f172a"
            strokeWidth="1"
            className="transition-colors duration-100 ease-out z-10 hover:opacity-90 cursor-pointer touch-none"
            rx={2}
            ry={2}
            onMouseDown={() => playNoteStart(midiNote)}
            onMouseUp={() => playNoteStop(midiNote)}
            onMouseLeave={() => playNoteStop(midiNote)}
            onTouchStart={(e) => { e.preventDefault(); playNoteStart(midiNote); }}
            onTouchEnd={(e) => { e.preventDefault(); playNoteStop(midiNote); }}
          />
        );
      });
    }

    return generatedKeys;
  }, [octaves, octaveShift, activeIndices, rootIndex, playingNotes, playNoteStart, playNoteStop]);


  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {/* Token Gating & Controls Header */}
      <div className="w-full max-w-[90vw] lg:max-w-4xl flex flex-col gap-4 p-4 bg-slate-900/80 rounded-xl border border-slate-800 backdrop-blur-sm">
        
        {/* Row 1: Wallet & Status */}
        <div className="flex flex-wrap items-center justify-between gap-3 w-full border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${hasAccess ? 'bg-green-500 animate-pulse' : 'bg-slate-600'}`}></div>
                <span className="text-slate-400 text-sm font-medium">
                    {hasAccess ? 'Extended Range Unlocked' : 'Standard Range'}
                </span>
            </div>

            {!walletConnected ? (
                <button 
                    onClick={connectWallet}
                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2 px-4 rounded-lg transition-all shadow-lg shadow-blue-900/20 active:scale-95"
                >
                    Connect Wallet
                </button>
            ) : (
                <div className="flex items-center gap-3">
                    {hasAccess && (
                        <div className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500/20 to-yellow-400/20 text-yellow-300 border border-yellow-500/50 px-3 py-1 rounded-full shadow-[0_0_12px_rgba(234,179,8,0.4)] animate-[pulse_3s_ease-in-out_infinite]">
                            <Crown className="w-3.5 h-3.5 drop-shadow-md" fill="currentColor" />
                            <span className="text-[10px] font-black tracking-widest drop-shadow-sm">VIP HOLDER</span>
                        </div>
                    )}
                    <div className="text-xs text-slate-400 font-mono bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg">
                        {userAddress?.slice(0,6)}...{userAddress?.slice(-4)}
                    </div>
                </div>
            )}
        </div>

        {/* Row 2: Instrument Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 w-full">
            
            {/* Sound Settings */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                {/* Waveform Selector */}
                <div className="flex items-center bg-slate-950 rounded-lg border border-slate-800 p-1">
                    <div className="flex items-center px-2 text-slate-500 gap-1 border-r border-slate-800 mr-1">
                        <Activity className="w-3 h-3" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Wave</span>
                    </div>
                    {(['triangle', 'sine', 'square', 'sawtooth'] as const).map((type) => (
                        <button
                            key={type}
                            onClick={() => setWaveform(type)}
                            className={`p-1.5 rounded-md text-xs transition-all ${waveform === type ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                            title={type}
                        >
                            {type === 'triangle' && <span className="font-sans">▲</span>}
                            {type === 'sine' && <span className="font-sans">~</span>}
                            {type === 'square' && <span className="font-sans">■</span>}
                            {type === 'sawtooth' && <span className="font-sans">vf</span>}
                        </button>
                    ))}
                </div>

                {/* Sustain Toggle */}
                <button
                    onClick={() => setSustain(!sustain)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${sustain ? 'bg-pink-600 border-pink-500 text-white shadow-[0_0_10px_rgba(219,39,119,0.3)]' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600'}`}
                >
                    <Zap className={`w-3 h-3 ${sustain ? 'fill-current' : ''}`} />
                    SUS
                </button>
            </div>

            {/* Octave Shifter */}
            <div className="flex items-center bg-slate-950 rounded-lg border border-slate-800 p-1 ml-auto">
              <button 
                onClick={() => setOctaveShift(s => Math.max(s - 1, -2))}
                disabled={octaveShift <= -2}
                className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-md disabled:opacity-30 disabled:cursor-not-allowed active:bg-slate-700"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex flex-col items-center px-3 min-w-[60px]">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Octave</span>
                <span className={`text-sm font-mono font-bold ${octaveShift !== 0 ? 'text-indigo-400' : 'text-slate-300'}`}>
                    {octaveShift > 0 ? `+${octaveShift}` : octaveShift}
                </span>
              </div>
              <button 
                onClick={() => setOctaveShift(s => Math.max(s + 1, 2))}
                disabled={octaveShift >= 2}
                className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-md disabled:opacity-30 disabled:cursor-not-allowed active:bg-slate-700"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
        </div>
      </div>

      {/* Piano SVG */}
      <div className="relative w-full max-w-[95vw] overflow-x-auto pb-6 px-2 custom-scrollbar">
        <div className="inline-block p-4 bg-slate-950 rounded-xl shadow-2xl border border-slate-800 select-none min-w-min mx-auto relative">
            {/* Decoration Line */}
            <div className={`absolute top-0 left-0 w-full h-2 bg-gradient-to-r rounded-t-xl opacity-50 ${hasAccess ? 'from-yellow-500 via-orange-500 to-red-500' : 'from-indigo-500 via-purple-500 to-pink-500'}`}></div>
            
            <svg width={totalWidth} height={whiteKeyHeight} className="block">
            {keys}
            </svg>
        </div>
      </div>
      
      {!hasAccess && (
          <p className="text-xs text-slate-500 italic text-center px-4">
            Tip: Connect wallet with $SLERF on Base to unlock extra octaves.
          </p>
      )}
    </div>
  );
};

export default PianoToken;
