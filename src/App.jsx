import React, { useState, useEffect, useRef, useContext, createContext } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithCustomToken, 
  signInAnonymously, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  getDoc,
  getDocs,
  query
} from 'firebase/firestore';
import { 
  Users, Layers, Clock, Plus, ChevronLeft, ChevronRight,
  Lock, X, Zap, Smile, Brain, Volume2, Youtube, Film,
  Pencil, Bold, Italic, Underline, UserPlus, Timer,
  Settings, Trash2, Palette, Loader2, Star, Info, Share2, Quote, Sparkles, Wand2,
  Bookmark, Shield, Cpu, ZapOff, Activity, Hash, ExternalLink, Save, LogOut, Maximize2,
  VolumeX, AlertTriangle, PlayCircle, List, Sparkle, Search, Wand, Headphones, Download, Pause, Play, FastForward, Sliders, Mic2, FileText, CheckCircle2, Cloud, LayoutGrid, BookOpen, Globe, Radio, Signal, BarChart3, Podcast, KeyRound
} from 'lucide-react';

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyD9OF9pU...",
  authDomain: "linkards.firebaseapp.com",
  projectId: "linkards",
  storageBucket: "linkards.appspot.com",
  messagingSenderId: "487533210998",
  appId: "1:487533210998:web:72935249956cce8d0b857",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'linkards-shared-v10';

// --- System Constants ---
const VERSION = "v12.65 (Title Alignment Fix)";
const apiKey = ""; 

const THEME = {
  bg: 'bg-[#051115]',           
  container: 'bg-[#0F172A]',    
  slab: 'bg-[#131D33]',         
  iconBg: 'bg-[#0D2D35]',       
  cardDark: 'bg-[#0F172A]',     
  cardGreenBack: 'bg-[#0E4F3F]', 
  actionGreen: 'bg-[#0CB87A]',  
  actionGreenHover: 'hover:bg-[#15D48E]',
  accentBlue: 'text-[#1FA4C8]',
  textPrimary: 'text-[#F0F9FB]', 
  textSecondary: 'text-[#9FB6BC]',
  textMuted: 'text-[#5F7C83]',  
  borderGreen: 'border-[#0CB87A]', 
  borderDarkGreen: 'border-[#2D9A7A]', 
  borderSoft: 'border-[#1A4B57]',   
  warning: 'text-[#FF4D4D]',    
};

const MEMORY_LEVELS = [
  { id: 'master', label: 'Strong', ptLabel: 'Forte', style: 'border-[#0CB87A] text-[#0CB87A] hover:bg-[#0CB87A]/10', colorHex: '#0CB87A' }, 
  { id: 'good', label: 'Fair', ptLabel: 'Médio', style: 'border-[#1FA4C8] text-[#1FA4C8] hover:bg-[#1FA4C8]/10', colorHex: '#1FA4C8' },   
  { id: 'little', label: 'Weak', ptLabel: 'Fraco', style: 'border-[#F59E0B] text-[#F59E0B] hover:bg-[#F59E0B]/10', colorHex: '#F59E0B' }, 
  { id: 'no', label: 'New', labelEn: 'New', ptLabel: 'Novo', style: 'border-[#F43F5E] text-[#F43F5E] hover:bg-[#F43F5E]/10', colorHex: '#F43F5E' }               
];

const PODCAST_LEVELS = [
    { id: 'A1-A2', label: 'Beginner', desc: 'Slow, simple words, clear explanations' },
    { id: 'B1-B2', label: 'Intermediate', desc: 'Natural speed, everyday conversation' },
    { id: 'C1-C2', label: 'Advanced', desc: 'Fast, complex, idiomatic' }
];

const INITIAL_PLAYERS = [
  { id: '1', name: "SabVocab", passkey: "sab", decks: { "All Cards": [] }, totalTime: 0 },
  { id: '2', name: "LeanVocab", passkey: "lean", decks: { "All Cards": [] }, totalTime: 0 },
  { id: '3', name: "LucVocab", passkey: "luc", decks: { "All Cards": [] }, totalTime: 0 }
];

// --- Context for Translation Toggle ---
const TranslationContext = createContext({ enabled: true, toggle: () => {} });

// --- Helper Functions ---
const capitalizeFirst = (str) => {
  if (!str) return "";
  const clean = str.replace(/<[^>]*>/g, '').trim();
  return clean.charAt(0).toUpperCase() + clean.slice(1);
};

const extractJson = (text) => {
  if (!text) return null;
  try {
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      return JSON.parse(text.substring(firstBrace, lastBrace + 1));
    }
    return JSON.parse(text);
  } catch (e) { return null; }
};

const getDeckStats = (cards) => {
  const stats = { master: 0, good: 0, little: 0, no: 0 };
  if (!cards || !Array.isArray(cards)) return stats;
  return cards.reduce((acc, card) => {
    const s = card.status || 'no';
    if (acc.hasOwnProperty(s)) acc[s]++;
    return acc;
  }, stats);
};

const getTimeUntilReturn = (cards, levelId) => {
    if (!cards || !Array.isArray(cards)) return "None";
    const levelCards = cards.filter(c => (c.status || 'no') === levelId);
    if (levelCards.length === 0) return "-";
    const now = Date.now();
    const futureReviews = levelCards.filter(c => c.nextReview > now).map(c => c.nextReview);
    if (futureReviews.length === 0) return "Ready";
    const nextTime = Math.min(...futureReviews);
    const diff = nextTime - now;
    
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "< 1m";
    if (minutes < 60) return `${minutes}m`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;

    const days = Math.floor(hours / 24);
    return `${days}d`;
};

const formatStudyTime = (ms) => {
  if (!ms || isNaN(ms)) return "0m";
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const generateWav = (pcmData, sampleRate = 24000) => {
  const buffer = new ArrayBuffer(44 + pcmData.length);
  const view = new DataView(buffer);
  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
  };
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + pcmData.length, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); 
  view.setUint16(22, 1, true); 
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); 
  view.setUint16(32, 2, true); 
  view.setUint16(34, 16, true); 
  writeString(36, 'data');
  view.setUint32(40, pcmData.length, true);
  new Uint8Array(buffer, 44).set(pcmData);
  return new Blob([buffer], { type: 'audio/wav' });
};

const geminiFetch = async (payload, endpoint = "generateContent", model = "gemini-2.5-flash-preview-09-2025") => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:${endpoint}?key=${apiKey}`;
  for (let i = 0; i < 5; i++) {
    try {
      const res = await fetch(url, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(payload) 
      });
      if (res.ok) return await res.json();
      else {
          console.warn(`API Error ${res.status}: ${res.statusText}`);
      }
    } catch (e) { 
        const delay = Math.pow(2, i) * 1000;
        await new Promise(r => setTimeout(r, delay)); 
    }
  }
};

// --- UI Components ---

const PtToggle = ({ variant = "dark" }) => {
  const { enabled, toggle } = useContext(TranslationContext);
  const styles = {
    dark: { active: 'text-[#0CB87A]', inactive: 'text-white/20 hover:text-white/40', tooltipBg: 'bg-[#0F172A] text-white' },
    light: { active: 'text-[#051115]', inactive: 'text-[#051115]/20 hover:text-[#051115]/40', tooltipBg: 'bg-white text-[#051115] shadow-xl' }
  };
  const currentStyle = styles[variant];
  return (
    <button onClick={toggle} className={`group relative text-[10px] font-black tracking-widest transition-all p-2 ${enabled ? currentStyle.active : currentStyle.inactive}`}>
      PT
      <span className={`absolute right-0 top-full mt-2 w-48 ${currentStyle.tooltipBg} border border-white/10 p-3 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] text-center leading-tight shadow-2xl`}>Tradução com cursor na primeira letra de cada palavra</span>
    </button>
  );
};

const LangHover = ({ en, pt, className = "", isHTML = false }) => {
  const { enabled } = useContext(TranslationContext);
  if (!en) return null;
  const enString = typeof en === 'string' ? en : String(en);
  const ptString = typeof pt === 'string' ? pt : String(pt);
  
  if (!enabled || !ptString || ptString === "undefined" || ptString === "") {
      return <span className={className} dangerouslySetInnerHTML={isHTML ? { __html: enString } : null}>{isHTML ? null : enString}</span>;
  }
  if (isHTML) {
      let firstLetterIdx = -1;
      let inTag = false;
      for (let i = 0; i < enString.length; i++) {
        if (enString[i] === '<') inTag = true;
        else if (enString[i] === '>') inTag = false;
        else if (!inTag && /[a-zA-Z0-9]/.test(enString[i])) { firstLetterIdx = i; break; }
      }
      if (firstLetterIdx === -1) return <span className={className} dangerouslySetInnerHTML={{ __html: enString }} />;
      const prefix = enString.substring(0, firstLetterIdx);
      const letter = enString[firstLetterIdx];
      const suffix = enString.substring(firstLetterIdx + 1);
      return (<span className={className}><span dangerouslySetInnerHTML={{ __html: prefix }} /><span className="group/lang relative inline-block cursor-help"><span>{letter}</span><span className="absolute left-0 bottom-full mb-3 px-4 py-2 bg-[#0CB87A] text-white text-[11px] font-bold rounded-xl opacity-0 group-hover/lang:opacity-100 transition-all pointer-events-none whitespace-normal min-w-[140px] max-w-[220px] z-[110] shadow-2xl text-center leading-tight border-2 border-white/20">{ptString}<span className="absolute left-2 top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-[#0CB87A]" /></span></span><span dangerouslySetInnerHTML={{ __html: suffix }} /></span>);
  }
  const words = enString.split(/(\s+)/);
  return (
    <span className={className}>
      {words.map((word, index) => {
        if (!word.trim()) return <span key={index}>{word}</span>;
        const match = word.match(/^([^a-zA-Z0-9]*)([a-zA-Z0-9])(.*)$/);
        if (!match) return <span key={index}>{word}</span>;
        const [_, prefix, letter, suffix] = match;
        return (<span key={index}>{prefix}<span className="group/lang relative inline-block cursor-help"><span>{letter}</span><span className="absolute left-0 bottom-full mb-3 px-4 py-2 bg-[#0CB87A] text-white text-[11px] font-bold rounded-xl opacity-0 group-hover/lang:opacity-100 transition-all pointer-events-none whitespace-normal min-w-[140px] max-w-[220px] z-[110] shadow-2xl text-center leading-tight border-2 border-white/20">{ptString}<span className="absolute left-2 top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-[#0CB87A]" /></span></span>{suffix}</span>);
      })}
    </span>
  );
};

const BatteryChargingBar = ({ filledCount, color }) => (
  <div className={`border p-[1px] rounded-[3px] flex gap-[1px] bg-[#051115] w-fit border-[#1A4B57]/50`}>{[1, 2, 3, 4].map((i) => (<div key={i} className="w-[3px] h-[6px] rounded-[0.5px]" style={{ backgroundColor: i <= filledCount ? color : '#131D33' }} />))}</div>
);

const CardRichEditor = ({ value, onChange, placeholder, label, ptLabel }) => {
  const editorRef = useRef(null);
  useEffect(() => { if (editorRef.current && editorRef.current.innerHTML !== value) { editorRef.current.innerHTML = value || ""; } }, [value]);
  return (
    <div className="flex flex-col h-full relative group">
      <div className="flex items-center justify-between mb-4"><LangHover en={label} pt={ptLabel} className="text-[10px] font-black text-black/30 uppercase tracking-[0.2em]" /></div>
      <div ref={editorRef} contentEditable onInput={(e) => onChange(e.currentTarget.innerHTML)} className="w-full flex-1 p-0 text-2xl font-bold leading-tight focus:outline-none scrollbar-hide overflow-y-auto text-black" />
      {(!value || value === "<br>") && ( <p className="absolute left-0 top-10 pointer-events-none italic text-sm opacity-30 text-black"> {placeholder} </p> )}
    </div>
  );
};

const SynapseHeader = () => (
  <div className="relative w-full h-[180px] flex items-center justify-center overflow-visible">
    <div className="absolute top-8 right-8 z-50"><PtToggle variant="dark" /></div>
    <svg className="w-screen h-full overflow-visible pointer-events-none" viewBox="0 0 1200 180" preserveAspectRatio="xMidYMid slice">
      <defs><linearGradient id="div-grad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#0CB87A" stopOpacity="0" /><stop offset="50%" stopColor="#0CB87A" stopOpacity="1" /><stop offset="100%" stopColor="#0CB87A" stopOpacity="0" /></linearGradient></defs>
      <g transform="translate(0, 80) scale(1, 0.85)" style={{ fontFamily: "'Inter', sans-serif" }}><text fill="#0CB87A" className="font-thin uppercase" style={{ fontSize: '42px' }} textAnchor="middle"><tspan x="510">L</tspan><tspan x="532">I</tspan><tspan x="558">N</tspan><tspan x="584" className="font-light">K</tspan><tspan x="616" className="font-light">A</tspan><tspan x="642">R</tspan><tspan x="668">D</tspan><tspan x="694">S</tspan></text></g>
      <g transform="translate(0, 115)"><path d="M 0,0 L 510,0 L 525,-15 L 540,15 L 555,-25 L 570,25 L 578,0" fill="none" stroke="url(#div-grad)" strokeWidth="1.2" /><path d="M 622,0 L 630,0 L 645,-20 L 660,20 L 675,-30 L 690,30 L 705,0 L 1200,0" fill="none" stroke="url(#div-grad)" strokeWidth="1.2" /><circle cx="584" cy="0" r="3.5" fill="#0CB87A"><animate attributeName="opacity" values="0.4;1;0.4" dur="4s" repeatCount="indefinite" /></circle><circle cx="616" cy="0" r="3.5" fill="#2AB5DB"><animate attributeName="opacity" values="0.4;1;0.4" dur="4s" begin="2s" repeatCount="indefinite" /></circle></g>
    </svg>
  </div>
);

// --- App Component ---

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [isAuth, setIsAuth] = useState(false);
  const [passkeyInput, setPasskeyInput] = useState("");
  const [activeDeckName, setActiveDeckName] = useState(null); 
  const [isStudying, setIsStudying] = useState(false); 
  const [isListView, setIsListView] = useState(false); 
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [showAddCard, setShowAddCard] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAddDeckModal, setShowAddDeckModal] = useState(false);
  const [showAIDeckModal, setShowAIDeckModal] = useState(false);
  const [aiDeckPrompt, setAiDeckPrompt] = useState("");
  const [tempDeckName, setTempDeckName] = useState("");
  const [isMagicLoading, setIsMagicLoading] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  
  // Account Mgmt State
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerPass, setNewPlayerPass] = useState("");
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [newPasskey, setNewPasskey] = useState("");
  
  // Study Timer
  const studyStartRef = useRef(null);
  
  // Podcast State
  const [showPodcastModal, setShowPodcastModal] = useState(false);
  const [podcastStatus, setPodcastStatus] = useState("idle"); 
  const [podcastAudioUrl, setPodcastAudioUrl] = useState(null);
  const [activePodcastDeck, setActivePodcastDeck] = useState(null);
  const [podcastLevel, setPodcastLevel] = useState("B1-B2");
  const [savedPodcastData, setSavedPodcastData] = useState(null);

  const [isTranslationEnabled, setIsTranslationEnabled] = useState(true);
  const [cardForm, setCardForm] = useState({ id: null, front: "", front_pt: "", targetVocab: "", targetVocab_pt: "", phonetic: "", sentenceBack: "", sentenceBack_pt: "" });

  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
      } else {
          await signInAnonymously(auth);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const playersCol = collection(db, 'artifacts', appId, 'public', 'data', 'players');
    const unsubscribe = onSnapshot(playersCol, (snapshot) => {
      if (snapshot.empty) { INITIAL_PLAYERS.forEach(async (p) => await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', p.id), p)); } 
      else {
        const pData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPlayers(pData); setLoading(false);
        if (selectedPlayer) { const updated = pData.find(p => p.id === selectedPlayer.id); if (updated) setSelectedPlayer(updated); }
      }
    }, (err) => console.error("Firestore Error:", err));
    return () => unsubscribe();
  }, [user, selectedPlayer?.id]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // --- Account Management Functions ---

  const handleAddPlayer = async () => {
    if (!newPlayerName || !newPlayerPass) return;
    const newId = Date.now().toString();
    const newPlayer = {
      id: newId,
      name: newPlayerName,
      passkey: newPlayerPass,
      decks: { "All Cards": [] },
      totalTime: 0
    };
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', newId), newPlayer);
    setShowAddPlayerModal(false);
    setNewPlayerName("");
    setNewPlayerPass("");
  };

  const handleDeletePlayer = async () => {
      if (!selectedPlayer) return;
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', selectedPlayer.id));
      setSelectedPlayer(null);
      setIsAuth(false);
      setShowSettingsModal(false);
  };

  const handleChangePasskey = async () => {
      if (!newPasskey || !selectedPlayer) return;
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', selectedPlayer.id), { passkey: newPasskey });
      setNewPasskey("");
      setShowSettingsModal(false);
      alert("Password updated!");
  };

  const handleStartStudy = () => {
      studyStartRef.current = Date.now();
      setIsStudying(true);
  };

  const handleExitStudy = async () => {
      if (studyStartRef.current && selectedPlayer) {
          const endTime = Date.now();
          const duration = endTime - studyStartRef.current;
          const newTotal = (selectedPlayer.totalTime || 0) + duration;
          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', selectedPlayer.id), { totalTime: newTotal });
      }
      setIsStudying(false);
      studyStartRef.current = null;
  };

  // --- IA Functions ---

  const handleMagicFill = async () => {
    const vocab = cardForm.targetVocab?.trim();
    if (!vocab || isMagicLoading) return;
    setIsMagicLoading(true);
    const prompt = `Process the word "${vocab}". 
    Create:
    1. A simplified phonetic transcription for Brazilian Portuguese speakers (e.g. use 'dji' for 'di', 'tchi' for 'ti', 'u' for 'l' at end, 'er' for 'ar'), enclosed in simple slashes (e.g. /wurd/). MUST BE ALL LOWERCASE.
    2. A simple example sentence in English.
    3. The translation of that sentence.
    Return ONLY JSON: {"phonetic": "...", "sentence_en": "Example sentence here.", "sentence_pt": "Tradução aqui.", "term_pt": "Tradução da palavra", "front_pt": "Context"}`;
    try {
      const res = await geminiFetch({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } });
      const data = extractJson(res.candidates[0].content.parts[0].text);
      if (data) setCardForm(prev => ({ ...prev, phonetic: data.phonetic?.toLowerCase(), sentenceBack: data.sentence_en, sentenceBack_pt: data.sentence_pt, targetVocab_pt: data.term_pt, front_pt: data.front_pt }));
    } finally { setIsMagicLoading(false); }
  };

  const handleGenerateAIDeck = async () => {
    if (!aiDeckPrompt || isMagicLoading || !user) return;
    setIsMagicLoading(true);
    const prompt = `Create an English deck based on this request: "${aiDeckPrompt}". 
    If the user specifies a quantity, generate that exact number. If no quantity is specified, generate 20 cards.
    Use simplified brazilian phonetic transcription (e.g. /tcher/ instead of IPA). MUST BE ALL LOWERCASE.
    JSON: { "deckName": "Name", "cards": [{"front": "trigger phrase", "front_pt": "...", "term": "...", "term_pt": "...", "phonetic": "...", "sentence": "Example sentence.", "sentence_pt": "..."}] }`;
    try {
      const res = await geminiFetch({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } });
      const data = extractJson(res.candidates[0].content.parts[0].text);
      
      if (!data.deckName || !data.deckName.trim()) {
          data.deckName = `AI Deck ${new Date().toLocaleDateString()}`;
      }

      const decks = { ...selectedPlayer.decks };
      const newCards = data.cards.map(c => ({ 
        id: Date.now() + Math.random().toString(), 
        front: c.front || "", 
        front_pt: c.front_pt || "", 
        term: c.term || "", 
        term_pt: c.term_pt || "", 
        phonetic: c.phonetic?.toLowerCase() || "", 
        status: 'no', 
        nextReview: 0, 
        back: { 
            sentence: c.sentence || "", 
            sentence_pt: c.sentence_pt || "", 
            contextLinks: { 
                youglish: `https://youglish.com/pronounce/${encodeURIComponent(c.term || "")}/english`, 
                yarn: `https://getyarn.io/yarn-find?text=${encodeURIComponent(c.term || "")}` 
            } 
        } 
      }));
      decks[data.deckName] = newCards; 
      decks["All Cards"] = [...(decks["All Cards"] || []), ...newCards];
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', selectedPlayer.id), { decks });
      setShowAIDeckModal(false); setAiDeckPrompt("");
    } finally { setIsMagicLoading(false); }
  };

  const fetchPodcastDoc = async (deckName) => {
    if(!user || !selectedPlayer) return null;
    const podcastId = `${selectedPlayer.id}_${deckName.replace(/\s+/g, '_')}`;
    const snap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'podcasts', podcastId));
    return snap.exists() ? snap.data() : null;
  };

  const openPodcastModal = async (deckName) => {
      setActivePodcastDeck(deckName);
      setShowPodcastModal(true);
      setPodcastStatus("loading");
      setSavedPodcastData(null);
      
      const saved = await fetchPodcastDoc(deckName);
      if (saved) {
          setSavedPodcastData(saved);
          setPodcastStatus("saved"); 
      } else {
          setPodcastStatus("idle");
      }
  };

  const deletePodcast = async () => {
      if(!activePodcastDeck || !user) return;
      const podcastId = `${selectedPlayer.id}_${activePodcastDeck.replace(/\s+/g, '_')}`;
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'podcasts', podcastId));
      setSavedPodcastData(null);
      setPodcastStatus("idle");
  };

  const handleGeneratePodcast = async (useSavedScript = false) => {
    if (!user) return;
    setPodcastStatus("scripting");

    try {
        let script = "";
        let level = podcastLevel;

        if (useSavedScript && savedPodcastData) {
            script = savedPodcastData.script;
            level = savedPodcastData.level;
            console.log("Using saved script...");
        } else {
            const cards = selectedPlayer.decks[activePodcastDeck] || [];
            if (cards.length === 0) throw new Error("Deck empty");

            const priority = { 'no': 4, 'little': 3, 'good': 2, 'master': 1 };
            
            const terms = cards
                .sort((a, b) => ((priority[b.status] || 0) + Math.random()) - ((priority[a.status] || 0) + Math.random()))
                .slice(0, 7) 
                .map(c => c.term)
                .join(", ");

            const scriptPrompt = `Create a natural, educational conversation between two English tutors, Alice (female) and Bob (male), in the style of the 'BBC 6 Minute English' podcast. 
            Level: ${level} (CEFR).
            Topic: LinCast Episode about these 7 key words: ${terms}. 
            Keep it clear and engaging. Explain the words naturally in context.
            IMPORTANT: Output ONLY the dialogue lines with speaker names.
            Format example:
            Alice: Hello! Today we are discussing...
            Bob: That's right Alice.`;

            const scriptRes = await geminiFetch({ contents: [{ parts: [{ text: scriptPrompt }] }] });
            script = scriptRes.candidates[0].content.parts[0].text;
            
            const podcastId = `${selectedPlayer.id}_${activePodcastDeck.replace(/\s+/g, '_')}`;
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'podcasts', podcastId), {
                script,
                level,
                createdAt: Date.now(),
                deckName: activePodcastDeck
            });
            setSavedPodcastData({ script, level });
        }

        setPodcastStatus("synthesizing");
        
        const audioRes = await geminiFetch({
            contents: [{ parts: [{ text: script }] }],
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: undefined,
                multiSpeakerVoiceConfig: {
                    speakerVoiceConfigs: [
                        { speaker: "Alice", voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } } },
                        { speaker: "Bob", voiceConfig: { prebuiltVoiceConfig: { voiceName: "Fenrir" } } }
                    ]
                }
              }
            },
            model: "gemini-2.5-flash-preview-tts"
        }, "generateContent", "gemini-2.5-flash-preview-tts");

        const audioPart = audioRes.candidates[0]?.content?.parts?.find(p => p.inlineData);
        if (audioPart) {
            const bin = atob(audioPart.inlineData.data);
            const bytes = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
            const blob = generateWav(bytes);
            setPodcastAudioUrl(URL.createObjectURL(blob));
            setPodcastStatus("playing");
        } else {
            throw new Error("No audio generated");
        }

    } catch (e) {
        console.error(e);
        setPodcastStatus("error");
    }
  };

  const handleSaveCard = async () => {
    if (!user || !cardForm.targetVocab || !cardForm.front) return;
    const deckName = activeDeckName || "All Cards";
    const cardId = cardForm.id || Date.now().toString();
    const cardData = { 
        id: cardId, 
        front: cardForm.front || "", 
        front_pt: cardForm.front_pt || "", 
        term: cardForm.targetVocab || "", 
        term_pt: cardForm.targetVocab_pt || "", 
        phonetic: cardForm.phonetic || "", 
        status: 'no', 
        nextReview: 0, 
        back: { 
            sentence: cardForm.sentenceBack || "", 
            sentence_pt: cardForm.sentenceBack_pt || "", 
            contextLinks: { 
                youglish: `https://youglish.com/pronounce/${encodeURIComponent(cardForm.targetVocab || "")}/english`, 
                yarn: `https://getyarn.io/yarn-find?text=${encodeURIComponent(cardForm.targetVocab || "")}` 
            } 
        } 
    };
    const decks = { ...selectedPlayer.decks };
    if (cardForm.id) { Object.keys(decks).forEach(k => decks[k] = decks[k].map(c => c.id === cardForm.id ? cardData : c)); }
    else { 
        decks[deckName] = [...(decks[deckName] || []), cardData]; 
        if (deckName !== "All Cards") decks["All Cards"] = [...(decks["All Cards"] || []), cardData]; 
    }
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', selectedPlayer.id), { decks });
    setShowAddCard(false); setCardForm({ id: null, front: "", front_pt: "", targetVocab: "", targetVocab_pt: "", phonetic: "", sentenceBack: "", sentenceBack_pt: "" });
  };

  const handleDeleteDeck = async () => {
    if (!user || !activeDeckName || activeDeckName === "All Cards") return;
    const decks = { ...selectedPlayer.decks };
    const cardsInDeck = decks[activeDeckName] || [];
    const idsToRemove = new Set(cardsInDeck.map(c => c.id));
    if (decks["All Cards"]) {
        decks["All Cards"] = decks["All Cards"].filter(card => !idsToRemove.has(card.id));
    }
    delete decks[activeDeckName];
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', selectedPlayer.id), { decks });
    setActiveDeckName(null);
    setShowDeleteModal(false);
  };

  const updateCardStatus = async (status) => {
    if (!user) return;
    setIsFlipped(false);
    await new Promise(r => setTimeout(r, 600));
    
    const ONE_DAY = 24 * 60 * 60 * 1000;
    let delay = 0;
    
    if (status === 'master') delay = 5 * ONE_DAY;   
    else if (status === 'good') delay = 3 * ONE_DAY; 
    else if (status === 'little') delay = 1 * ONE_DAY; 
    else if (status === 'no') delay = 0;             
    
    const decks = { ...selectedPlayer.decks };
    Object.keys(decks).forEach(k => decks[k] = decks[k].map(c => c.id === currentCard.id ? { ...c, status, nextReview: Date.now() + delay } : c));
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', selectedPlayer.id), { decks });
    setCurrentIndex(prev => prev + 1);
  };

  const fetchAndPlayTTS = async (term, sentence, setAudioLoading) => {
    if (!term) return;
    setAudioLoading(true);
    const cleanSentence = sentence ? sentence.replace(/<[^>]*>/g, '').trim() : "";
    const ttsText = `Say naturally and clearly: ${term}. Then say: ${cleanSentence}`;
    try {
      const res = await geminiFetch({
        contents: [{ parts: [{ text: ttsText }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } } }
        },
        model: "gemini-2.5-flash-preview-tts"
      }, "generateContent", "gemini-2.5-flash-preview-tts");
      
      const audioPart = res.candidates[0]?.content?.parts?.find(p => p.inlineData);
      if (audioPart) {
          const bin = atob(audioPart.inlineData.data);
          const bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
          const audio = new Audio(URL.createObjectURL(generateWav(bytes)));
          audio.onended = () => setAudioLoading(false);
          await audio.play();
      }
    } catch (err) { console.error(err); setAudioLoading(false); }
  };

  const allCardsInDeck = selectedPlayer && activeDeckName ? (selectedPlayer.decks[activeDeckName] || []) : [];
  const reviewQueue = allCardsInDeck.filter(c => !c.nextReview || c.nextReview <= currentTime);
  const remainingCount = allCardsInDeck.filter(c => c.status === 'no').length;
  const currentCard = reviewQueue.length > 0 ? reviewQueue[currentIndex % reviewQueue.length] : null;

  if (loading) return <div className={`h-screen ${THEME.bg} flex items-center justify-center`}><Loader2 className="animate-spin text-[#0CB87A]" size={40} /></div>;

  return (
    <TranslationContext.Provider value={{ enabled: isTranslationEnabled, toggle: () => setIsTranslationEnabled(!isTranslationEnabled) }}>
      <div className={`flex flex-col h-screen ${THEME.bg} font-sans overflow-hidden text-white`}>
        <main className={`flex-1 flex flex-col items-center justify-start overflow-y-auto w-full p-6 ${selectedPlayer ? 'pt-8' : ''}`}>
          <div className="w-full max-w-4xl flex flex-col items-center relative">
            
            {!selectedPlayer ? (
              <>
                <SynapseHeader />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full animate-in fade-in mt-12">
                  {players.map(p => (
                    <button key={p.id} onClick={() => setSelectedPlayer(p)} className={`p-8 ${THEME.slab} rounded-[2rem] border ${THEME.borderGreen} shadow-xl flex flex-col items-center gap-6 group active:scale-95 hover:border-[#0CB87A] transition-all relative overflow-hidden`}>
                      <div className="flex flex-col items-center gap-3 z-10">
                          <div className={`w-20 h-20 rounded-[2rem] ${THEME.iconBg} flex items-center justify-center border-2 border-[#1A4B57] shadow-inner mb-2`}>
                              <Users size={32} className="text-[#0CB87A]" />
                          </div>
                          <span className="text-lg font-black tracking-widest">{p.name}</span>
                          <div className="flex items-center gap-1 opacity-50">
                             <Clock size={12}/>
                             <span className="text-[10px] font-bold tracking-widest">{formatStudyTime(p.totalTime)}</span>
                          </div>
                      </div>
                      
                      <div className="flex flex-col w-full border-t border-white/5 pt-4 mt-2">
                          <LangHover en="Memorized Words" pt="Palavras Memorizadas" className="text-[10px] text-center font-bold text-white/50 mb-4 tracking-widest uppercase block" />
                          <div className="flex items-end justify-center gap-4">
                            {MEMORY_LEVELS.map(l => {
                                const count = getDeckStats(p.decks?.["All Cards"])[l.id];
                                const fill = Math.min(4, Math.ceil(count / 5)); 
                                return (
                                  <div key={l.id} className="flex flex-col items-center gap-1">
                                      <LangHover en={l.label} pt={l.ptLabel} className="text-[8px] font-bold text-white/60 mb-1 tracking-wider uppercase" />
                                      <BatteryChargingBar filledCount={fill} color={l.colorHex} />
                                      <span className="text-[9px] font-bold opacity-40 mt-1">{count}</span>
                                  </div>
                                );
                            })}
                          </div>
                      </div>
                    </button>
                  ))}
                  <button onClick={() => setShowAddPlayerModal(true)} className={`p-8 border-2 border-dashed border-white/10 rounded-[2rem] flex flex-col items-center justify-center gap-4 text-white/20 hover:text-[#0CB87A] hover:border-[#0CB87A] hover:bg-[#0CB87A]/5 transition-all`}>
                      <Plus size={40} />
                      <span className="text-sm font-black uppercase tracking-widest"><LangHover en="Create Profile" pt="Criar Perfil"/></span>
                  </button>
                </div>
              </>
            ) : !isAuth ? (
              <div className="flex flex-col items-center py-40 animate-in zoom-in-95">
                <input type="password" value={passkeyInput} onChange={e => setPasskeyInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && passkeyInput === selectedPlayer.passkey && setIsAuth(true)} placeholder="Password" className="bg-transparent border-b border-white/10 text-center text-sm outline-none py-1 w-32 focus:border-[#0CB87A] transition-all" />
                <button onClick={() => setSelectedPlayer(null)} className="text-[10px] uppercase font-black tracking-widest text-white/20 hover:text-white transition-all mt-8"><LangHover en="Back to Home" pt="Voltar ao Início" /></button>
              </div>
            ) : !isStudying && !isListView ? (
              <div className={`w-full flex flex-col min-h-[520px] transition-all shadow-2xl animate-in slide-in-from-bottom-4`}>
                <div className="w-full bg-[#0CB87A] p-4 rounded-t-[2.5rem] flex justify-between items-center text-[#051115]">
                  <div className="flex items-center gap-3"><span className="text-[11px] font-black uppercase tracking-widest">{selectedPlayer.name}</span></div>
                  <div className="flex items-center gap-4">
                      <PtToggle variant="light" />
                      <button onClick={() => setShowSettingsModal(true)} className="p-2 hover:bg-black/10 rounded-full transition-colors"><Settings size={18} /></button>
                      <Cloud size={16} className="text-[#051115]/40 animate-pulse" title="Synced to Cloud" />
                      <button onClick={() => { if (activeDeckName) setActiveDeckName(null); else setIsAuth(false); }} className="p-2 hover:bg-black/10 rounded-full"><ChevronLeft size={20}/></button>
                  </div>
                </div>
                <div className="w-full bg-[#0F172A] rounded-b-[2.5rem] p-10 flex flex-col gap-10 border-x border-b border-white/5 relative">
                  
                  {activeDeckName ? (
                    <div>
                      <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-6">
                        <h3 className="text-2xl font-black"><LangHover en={activeDeckName} pt={activeDeckName === "All Cards" ? "Todas as Cartas" : null} /></h3>
                        <div className="flex gap-2">
                          <button onClick={() => setIsListView(true)} className="p-3 bg-[#131D33] rounded-xl text-white/40 hover:text-[#0CB87A] transition-all"><List size={18}/></button>
                          <button onClick={() => { setTempDeckName(activeDeckName); setShowRenameModal(true); }} className="p-3 bg-[#131D33] rounded-xl text-white/40 hover:text-[#1FA4C8] transition-all"><Pencil size={18}/></button>
                          {activeDeckName !== "All Cards" && (
                            <button onClick={() => setShowDeleteModal(true)} className="p-3 bg-[#131D33] rounded-xl text-white/40 hover:text-[#FF4D4D] transition-all">
                              <Trash2 size={18}/>
                            </button>
                          )}
                        </div>
                      </div>
                      <button onClick={handleStartStudy} className={`w-full ${THEME.actionGreen} text-[#051115] font-black py-6 rounded-[1.5rem] uppercase tracking-[0.4em] mb-4`}><LangHover en="Start Training" pt="Iniciar Treino" /></button>
                      <button onClick={() => { setCardForm({id: null, front: "", front_pt: "", targetVocab: "", targetVocab_pt: "", phonetic: "", sentenceBack: "", sentenceBack_pt: ""}); setShowAddCard(true); }} className="w-full bg-[#0CB87A]/5 text-[#0CB87A] border border-[#0CB87A]/20 py-4 rounded-[1.5rem] uppercase tracking-widest"><LangHover en="Add Card" pt="Adicionar Carta" /></button>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      <div className="flex items-center justify-between">
                          <LangHover en="My Decks" pt="Meus Baralhos" className="text-xs font-black uppercase tracking-widest text-white/30" />
                          <div className="flex gap-2 mr-20"><button onClick={() => setShowAIDeckModal(true)} className="flex items-center gap-2 px-4 py-2 bg-[#0CB87A]/10 text-[#0CB87A] rounded-xl text-[10px] font-black border border-[#0CB87A]/20"><Wand size={14}/> <LangHover en="Wizard" pt="Mago" /></button><button onClick={() => setShowAddDeckModal(true)} className="p-2 bg-white/5 rounded-xl text-white/40"><Plus size={16}/></button></div>
                      </div>
                      
                      <div className="bg-[#131D33] p-6 rounded-[2rem] border border-[#1A4B57] shadow-lg">
                         <LangHover en="Memory Status" pt="Status da Memória" className="text-[10px] uppercase font-black tracking-widest text-white/30 mb-4 block" />
                         <div className="grid grid-cols-4 gap-2">
                             {MEMORY_LEVELS.map(l => (
                                 <div key={l.id} className="flex flex-col items-center p-2 rounded-xl bg-[#051115] border border-white/5">
                                     <div className="flex items-center gap-2 mb-2">
                                         <div className={`w-2 h-2 rounded-full`} style={{ backgroundColor: l.colorHex }} />
                                         <span className="text-[9px] font-bold text-white/60 uppercase"><LangHover en={l.label} pt={l.ptLabel} /></span>
                                     </div>
                                     <span className="text-lg font-black">{getDeckStats(selectedPlayer.decks?.["All Cards"])[l.id]}</span>
                                     <span className="text-[7px] opacity-40 mt-1 whitespace-nowrap">Back: {getTimeUntilReturn(selectedPlayer.decks?.["All Cards"], l.id)}</span>
                                 </div>
                             ))}
                         </div>
                     </div>

                      <div className="flex flex-col gap-4">
                          <div onClick={() => setActiveDeckName("All Cards")} className={`p-8 bg-[#131D33] rounded-[2.5rem] border-2 border-[#0CB87A] cursor-pointer flex items-center justify-between hover:bg-[#1A2640] transition-all group shadow-md relative`}>
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 bg-[#0CB87A] rounded-2xl flex items-center justify-center text-[#051115] group-hover:scale-110 transition-transform">
                                    <Activity size={28} />
                                </div>
                                <div>
                                    <h4 className="text-xl font-black"><LangHover en="All Cards" pt="Todas as Cartas" /></h4>
                                    <p className="text-[10px] text-[#0CB87A] font-black uppercase">{selectedPlayer.decks["All Cards"]?.length || 0} <LangHover en="Cards" pt="Cartas" /></p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <button onClick={(e) => { e.stopPropagation(); openPodcastModal("All Cards"); }} className="p-3 text-[#0CB87A]/30 hover:text-[#0CB87A] hover:bg-[#0CB87A]/10 rounded-full transition-all" title="Create LinCast">
                                    <Podcast size={20} />
                                </button>
                                <ChevronRight className="text-[#0CB87A]/30 group-hover:text-[#0CB87A] transition-colors" />
                            </div>
                          </div>

                          {Object.keys(selectedPlayer.decks).filter(k => k !== "All Cards").map(d => (
                             <div key={d} onClick={() => setActiveDeckName(d)} className={`p-8 bg-[#131D33] rounded-[2.5rem] border-2 border-[#0CB87A] cursor-pointer flex items-center justify-between hover:bg-[#1A2640] transition-all group shadow-md relative`}>
                               <div className="flex items-center gap-6">
                                   <div className="w-16 h-16 bg-[#1A4B57] rounded-2xl flex items-center justify-center text-[#0CB87A] group-hover:scale-110 transition-transform">
                                       <Layers size={28} />
                                   </div>
                                   <div>
                                       <h4 className="text-xl font-black">{d}</h4>
                                       <p className="text-[10px] text-[#0CB87A] font-black uppercase">{selectedPlayer.decks[d]?.length || 0} <LangHover en="Cards" pt="Cartas" /></p>
                                   </div>
                               </div>
                               <div className="flex items-center gap-4">
                                   <button onClick={(e) => { e.stopPropagation(); openPodcastModal(d); }} className="p-3 text-[#0CB87A]/30 hover:text-[#0CB87A] hover:bg-[#0CB87A]/10 rounded-full transition-all" title="Create LinCast">
                                       <Podcast size={20} />
                                   </button>
                                   <ChevronRight className="text-[#0CB87A]/30 group-hover:text-[#0CB87A] transition-colors" />
                               </div>
                             </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : isListView ? (
              <div className="w-full bg-[#0F172A] rounded-[3rem] p-8 min-h-[500px] animate-in fade-in">
                <header className="flex justify-between items-center mb-8"><div className="flex items-center gap-4"><button onClick={() => setIsListView(false)} className="p-2 bg-white/5 rounded-full"><ChevronLeft/></button><LangHover en="Deck Summary" pt="Resumo do Baralho" className="text-xl font-light tracking-widest" /></div></header>
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 scrollbar-hide">
                  {allCardsInDeck.map(c => (
                    <div key={c.id} className="bg-white rounded-2xl p-6 text-black flex justify-between items-center">
                      <div><h4 className="text-lg font-bold">{c.term}</h4><p className="text-xs text-gray-400 italic" dangerouslySetInnerHTML={{ __html: c.back.sentence }} /></div>
                      <div className="flex gap-2"><button onClick={() => { setCardForm({id: c.id, front: c.front, front_pt: c.front_pt, targetVocab: c.term, targetVocab_pt: c.term_pt, phonetic: c.phonetic, sentenceBack: c.back.sentence, sentenceBack_pt: c.back.sentence_pt}); setShowAddCard(true); }} className="p-2 text-gray-200"><Pencil size={14}/></button></div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="w-full flex items-start justify-center animate-in fade-in gap-6 max-w-6xl mx-auto">
                 <div className="flex flex-col items-center w-full max-w-[420px]">
                     <div className="w-full flex justify-between items-center mb-6 px-1"><button onClick={handleExitStudy} className="text-[9px] font-black uppercase text-white/40 hover:text-[#FF4D4D] transition-all"><LangHover en="Exit Session" pt="Sair da Sessão" /></button><div className="text-right"><span className="text-xl font-black text-[#0CB87A]">{remainingCount}</span><p className="text-[8px] font-black uppercase text-white/20"><LangHover en="Cards Left" pt="Cartas Restantes" /></p></div></div>
                     {currentCard ? (
                       <div className="w-full flex flex-col gap-6 perspective-[1000px]" key={currentCard.id}>
                          <div 
                            onClick={() => setIsFlipped(!isFlipped)} 
                            className={`w-full aspect-square relative transition-all duration-500 cursor-pointer transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}
                          >
                            <div className={`absolute inset-0 backface-hidden bg-[#0E4F3F] rounded-[3.5rem] border-4 ${THEME.borderGreen} shadow-2xl flex flex-col items-center justify-center p-8`}>
                              <button onClick={(e) => { e.stopPropagation(); setCardForm({id: currentCard.id, front: currentCard.front, front_pt: currentCard.front_pt, targetVocab: currentCard.term, targetVocab_pt: currentCard.term_pt, phonetic: currentCard.phonetic, sentenceBack: currentCard.back.sentence, sentenceBack_pt: currentCard.back.sentence_pt}); setShowAddCard(true); }} className="absolute top-8 right-8 text-white/10 hover:text-white"><Pencil size={18}/></button>
                              <div className="w-full h-full flex flex-col items-center justify-center text-center relative">
                                  <span className="absolute top-10 text-[10px] font-black uppercase text-[#F5F5F7] tracking-[0.5em] opacity-90"><LangHover en="Say in English" pt="Diga em Inglês" /></span>
                                  <div className="text-3xl font-bold leading-tight flex-1 flex items-center justify-center pt-8">
                                      <LangHover en={currentCard.front} pt={currentCard.front_pt} isHTML={true} />
                                  </div>
                              </div>
                            </div>

                            <div className={`absolute inset-0 backface-hidden rotate-y-180 bg-[#0F172A] rounded-[3.5rem] border-4 ${THEME.borderGreen} shadow-2xl flex flex-col items-center justify-between p-8`}>
                               <div className="w-full flex flex-col items-center mt-6">
                                  <button onClick={(e) => { e.stopPropagation(); fetchAndPlayTTS(currentCard.term, currentCard.back.sentence, setAudioLoading); }} className="mb-4 p-4 bg-black/20 rounded-2xl text-[#0CB87A] hover:bg-black/40 shadow-xl" disabled={audioLoading}>{audioLoading ? <Loader2 className="animate-spin" size={32}/> : <Volume2 size={32}/>}</button>
                                  <div className="text-center mb-2">
                                      <h4 className="text-3xl font-black mb-1">
                                          <LangHover en={capitalizeFirst(currentCard.term)} pt={currentCard.term_pt} />
                                      </h4>
                                      <p className="text-xs font-bold text-white/40 tracking-widest">{currentCard.phonetic}</p>
                                  </div>
                                  <div className="text-[13px] font-medium leading-relaxed opacity-90 overflow-y-auto max-h-[140px] scrollbar-hide text-left w-full bg-black/10 p-4 rounded-xl flex items-center justify-center mt-2">
                                      <div className="text-white/60 italic text-center">
                                          <LangHover en={currentCard.back.sentence} pt={currentCard.back.sentence_pt} />
                                      </div>
                                  </div>
                               </div>
                               
                               <div className="flex gap-4 mb-2">
                                   {currentCard.back.contextLinks?.youglish && (
                                       <a href={currentCard.back.contextLinks.youglish} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="p-3 bg-white rounded-full hover:scale-110 text-[#FF0000] shadow-lg transition-all" title="YouGlish">
                                           <Youtube size={20} fill="currentColor" />
                                       </a>
                                   )}
                                   {currentCard.back.contextLinks?.yarn && (
                                       <a href={currentCard.back.contextLinks.yarn} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="p-3 bg-white rounded-full hover:scale-110 text-[#2AB5DB] shadow-lg transition-all" title="Yarn">
                                           <Film size={20} fill="currentColor" />
                                       </a>
                                   )}
                               </div>
                            </div>
                          </div>

                          <div className={`flex gap-2 transition-all duration-500 ${isFlipped ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                              {MEMORY_LEVELS.map(l => (
                                <button key={l.id} onClick={() => isFlipped && updateCardStatus(l.id)} className={`flex-1 flex flex-col items-center py-4 rounded-2xl bg-[#131D33] border-2 ${l.style} active:scale-95 transition-all shadow-lg`}>
                                  <span className="text-[9px] font-bold uppercase tracking-widest"><LangHover en={l.label} pt={l.ptLabel} /></span>
                                </button>
                              ))}
                          </div>
                       </div>
                     ) : ( <div className="p-20 text-center"><Star size={48} className="text-[#0CB87A] mx-auto mb-6"/><h3 className="text-xl font-black uppercase tracking-widest">Loading Card...</h3></div> )}
                  </div>
              </div>
            )}

          </div>
        </main>

        {/* MODALS */}

        {/* Add Player Modal */}
        {showAddPlayerModal && (
          <div className="fixed inset-0 bg-black/98 z-[999] flex items-center justify-center p-6 backdrop-blur-3xl">
             <div className="w-full max-sm bg-[#131D33] rounded-[3rem] p-10 border border-[#0CB87A]/30 shadow-2xl animate-in zoom-in-95">
                <LangHover en="New Profile" pt="Novo Perfil" className="text-xl font-black uppercase mb-8 block text-center" />
                <input type="text" value={newPlayerName} onChange={e => setNewPlayerName(e.target.value)} className="w-full bg-[#051115] border-b-2 border-white/10 p-4 text-white outline-none focus:border-[#0CB87A] mb-4" placeholder="Name" />
                <input type="password" value={newPlayerPass} onChange={e => setNewPlayerPass(e.target.value)} className="w-full bg-[#051115] border-b-2 border-white/10 p-4 text-white outline-none focus:border-[#0CB87A] mb-8" placeholder="Password (Simple)" />
                <button onClick={handleAddPlayer} className="w-full bg-[#0CB87A] text-[#051115] font-black py-4 rounded-full uppercase"><LangHover en="Create" pt="Criar" /></button>
                <button onClick={() => setShowAddPlayerModal(false)} className="w-full mt-2 py-4 text-white/20 uppercase font-bold text-[10px]"><LangHover en="Cancel" pt="Cancelar" /></button>
             </div>
          </div>
        )}

        {showSettingsModal && (
            <div className="fixed inset-0 bg-black/98 z-[999] flex items-center justify-center p-6 backdrop-blur-3xl">
                <div className="w-full max-w-sm bg-[#131D33] rounded-[3rem] p-10 border border-white/10 shadow-2xl animate-in zoom-in-95">
                    <div className="relative flex items-center justify-center mb-8">
                        <LangHover en="Account Settings" pt="Configuração de Conta" className="text-xl font-black uppercase text-center" />
                        <button onClick={() => setShowSettingsModal(false)} className="absolute right-0 text-white/40 hover:text-white"><X size={20}/></button>
                    </div>

                    <div className="mb-8">
                        <label className="text-[10px] font-black uppercase text-white/40 mb-2 block"><LangHover en="Change Password" pt="Mudar Senha" /></label>
                        <div className="flex gap-2">
                            <input type="text" value={newPasskey} onChange={e => setNewPasskey(e.target.value)} className="flex-1 bg-[#051115] border border-[#1A4B57] rounded-xl p-3 text-white text-sm outline-none" placeholder="New Password" />
                            <button onClick={handleChangePasskey} className="p-3 bg-[#0CB87A] text-[#051115] rounded-xl"><CheckCircle2 size={18}/></button>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-white/5">
                         <button onClick={handleDeletePlayer} className="w-full bg-[#FF4D4D]/10 text-[#FF4D4D] border border-[#FF4D4D]/30 font-black py-4 rounded-2xl uppercase tracking-widest hover:bg-[#FF4D4D] hover:text-white transition-all flex items-center justify-center gap-2">
                             <Trash2 size={16} /> <LangHover en="Delete Account" pt="Apagar Conta" />
                         </button>
                    </div>
                </div>
            </div>
        )}

        {showPodcastModal && (
          <div className="fixed inset-0 bg-black/98 z-[999] flex items-center justify-center p-6 backdrop-blur-3xl">
             <div className="w-full max-md bg-[#131D33] rounded-[3rem] p-10 border border-[#0CB87A]/30 shadow-2xl animate-in zoom-in-95 flex flex-col items-center relative transition-all">
                <button onClick={() => { setShowPodcastModal(false); setPodcastStatus("idle"); if (podcastAudioUrl) URL.revokeObjectURL(podcastAudioUrl); setPodcastAudioUrl(null); }} className="absolute top-8 right-8 text-white/20 hover:text-white"><X/></button>
                <div className="w-20 h-20 rounded-full bg-[#0CB87A]/10 flex items-center justify-center text-[#0CB87A] mb-6 animate-pulse">
                    {podcastStatus === "playing" ? <Radio size={40} className="animate-bounce"/> : podcastStatus === "saved" ? <CheckCircle2 size={40}/> : <Headphones size={40}/>}
                </div>
                <h3 className="text-xl font-black uppercase tracking-widest mb-2 text-center text-white">LinCast</h3>
                <p className="text-xs font-bold text-[#0CB87A] uppercase tracking-widest mb-8 text-center">{activePodcastDeck}</p>

                {podcastStatus === "loading" && <Loader2 className="animate-spin text-white/20"/>}

                {podcastStatus === "idle" && (
                    <div className="w-full space-y-4">
                        <label className="text-[10px] font-black uppercase text-white/40 block text-center mb-2">Select Difficulty</label>
                        <div className="grid grid-cols-1 gap-2 mb-6">
                            {PODCAST_LEVELS.map(l => (
                                <button 
                                    key={l.id} 
                                    onClick={() => setPodcastLevel(l.id)} 
                                    className={`p-3 rounded-xl border text-left transition-all ${podcastLevel === l.id ? 'bg-[#0CB87A]/20 border-[#0CB87A] text-white' : 'bg-[#051115] border-white/5 text-white/40 hover:border-white/20'}`}
                                >
                                    <div className="flex justify-between items-center">
                                        <span className="font-black text-xs uppercase">{l.label}</span>
                                        <span className="text-[9px] font-bold opacity-60 bg-black/20 px-2 py-0.5 rounded">{l.id}</span>
                                    </div>
                                    <p className="text-[9px] opacity-60 mt-1 font-medium">{l.desc}</p>
                                </button>
                            ))}
                        </div>
                        <button onClick={() => handleGeneratePodcast(false)} className="w-full bg-[#0CB87A] text-[#051115] font-black py-4 rounded-2xl uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all">
                            Generate Episode
                        </button>
                    </div>
                )}

                {podcastStatus === "saved" && savedPodcastData && (
                     <div className="w-full flex flex-col items-center gap-4">
                        <div className="bg-[#0CB87A]/10 border border-[#0CB87A]/30 rounded-2xl p-4 w-full mb-2">
                            <div className="flex items-center gap-2 mb-2">
                                <CheckCircle2 size={14} className="text-[#0CB87A]"/>
                                <span className="text-[10px] font-black text-[#0CB87A] uppercase tracking-widest">Episode Saved</span>
                            </div>
                            <div className="flex justify-between items-center text-white/60 text-xs">
                                <span>Level: <span className="text-white font-bold">{savedPodcastData.level}</span></span>
                                <span>{new Date(savedPodcastData.createdAt).toLocaleDateString()}</span>
                            </div>
                        </div>
                        <button onClick={() => handleGeneratePodcast(true)} className="w-full bg-[#0CB87A] text-[#051115] font-black py-4 rounded-2xl uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all">
                            <Play size={18} fill="currentColor"/> Play Episode
                        </button>
                        <button onClick={deletePodcast} className="text-[10px] text-red-400 font-bold uppercase tracking-widest hover:text-red-300 mt-2 flex items-center gap-2">
                            <Trash2 size={12}/> Delete Saved Episode
                        </button>
                     </div>
                )}

                {podcastStatus === "scripting" && <div className="text-center"><Loader2 className="animate-spin text-white/20 mx-auto mb-4" size={32}/><p className="text-xs text-white/40 uppercase tracking-widest">Writing Script ({podcastLevel})...</p></div>}
                {podcastStatus === "synthesizing" && <div className="text-center"><Loader2 className="animate-spin text-[#0CB87A] mx-auto mb-4" size={32}/><p className="text-xs text-[#0CB87A] uppercase tracking-widest">Recording Audio...</p></div>}
                
                {podcastStatus === "playing" && podcastAudioUrl && (
                    <div className="w-full flex flex-col gap-4 animate-in fade-in">
                        <div className="bg-black/40 rounded-2xl p-4 border border-white/5 relative overflow-hidden">
                             <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none gap-1">
                                 {[...Array(20)].map((_,i) => <div key={i} className="w-1 bg-[#0CB87A] h-full animate-pulse" style={{animationDelay: `${i * 0.1}s`, height: `${Math.random() * 100}%`}}/>)}
                             </div>
                             <audio controls src={podcastAudioUrl} autoPlay className="w-full relative z-10" />
                        </div>
                        <a href={podcastAudioUrl} download={`LinCast_${activePodcastDeck}_${savedPodcastData?.level || podcastLevel}.wav`} className="text-center text-[10px] text-white/40 hover:text-[#0CB87A] uppercase tracking-widest mt-4 flex items-center justify-center gap-2">
                            <Download size={14}/> Download WAV
                        </a>
                        <button onClick={() => setPodcastStatus("saved")} className="text-[10px] text-white/20 hover:text-white uppercase tracking-widest mt-2">Back to Menu</button>
                    </div>
                )}

                {podcastStatus === "error" && <p className="text-red-500 font-bold uppercase text-xs">Generation Failed</p>}
             </div>
          </div>
        )}

        {showAIDeckModal && (
          <div className="fixed inset-0 bg-black/98 z-[999] flex items-center justify-center p-6 backdrop-blur-3xl">
             <div className="w-full max-w-lg bg-[#131D33] rounded-[3rem] p-10 border border-[#0CB87A]/30 shadow-2xl animate-in zoom-in-95">
                <div className="relative flex items-center justify-center mb-10 px-8">
                    <LangHover en="AI Deck Wizard" pt="Mago de Baralho IA" className="text-xl font-black uppercase text-[#0CB87A] text-center" />
                    <button onClick={() => setShowAIDeckModal(false)} className="absolute right-0 text-white/20 hover:text-white"><X size={24}/></button>
                </div>
                <textarea value={aiDeckPrompt} onChange={e => setAiDeckPrompt(e.target.value)} className="w-full bg-[#051115] border border-[#1A4B57] rounded-2xl p-4 text-white text-sm outline-none h-32 mb-6" placeholder="Describe the deck (e.g., 20 phrasal verbs for travel)..." />
                <button onClick={handleGenerateAIDeck} disabled={isMagicLoading} className="w-full bg-[#0CB87A] text-[#051115] font-black py-5 rounded-full uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2">{isMagicLoading ? <Loader2 className="animate-spin" size={20}/> : <LangHover en="Generate Deck" pt="Gerar Baralho" />}</button>
                <button onClick={() => setShowAIDeckModal(false)} className="w-full mt-4 text-[10px] text-white/20 uppercase font-black tracking-widest hover:text-white transition-all"><LangHover en="Cancel" pt="Cancelar" /></button>
             </div>
          </div>
        )}

        {showAddDeckModal && (
          <div className="fixed inset-0 bg-black/98 z-[999] flex items-center justify-center p-6 backdrop-blur-3xl">
             <div className="w-full max-sm bg-[#131D33] rounded-[3rem] p-10 border border-[#0CB87A]/30 shadow-2xl animate-in zoom-in-95">
                <div className="relative flex items-center justify-center mb-10 px-8">
                    <LangHover en="New Deck" pt="Novo Baralho" className="text-xl font-black uppercase text-center" />
                    <button onClick={() => { setTempDeckName(""); setShowAddDeckModal(false); }} className="absolute right-0 text-white/20 hover:text-white"><X size={24}/></button>
                </div>
                <input type="text" value={tempDeckName} onChange={e => setTempDeckName(e.target.value)} className="w-full bg-[#051115] border-b-2 border-white/10 p-4 text-white outline-none focus:border-[#0CB87A] mb-8" placeholder="Deck Name..." />
                <button onClick={async () => { 
                    if (!tempDeckName.trim()) return; 
                    const decks = { ...selectedPlayer.decks, [tempDeckName]: [] }; 
                    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', selectedPlayer.id), { decks }); 
                    setTempDeckName(""); 
                    setShowAddDeckModal(false); 
                }} className="w-full bg-[#0CB87A] text-[#051115] font-black py-4 rounded-full uppercase"><LangHover en="Create" pt="Criar" /></button>
                <button onClick={() => { setTempDeckName(""); setShowAddDeckModal(false); }} className="w-full mt-4 text-[10px] text-white/20 uppercase font-black tracking-widest hover:text-white transition-all"><LangHover en="Cancel" pt="Cancelar" /></button>
             </div>
          </div>
        )}

        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/98 z-[999] flex items-center justify-center p-6 backdrop-blur-3xl">
             <div className="w-full max-sm bg-[#131D33] rounded-[3rem] p-10 border border-[#FF4D4D]/30 shadow-2xl animate-in zoom-in-95">
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-[#FF4D4D]/10 rounded-full flex items-center justify-center text-[#FF4D4D] mb-6">
                    <AlertTriangle size={32} />
                  </div>
                  <LangHover en="Delete Deck?" pt="Excluir Baralho?" className="text-xl font-black uppercase mb-4 text-white block" />
                  <p className="text-sm text-white/40 mb-10 leading-relaxed">
                    Are you sure you want to delete <span className="text-white font-bold">"{activeDeckName}"</span>? This action will also remove its cards from <span className="text-white font-bold">"All Cards"</span>.
                  </p>
                  <div className="flex flex-col w-full gap-3">
                    <button onClick={handleDeleteDeck} className="w-full bg-[#FF4D4D] text-white font-black py-4 rounded-full uppercase tracking-widest active:scale-95 transition-all">
                      <LangHover en="Yes, Delete Everything" pt="Sim, Excluir Tudo" />
                    </button>
                    <button onClick={() => setShowDeleteModal(false)} className="w-full bg-white/5 text-white/40 font-black py-4 rounded-full uppercase tracking-widest active:scale-95 transition-all">
                      <LangHover en="Cancel" pt="Cancelar" />
                    </button>
                  </div>
                </div>
             </div>
          </div>
        )}

        {showRenameModal && (
          <div className="fixed inset-0 bg-black/98 z-[999] flex items-center justify-center p-6 backdrop-blur-3xl">
             <div className="w-full max-sm bg-[#131D33] rounded-[3rem] p-10 border border-[#0CB87A]/30 shadow-2xl animate-in zoom-in-95">
                <div className="relative flex items-center justify-center mb-10 px-8">
                    <LangHover en="Rename Deck" pt="Renomear Baralho" className="text-xl font-black uppercase text-center" />
                    <button onClick={() => { setTempDeckName(""); setShowRenameModal(false); }} className="absolute right-0 text-white/20 hover:text-white"><X size={24}/></button>
                </div>
                <input type="text" value={tempDeckName} onChange={e => setTempDeckName(e.target.value)} className="w-full bg-[#051115] border-b-2 border-white/10 p-4 text-white outline-none focus:border-[#0CB87A] mb-8" placeholder="New Name..." />
                <button onClick={async () => { 
                  if (!tempDeckName.trim()) return; 
                  const decks = { ...selectedPlayer.decks };
                  decks[tempDeckName] = decks[activeDeckName];
                  delete decks[activeDeckName];
                  await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', selectedPlayer.id), { decks });
                  setActiveDeckName(tempDeckName);
                  setShowRenameModal(false);
                }} className="w-full bg-[#0CB87A] text-[#051115] font-black py-4 rounded-full uppercase"><LangHover en="Update" pt="Atualizar" /></button>
                <button onClick={() => { setTempDeckName(""); setShowRenameModal(false); }} className="w-full mt-4 text-[10px] text-white/20 uppercase font-black tracking-widest hover:text-white transition-all"><LangHover en="Cancel" pt="Cancelar" /></button>
             </div>
          </div>
        )}

        {showAddCard && (
          <div className="fixed inset-0 bg-black/95 z-[999] flex flex-col items-center justify-center p-8 backdrop-blur-xl overflow-y-auto">
            <div className="w-full max-w-5xl flex flex-col gap-6 my-auto animate-in zoom-in-95">
               <header className="relative flex items-center justify-center px-4 mb-4">
                  <LangHover en="Card Editor" pt="Editor de Cartas" className="text-2xl font-light uppercase tracking-widest text-center" />
                  <button onClick={() => setShowAddCard(false)} className="absolute right-0 p-2 text-white/40 hover:text-white"><X size={32}/></button>
               </header>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8 min-h-[400px]">
                  <div className="bg-white rounded-[2.5rem] p-10 flex flex-col shadow-2xl"><CardRichEditor label="Trigger in English" ptLabel="Gatilho" value={cardForm.front} onChange={v => setCardForm({...cardForm, front: v})} placeholder="Context sentence..." /><input type="text" value={cardForm.front_pt} onChange={e => setCardForm({...cardForm, front_pt: e.target.value})} className="mt-4 border-b border-gray-100 text-xs text-gray-400 outline-none" placeholder="Translation..." /></div>
                  <div className="bg-white rounded-[2.5rem] p-10 flex flex-col shadow-2xl gap-6">
                     <div className="relative"><label className="text-[10px] font-black text-black/30 uppercase block mb-1">Target Word</label><input type="text" value={cardForm.targetVocab} onChange={e => setCardForm({...cardForm, targetVocab: e.target.value})} onBlur={handleMagicFill} className="w-full border-b-2 border-gray-100 focus:border-[#0CB87A] text-2xl font-black text-black outline-none pb-2" /><button onClick={handleMagicFill} className="absolute right-0 bottom-2 text-gray-200 hover:text-[#0CB87A]"><Sparkles/></button></div>
                     <div><label className="text-[10px] font-black text-black/30 uppercase block mb-1">Pronunciation</label><input type="text" value={cardForm.phonetic} onChange={e => setCardForm({...cardForm, phonetic: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 font-bold text-gray-700 outline-none" /></div>
                     <div className="flex-1"><CardRichEditor label="Simple Example" ptLabel="Exemplo" value={cardForm.sentenceBack} onChange={v => setCardForm({...cardForm, sentenceBack: v})} placeholder="Example sentence..." /><input type="text" value={cardForm.sentenceBack_pt} onChange={e => setCardForm({...cardForm, sentenceBack_pt: e.target.value})} className="mt-2 border-b border-gray-100 text-xs text-gray-400 outline-none" placeholder="Translation..." /></div>
                  </div>
               </div>
               <button onClick={handleSaveCard} className="w-full bg-[#0CB87A] text-[#051115] font-black py-6 rounded-3xl uppercase tracking-widest shadow-2xl active:scale-95 transition-all"><LangHover en="Save Card" pt="Salvar Carta" /></button>
            </div>
          </div>
        )}

        <style dangerouslySetInnerHTML={{ __html: `
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
          .font-sans { font-family: 'Inter', sans-serif; }
          .scrollbar-hide::-webkit-scrollbar { display: none; }
          .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
          .animate-in { animation: fade-in 0.4s ease-out forwards; }
          .transform-style-3d { transform-style: preserve-3d; }
          .backface-hidden { backface-visibility: hidden; }
          .rotate-y-180 { transform: rotateY(180deg); }
          .perspective-1000 { perspective: 1000px; }
        `}} />
      </div>
    </TranslationContext.Provider>
  );
}
