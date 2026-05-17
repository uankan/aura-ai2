import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, Upload, Sparkles, User, ShoppingBag, Menu, X, ArrowRight, Zap, Globe, Github, LogOut, History, Bookmark, Check, MessageSquare, Send, Bot, ThumbsDown, Heart, Coins } from 'lucide-react';
import { analyzeFashionPhoto, chatWithStylist } from './lib/gemini';
import { resizeImage } from './lib/imageUtils';
import { auth, loginWithGoogle, db, OperationType, handleFirestoreError } from './lib/firebase';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { collection, addDoc, query, where, getDocs, serverTimestamp, setDoc, doc, deleteDoc } from 'firebase/firestore';

// --- Types ---
interface AnalysisResult {
  styleProfile: {
    faceShape: string;
    skinTone: string;
    hairStyle: string;
    fashionAesthetic: string;
    bodyStructure: string;
    confidenceVibe: string;
    fashionScore: number;
  };
  recommendations: Array<{
    category: string;
    itemType: string;
    description: string;
    material: string;
    occasion: string;
    colorSuggestions: string[];
    colorPalette: string[];
    priceINR: string;
    priceValue: number;
    whySuggested: string;
    shoppingLink: string;
    imageUrl: string;
    matchScore: number;
    tags: string[];
  }>;
  overallSuggestions: string[];
}

interface QuizResults {
  philosophy: string;
  colorPalette: string;
  silhouette: string;
  environment: string;
  influence: string;
}

const FilterControls: React.FC<{
  recommendations: AnalysisResult['recommendations'];
  onFilterChange: (filtered: AnalysisResult['recommendations']) => void;
}> = ({ recommendations, onFilterChange }) => {
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [selectedMaterial, setSelectedMaterial] = useState<string>("All");
  const [selectedOccasion, setSelectedOccasion] = useState<string>("All");

  const materials = ["All", ...new Set(recommendations.map(r => r.material))];
  const occasions = ["All", ...new Set(recommendations.map(r => r.occasion))];
  const maxPrice = Math.max(...recommendations.map(r => r.priceValue || 0), 5000);

  useEffect(() => {
    const filtered = recommendations.filter(item => {
      const matchesPrice = item.priceValue >= priceRange[0] && item.priceValue <= priceRange[1];
      const matchesMaterial = selectedMaterial === "All" || item.material === selectedMaterial;
      const matchesOccasion = selectedOccasion === "All" || item.occasion === selectedOccasion;
      return matchesPrice && matchesMaterial && matchesOccasion;
    });
    onFilterChange(filtered);
  }, [priceRange, selectedMaterial, selectedOccasion, recommendations]);

  return (
    <div className="glass-morphism rounded-[32px] p-8 mb-12 border border-white/5 space-y-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Price Range */}
        <div className="flex-1 space-y-4">
          <div className="flex justify-between items-center">
            <label className="text-[10px] uppercase font-black tracking-widest text-gold">Price Threshold (₹)</label>
            <span className="text-[10px] font-bold text-white/60">Under ₹{priceRange[1]}</span>
          </div>
          <input 
            type="range" 
            min="0" 
            max={maxPrice}
            step="500"
            value={priceRange[1]}
            onChange={(e) => setPriceRange([0, parseInt(e.target.value)])}
            className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-gold"
          />
        </div>

        {/* Material Filter */}
        <div className="flex-1 space-y-4">
          <label className="text-[10px] uppercase font-black tracking-widest text-gold block">Fabric Identity</label>
          <div className="flex flex-wrap gap-2">
            {materials.map(m => (
              <button
                key={m}
                onClick={() => setSelectedMaterial(m)}
                className={`px-4 py-2 rounded-full text-[9px] uppercase font-bold tracking-tighter transition-all border ${
                  selectedMaterial === m 
                    ? 'bg-gold text-luxury-black border-gold shadow-lg shadow-gold/20' 
                    : 'bg-white/5 border-white/10 text-white/40 hover:text-white hover:border-white/30'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Occasion Filter */}
        <div className="flex-1 space-y-4">
          <label className="text-[10px] uppercase font-black tracking-widest text-gold block">Protocol / Occasion</label>
          <div className="flex flex-wrap gap-2">
            {occasions.map(o => (
              <button
                key={o}
                onClick={() => setSelectedOccasion(o)}
                className={`px-4 py-2 rounded-full text-[9px] uppercase font-bold tracking-tighter transition-all border ${
                  selectedOccasion === o 
                    ? 'bg-gold text-luxury-black border-gold shadow-lg shadow-gold/20' 
                    : 'bg-white/5 border-white/10 text-white/40 hover:text-white hover:border-white/30'
                }`}
              >
                {o}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Components ---

const Navbar = ({ user, userData, onViewHistory, onToggleTrending, onViewProfile, view }: { user: FirebaseUser | null, userData: any, onViewHistory: () => void, onToggleTrending: () => void, onViewProfile: () => void, view: string }) => (
  <nav id="navbar" className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-6 glass-morphism">
    <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.location.reload()}>
      <div className="w-8 h-8 rounded-full bg-gold flex items-center justify-center font-display font-black text-luxury-black">A</div>
      <span className="font-display text-2xl font-bold tracking-tighter uppercase italic">Aura AI</span>
    </div>
    <div className="hidden md:flex items-center gap-8 text-sm font-medium tracking-widest uppercase opacity-70">
      <a href="#" onClick={(e) => { e.preventDefault(); window.location.reload(); }} className={`hover:text-gold transition-colors ${view === 'main' ? 'text-gold' : ''}`}>Experience</a>
      {user && (
        <>
          <a href="#" onClick={(e) => { e.preventDefault(); onViewHistory(); }} className={`hover:text-gold transition-colors ${view === 'history' ? 'text-gold' : ''}`}>My Archive</a>
          <a href="#" onClick={(e) => { e.preventDefault(); onViewProfile(); }} className={`hover:text-gold transition-colors ${view === 'profile' ? 'text-gold' : ''}`}>Profile</a>
        </>
      )}
      <a href="#" onClick={(e) => { e.preventDefault(); onToggleTrending(); }} className={`hover:text-gold transition-colors ${view === 'trending' ? 'text-gold' : ''}`}>Trends</a>
    </div>
    
    <div className="flex items-center gap-4">
      {user ? (
        <div className="flex items-center gap-4">
          <button 
            onClick={onViewProfile}
            className="flex items-center gap-3 group text-right hover:opacity-80 transition-all"
          >
            <div className="hidden md:block">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Stylist Account</p>
              <p className="text-xs font-bold">{userData?.displayName || user.displayName || 'Architect'}</p>
            </div>
            {(userData?.photoURL || user.photoURL) ? (
              <img src={userData?.photoURL || user.photoURL || ''} alt="Avatar" className="w-10 h-10 rounded-full border border-gold/30 group-hover:border-gold object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center text-gold group-hover:border-gold">
                <User size={20} />
              </div>
            )}
          </button>
          <button 
            onClick={() => signOut(auth)}
            className="p-2 rounded-full border border-white/10 hover:bg-white/5 text-white/60 transition-all"
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      ) : (
        <button 
          onClick={async () => {
            try {
              await loginWithGoogle();
            } catch (err) {
              console.error("Manual login trigger failed", err);
            }
          }}
          className="px-6 py-2 rounded-full border border-gold/50 text-gold text-xs font-bold uppercase tracking-widest hover:bg-gold hover:text-luxury-black transition-all"
        >
          Initialize Auth
        </button>
      )}
    </div>
  </nav>
);

const Hero: React.FC<{ onStart: () => void }> = ({ onStart }) => (
  <section id="hero" className="relative min-h-screen flex flex-col items-center justify-center pt-20 px-4 overflow-hidden">
    <div id="hero-bg" className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-gold/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-gold/5 rounded-full blur-[150px]" />
    </div>

    <motion.div 
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1 }}
      className="relative z-10 text-center max-w-4xl"
    >
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 mb-8">
        <Sparkles size={14} className="text-gold" />
        <span className="text-[10px] uppercase tracking-[0.3em] font-semibold text-luxury-white/60">New Age of Personal Shopping</span>
      </div>
      
      <h1 className="font-display text-7xl md:text-[140px] leading-[0.85] font-black tracking-tighter italic uppercase mb-8">
        Style your <br />
        <span className="text-gold">Reality.</span>
      </h1>
      
      <p className="text-lg md:text-xl text-luxury-white/50 max-w-2xl mx-auto mb-12 font-light leading-relaxed">
        Upload a silhouette of your current style. Our Vision AI decodes your aesthetic DNA to architect a wardrobe that matches your ambition.
      </p>

      <div className="flex flex-col md:row items-center gap-6 justify-center">
        <button 
          onClick={onStart}
          className="group relative px-12 py-5 bg-gold text-luxury-black font-black uppercase tracking-[0.2em] rounded-full overflow-hidden transition-all hover:scale-105 active:scale-95"
        >
          <span className="relative z-10 flex items-center gap-3">
            Start Analysis <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </span>
          <div className="absolute inset-x-0 bottom-0 h-1 bg-black/20" />
        </button>
        
        <button 
          onClick={() => {
            // This is a bit of a hack since Hero only has onStart, 
            // but we can pass a special onViewTrends prop or just use window.dispatch if needed.
            // For now, I'll update the Hero component props.
            (window as any).viewTrends();
          }}
          className="px-12 py-5 border border-white/20 text-white font-black uppercase tracking-[0.2em] rounded-full hover:bg-white/5 transition-all"
        >
          Explore Trends
        </button>
      </div>
    </motion.div>

    <div className="absolute bottom-10 left-10 flex gap-6 text-[10px] font-bold tracking-[0.4em] uppercase opacity-30">
      <span>01 / VISON</span>
      <span>02 / STYLE</span>
      <span>03 / SHOP</span>
    </div>
  </section>
);

const AnalysisLoader: React.FC = () => (
  <div className="flex flex-col items-center justify-center gap-8 py-20 min-h-[60vh]">
    <div className="relative w-32 h-32">
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        className="w-full h-full border-4 border-gold/20 border-t-gold rounded-full"
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <Sparkles size={32} className="text-gold animate-pulse" />
      </div>
    </div>
    <div className="text-center">
      <motion.h3 
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        className="text-xl font-display uppercase tracking-widest italic"
      >
        Architecting Your Aesthetic...
      </motion.h3>
      <p className="text-white/40 mt-2 text-sm">Decoding fiber compatibility & silhouette structure</p>
    </div>
  </div>
);

const RecommendationCard: React.FC<{ 
  item: any; 
  index?: number; 
  onFeedback?: (itemTitle: string, type: 'not_my_style' | 'too_expensive' | 'love') => void;
}> = ({ item, index = 0, onFeedback }) => {
  const [feedbackGiven, setFeedbackGiven] = useState<'not_my_style' | 'too_expensive' | 'love' | null>(null);

  const handleFeedback = (type: 'not_my_style' | 'too_expensive' | 'love') => {
    setFeedbackGiven(type);
    if (onFeedback) {
      onFeedback(item.title || item.itemType || "Unknown Item", type);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      whileHover={{ 
        y: -12, 
        scale: 1.02,
        boxShadow: "0 20px 40px rgba(212, 175, 55, 0.15)"
      }}
      className="glass-morphism rounded-3xl overflow-hidden group border border-white/5 hover:border-gold/40 transition-all duration-500"
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-white/5">
        <motion.img 
          src={item.image || item.imageUrl} 
          alt={item.title || item.itemType} 
          className="w-full h-full object-cover grayscale transition-all duration-1000 group-hover:grayscale-0 group-hover:scale-110" 
          referrerPolicy="no-referrer"
        />
        
        {/* Feedback Bar */}
        <div className="absolute -bottom-1 top-auto inset-x-0 flex justify-center gap-2 p-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-4 group-hover:translate-y-0 z-20">
          <button 
            onClick={(e) => { e.preventDefault(); handleFeedback('not_my_style'); }}
            className={`p-2 rounded-full backdrop-blur-xl border transition-all ${feedbackGiven === 'not_my_style' ? 'bg-red-500 border-red-500 text-white' : 'bg-black/60 border-white/10 text-white/60 hover:text-white hover:border-white/30'}`}
            title="Not my style"
          >
            <ThumbsDown size={14} />
          </button>
          <button 
            onClick={(e) => { e.preventDefault(); handleFeedback('too_expensive'); }}
            className={`p-2 rounded-full backdrop-blur-xl border transition-all ${feedbackGiven === 'too_expensive' ? 'bg-orange-500 border-orange-500 text-white' : 'bg-black/60 border-white/10 text-white/60 hover:text-white hover:border-white/30'}`}
            title="Too expensive"
          >
            <Coins size={14} />
          </button>
          <button 
            onClick={(e) => { e.preventDefault(); handleFeedback('love'); }}
            className={`p-2 rounded-full backdrop-blur-xl border transition-all ${feedbackGiven === 'love' ? 'bg-gold border-gold text-luxury-black' : 'bg-black/60 border-white/10 text-white/60 hover:text-white hover:border-white/30'}`}
            title="Love this"
          >
            <Heart size={14} />
          </button>
        </div>

        {/* Glossy Overlay on Hover */}
      <div className="absolute inset-0 bg-gradient-to-t from-luxury-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="absolute top-4 right-4 bg-luxury-black/80 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black italic uppercase border border-white/10 text-gold transform translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
        {item.matchScore}% Match
      </div>
      
      {/* Color Palette Overlay */}
      <div className="absolute bottom-4 left-4 flex gap-1.5 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-700">
        {item.colorPalette?.map((color: string, i: number) => (
          <motion.div 
            key={i}
            whileHover={{ scale: 1.4, zIndex: 10 }}
            className="w-5 h-5 rounded-full border border-white/20 shadow-lg cursor-pointer"
            style={{ backgroundColor: color }}
            title={color}
          />
        ))}
      </div>
    </div>
    
    <div className="p-6 relative">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h4 className="text-[9px] font-bold text-white/40 uppercase tracking-[0.3em] mb-1 group-hover:text-gold/50 transition-colors">{item.brand}</h4>
          <h3 className="font-display text-xl group-hover:italic transition-all duration-300">{item.title}</h3>
        </div>
        <span className="text-gold font-bold group-hover:scale-110 transition-transform">{item.price}</span>
      </div>
      
      <p className="text-[11px] text-white/50 mb-4 line-clamp-2 italic group-hover:text-white/70 transition-colors">{item.description}</p>
      
      {item.whySuggested && (
        <motion.div 
          initial={{ opacity: 0.6 }}
          whileHover={{ opacity: 1 }}
          className="mb-4 p-3 bg-gold/5 rounded-xl border border-gold/10 group-hover:bg-gold/10 transition-all"
        >
          <p className="text-[10px] text-gold/80 italic leading-relaxed">
            <span className="font-bold uppercase tracking-tighter mr-2 text-[8px] border border-gold/30 px-1 rounded">Stylist Note</span>
            {item.whySuggested}
          </p>
        </motion.div>
      )}

      <div className="flex flex-wrap gap-2 mt-4">
        {item.tags?.map((tag: string, i: number) => (
          <motion.span 
            key={tag}
            whileHover={{ y: -3, backgroundColor: "rgba(212, 175, 55, 0.2)", color: "white" }}
            className="text-[9px] uppercase tracking-tighter px-2 py-1 bg-white/5 rounded-md text-white/60 cursor-default transition-colors"
          >
            {tag}
          </motion.span>
        ))}
      </div>
      
      <div className="mt-6">
        <motion.a 
          href={item.shoppingLink} 
          target="_blank" 
          rel="noopener noreferrer"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative overflow-hidden block w-full py-3 rounded-xl border transition-all font-bold text-center text-[10px] uppercase tracking-[0.3em] bg-gold text-luxury-black border-gold shadow-[0_0_20px_rgba(212,175,55,0.1)] group-hover:shadow-[0_0_30px_rgba(212,175,55,0.3)]"
        >
          <span className="relative z-10">Acquire Now</span>
          <motion.div 
            className="absolute inset-0 bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-[200%] transition-transform duration-1000"
          />
        </motion.a>
      </div>
    </div>
  </motion.div>
  );
};

const StylistChat = ({ isOpen, onClose, analysis }: { isOpen: boolean, onClose: () => void, analysis: AnalysisResult | null }) => {
  const [messages, setMessages] = useState<{ role: 'user' | 'model', content: string }[]>([
    { role: 'model', content: "Greetings. I am Aura, your personal fashion architect. How may I assist your style journey today?" }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input;
    setInput("");
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsTyping(true);

    try {
      const context = analysis ? `The user's aesthetic is ${analysis.styleProfile.fashionAesthetic} with a score of ${analysis.styleProfile.fashionScore}.` : "";
      const reply = await chatWithStylist(userMsg, messages, context);
      setMessages(prev => [...prev, { role: 'model', content: reply || "I apologize, my creative circuits encountered a ripple in the aesthetic field." }]);
    } catch (error) {
      console.error("Chat error:", error);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="fixed bottom-24 right-8 w-[380px] h-[550px] glass-morphism rounded-[32px] border border-gold/30 shadow-2xl z-[100] flex flex-col overflow-hidden"
        >
          <div className="p-6 border-b border-white/5 flex justify-between items-center bg-gold/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gold flex items-center justify-center">
                <Bot size={20} className="text-luxury-black" />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold italic">Aura Stylist</h3>
                <span className="text-[8px] uppercase tracking-widest text-gold animate-pulse">Syncing Trends...</span>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
              <X size={20} className="text-white/40" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-gold text-luxury-black font-medium' 
                    : 'bg-white/5 text-white/80 border border-white/5 italic'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex gap-1">
                  <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1 h-1 bg-gold rounded-full" />
                  <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1 h-1 bg-gold rounded-full" />
                  <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1 h-1 bg-gold rounded-full" />
                </div>
              </div>
            )}
          </div>

          <div className="p-6 border-t border-white/5 bg-luxury-black/50">
            <div className="relative">
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask Aura about your look..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-4 pr-12 text-sm focus:outline-none focus:border-gold/50 transition-colors"
              />
              <button 
                onClick={handleSend}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gold hover:scale-110 transition-transform"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const CameraCapture = ({ onCapture, onCancel }: { onCapture: (base64: string) => void, onCancel: () => void }) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const [isStarted, setIsStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      streamRef.current = mediaStream;
      setIsStarted(true);
      // We need to wait for the next render cycle so videoRef.current is available
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      }, 100);
    } catch (err) {
      setError("Camera access denied or not available. Please ensure permissions are granted.");
      console.error("Camera error:", err);
    }
  };

  const capture = async () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const base64 = canvas.toDataURL('image/jpeg');
        const resized = await resizeImage(base64, 1024, 1024);
        onCapture(resized);
      }
    }
  };

  return (
    <div className="relative w-full max-w-xl aspect-video rounded-[40px] overflow-hidden glass-morphism border border-gold/30">
      {error ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-luxury-black/90">
          <p className="text-red-400 mb-6 text-sm">{error}</p>
          <button onClick={onCancel} className="px-6 py-2 rounded-full border border-white/20 text-xs uppercase font-bold tracking-widest hover:bg-white/5 transition-all">Go Back</button>
        </div>
      ) : !isStarted ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-luxury-black/90 group">
          <div className="p-6 rounded-full bg-gold/10 border border-gold/20 mb-6 group-hover:scale-110 transition-transform">
            <Camera size={40} className="text-gold" />
          </div>
          <h3 className="text-xl font-display italic mb-2 uppercase tracking-widest">Ready to capture?</h3>
          <p className="text-white/40 text-[10px] uppercase tracking-[0.2em] mb-8 max-w-xs leading-relaxed">
            Architect your style Archetype in real-time. Camera access required for silhouette analysis.
          </p>
          <div className="flex gap-4">
            <button 
              onClick={onCancel} 
              className="px-8 py-3 rounded-full border border-white/10 text-[10px] uppercase font-black tracking-[0.2em] hover:bg-white/5 transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={startCamera} 
              className="px-8 py-3 rounded-full bg-gold text-luxury-black text-[10px] uppercase font-black tracking-[0.2em] hover:scale-105 transition-all shadow-[0_0_30px_rgba(212,175,55,0.3)]"
            >
              Start Session
            </button>
          </div>
        </div>
      ) : (
        <>
          <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
          <canvas ref={canvasRef} className="hidden" />
          
          <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-6 z-10">
            <button 
              onClick={onCancel}
              className="p-4 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all backdrop-blur-md border border-white/10"
              title="Cancel"
            >
              <X size={24} />
            </button>
            <button 
              onClick={capture}
              className="w-16 h-16 rounded-full bg-gold text-luxury-black flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-2xl border-4 border-white/20"
              title="Capture Photo"
            >
              <Camera size={32} />
            </button>
          </div>
          
          <div className="absolute top-6 left-6 px-4 py-2 rounded-full bg-gold/80 backdrop-blur-md text-luxury-black text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" /> Live View
          </div>
        </>
      )}
    </div>
  );
};

const StyleQuiz = ({ onComplete, onCancel }: { onComplete: (results: QuizResults) => void, onCancel: () => void }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Partial<QuizResults>>({});

  const questions = [
    {
      id: 'philosophy',
      title: "Archetypal Philosophy",
      subtitle: "How do you perceive the architecture of your wardrobe?",
      options: [
        { value: 'Minimalist', label: 'Essentialist', desc: 'Stripped to the essence. Pure function.' },
        { value: 'Maximalist', label: 'Baroque', desc: 'More is more. Expressive complexity.' },
        { value: 'Avant-Garde', label: 'Boundary-Pusher', desc: 'Conceptual. Defying conventions.' },
        { value: 'Classic', label: 'Timeless', desc: 'Enduring silhouettes. Heritage focus.' }
      ]
    },
    {
      id: 'colorPalette',
      title: "Chromatic Aura",
      subtitle: "Which spectrum of light defines your presence?",
      options: [
        { value: 'Monochrome', label: 'Shadow & Light', desc: 'Grayscale dominance. Absolute blacks.' },
        { value: 'Earth Tones', label: 'Terrestrial', desc: 'Natural pigments. Organic warmth.' },
        { value: 'Vibrant', label: 'Eletric', desc: 'Saturated focus. High-energy primaries.' },
        { value: 'Pastel', label: 'Soft Spectrum', desc: 'Muted tones. Gentle presence.' }
      ]
    },
    {
      id: 'silhouette',
      title: "Structural Silhouette",
      subtitle: "How does the fabric interact with your frame?",
      options: [
        { value: 'Tailored', label: 'Precision', desc: 'Sharp edges. Defined shoulders.' },
        { value: 'Oversized', label: 'Flow', desc: 'Draped volumes. Relaxed contours.' },
        { value: 'Athletic', label: 'Dynamic', desc: 'Performance-driven. Streamlined.' },
        { value: 'Boxy', label: 'Angular', desc: 'Geometric. Stiff structural integrity.' }
      ]
    },
    {
      id: 'environment',
      title: "Operational Environment",
      subtitle: "Where does your style navigate most often?",
      options: [
        { value: 'Corporate', label: 'The Grid', desc: 'Professional monoliths. Status-driven.' },
        { value: 'Creative', label: 'The Studio', desc: 'Expressive freedom. Idea-centric.' },
        { value: 'Urban', label: 'The Street', desc: 'Concrete jungles. Adaptive utility.' },
        { value: 'Transit', label: 'The Terminal', desc: 'Constant movement. Travel-ready.' }
      ]
    },
    {
      id: 'influence',
      title: "Stylistic Influence",
      subtitle: "Which era or movement fuels your inspiration?",
      options: [
        { value: 'Quiet Luxury', label: 'Stealth', desc: 'Understated power. No branding.' },
        { value: 'Futurism', label: 'Next-Gen', desc: 'Tech-integrated. Sub-cultural edge.' },
        { value: 'Retro', label: 'Revivalist', desc: 'Nostalgic precision. 90s/80s energy.' },
        { value: 'Technical', label: 'Tactical', desc: 'Military roots. Performance materials.' }
      ]
    }
  ];

  const handleSelect = (value: string) => {
    const questionId = questions[currentQuestion].id as keyof QuizResults;
    const newAnswers = { ...answers, [questionId]: value };
    setAnswers(newAnswers);

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      onComplete(newAnswers as QuizResults);
    }
  };

  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen flex items-center justify-center pt-32 pb-20 px-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-3xl glass-morphism rounded-[40px] border border-gold/30 p-12 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-gold shadow-[0_0_20px_rgba(212,175,55,0.5)]"
          />
        </div>

        <div className="flex justify-between items-center mb-12">
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-gold">Aura Profile Synthesis: 0{currentQuestion + 1}</span>
          <button onClick={onCancel} className="text-white/20 hover:text-red-400 transition-colors uppercase text-[10px] font-bold tracking-widest">Abort Sequencing</button>
        </div>

        <AnimatePresence mode="wait">
          <motion.div 
            key={currentQuestion}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-12"
          >
            <div>
              <h2 className="font-display text-5xl italic font-black uppercase mb-3">
                {questions[currentQuestion].title}
              </h2>
              <p className="text-white/40 uppercase tracking-widest text-xs font-medium">{questions[currentQuestion].subtitle}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {questions[currentQuestion].options.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  className="group p-6 text-left glass-morphism rounded-3xl border border-white/5 hover:border-gold/50 transition-all duration-300 relative overflow-hidden"
                >
                  <div className="relative z-10">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/30 group-hover:text-gold/60 block mb-2">{option.label}</span>
                    <span className="text-lg font-bold block mb-2 group-hover:text-white transition-colors">{option.value}</span>
                    <span className="text-[11px] text-white/30 group-hover:text-white/50 leading-relaxed block">{option.desc}</span>
                  </div>
                  <div className="absolute inset-0 bg-gold/0 group-hover:bg-gold/5 transition-colors" />
                </button>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="mt-12 flex justify-between items-center opacity-30 text-[10px] font-black uppercase tracking-widest">
          <span>AI Protocol: Personalization Stage</span>
          <span>Matrix Ver: 4.1.0</span>
        </div>
      </motion.div>
    </div>
  );
};

const TrendingView = ({ onFeedback }: { onFeedback: (itemTitle: string, type: 'not_my_style' | 'too_expensive' | 'love') => void }) => {
  const [activeCategory, setActiveCategory] = useState('Old Money');
  
  const categories = [
    { name: 'Old Money', icon: '🏛️' },
    { name: 'Streetwear', icon: '🏙️' },
    { name: 'Formal', icon: '🤵' },
    { name: 'Quiet Luxury', icon: '🤫' },
    { name: 'Party', icon: '🍾' }
  ];

  const trendData: Record<string, any[]> = {
    'Old Money': [
      {
        brand: "The Collective",
        title: "Linen Tailored Blazer",
        price: "₹8,990",
        image: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&q=80&w=600",
        matchScore: 98,
        description: "A staple for the timeless silhouette. Breathable Italian linen in oatmeal hue.",
        whySuggested: "Perfect for high-contrast profiles and structured shoulder silhouettes.",
        tags: ["Linen", "Tailored", "Timeless"],
        shoppingLink: "https://www.thecollective.in/products/linen-blazer-beige"
      },
      {
        brand: "Massimo Dutti",
        title: "Knit Cotton Polo",
        price: "₹4,590",
        image: "https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?auto=format&fit=crop&q=80&w=600",
        matchScore: 95,
        description: "Textured knit with refined collar details. Perfect for semi-formal layering.",
        whySuggested: "The weave adds depth to neutral palettes without compromising minimalism.",
        tags: ["Knit", "Textured", "Classic"],
        shoppingLink: "https://www.massimodutti.com/in/men/t-shirts-and-polos-c1745914.html"
      }
    ],
    'Streetwear': [
      {
        brand: "Superkicks",
        title: "Heavyweight Boxy Tee",
        price: "₹2,499",
        image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=600",
        matchScore: 92,
        description: "240 GSM organic cotton with a structured drop shoulder fit.",
        shoppingLink: "https://www.superkicks.in/collections/apparel"
      },
      {
        brand: "VegNonVeg",
        title: "Relaxed Cargo Trousers",
        price: "₹5,200",
        image: "https://images.unsplash.com/photo-1517441581617-38017e2e71da?auto=format&fit=crop&q=80&w=600",
        matchScore: 88,
        description: "Multi-pocket technical cargos for the urban landscape.",
        shoppingLink: "https://www.vegnonveg.com/apparel/pants"
      },
      {
        brand: "Almost Gods",
        title: "Embroidered Hoodie",
        price: "₹8,500",
        image: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=80&w=600",
        matchScore: 94,
        description: "Art-driven silhouette with heavy embroidery and oversized profile.",
        shoppingLink: "https://almostgods.com/"
      }
    ],
    'Formal': [
      {
        brand: "Raymond",
        title: "Slim Fit Tuxedo Shirt",
        price: "₹3,299",
        image: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&q=80&w=600",
        matchScore: 99,
        description: "Crisp white cotton with French cuffs. The foundation of black-tie excellence.",
        shoppingLink: "https://www.myntra.com/raymond-formal-shirts"
      },
      {
        brand: "Louis Philippe",
        title: "Silk Jacquard Tie",
        price: "₹1,999",
        image: "https://images.unsplash.com/photo-1598033129183-c4f50c7176c8?auto=format&fit=crop&q=80&w=600",
        matchScore: 90,
        description: "Subtle patterns for the modern executive. Pure mulberry silk.",
        shoppingLink: "https://www.louisphilippe.com/men-accessories-ties"
      }
    ],
    'Quiet Luxury': [
      {
        brand: "Loro Piana Style",
        title: "Cashmere Crewneck",
        price: "₹12,500",
        image: "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&q=80&w=600",
        matchScore: 97,
        description: "Unbranded excellence. Ultra-fine wool blend for the discerning eye.",
        shoppingLink: "https://www.ajio.com/men-sweaters-cardigans/c/830303011"
      },
      {
        brand: "Brunello Cucinelli",
        title: "Wool-Silk Trousers",
        price: "₹18,000",
        image: "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&q=80&w=600",
        matchScore: 95,
        description: "Masterful drape with natural fibers. Minimalist aesthetic, maximal quality.",
        shoppingLink: "https://www.thecollective.in/"
      }
    ],
    'Party': [
      {
        brand: "Zara Night",
        title: "Sequin Evening Shirt",
        price: "₹4,990",
        image: "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&q=80&w=600",
        matchScore: 94,
        description: "High-octane glamour for the after-hours circuit. Slim fit with subtle metallic sheen.",
        shoppingLink: "https://www.zara.com/in/en/man-party-l740.html"
      }
    ]
  };

  return (
    <motion.section 
      key="trending"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="pt-32 pb-20 px-8 container mx-auto"
    >
      <div className="mb-16 text-center">
        <h2 className="font-display text-6xl md:text-8xl uppercase italic font-black mb-4">
          The <span className="text-gold">Pulse</span> Report
        </h2>
        <p className="text-white/40 uppercase tracking-[0.4em] text-xs">Architectural trends from the global circuit</p>
      </div>

      <div className="flex flex-wrap justify-center gap-4 mb-20">
        {categories.map((cat, i) => (
          <motion.button
            key={cat.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveCategory(cat.name)}
            className={`px-8 py-4 rounded-full border transition-all flex items-center gap-3 uppercase text-[10px] font-black tracking-widest ${
              activeCategory === cat.name 
                ? 'bg-gold text-luxury-black border-gold shadow-[0_0_20px_rgba(212,175,55,0.3)]' 
                : 'bg-white/5 border-white/10 text-white/60 hover:border-gold/30 hover:text-white'
            }`}
          >
            <span className="text-lg">{cat.icon}</span>
            {cat.name}
          </motion.button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {(trendData[activeCategory] || []).map((item, i) => (
          <RecommendationCard key={i} item={item} index={i} onFeedback={onFeedback} />
        ))}
      </div>
      
      {(!trendData[activeCategory] || trendData[activeCategory].length === 0) && (
        <div className="py-20 text-center opacity-30">
          <Globe size={40} className="mx-auto mb-4" />
          <p className="uppercase tracking-[0.2em] text-xs">Curating latest arrivals for {activeCategory}...</p>
        </div>
      )}

      <div className="mt-20 p-12 glass-morphism rounded-[40px] border border-gold/10 flex flex-col md:flex-row items-center justify-between gap-8">
        <div>
          <h3 className="text-2xl font-display italic mb-2">Want a custom trend report?</h3>
          <p className="text-white/40 text-sm">Upload your photo and let Aura AI architect a personalised trending wardrobe for you.</p>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="px-10 py-5 bg-white text-luxury-black font-black uppercase tracking-widest rounded-full hover:bg-gold transition-all"
        >
          Start My Analysis
        </button>
      </div>
    </motion.section>
  );
};

const ArchiveView = ({ 
  outfits, 
  onRevisit, 
  onDelete 
}: { 
  outfits: any[], 
  onRevisit: (outfit: any) => void,
  onDelete: (id: string) => Promise<void>
}) => {
  return (
    <motion.section 
      key="history"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="pt-32 pb-20 px-8 container mx-auto"
    >
      <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
        <div>
          <h2 className="font-display text-5xl md:text-7xl uppercase italic font-black">Archive of <br /> <span className="text-gold">Elegance</span></h2>
          <p className="text-white/40 uppercase tracking-[0.4em] text-[10px] mt-2 font-bold">Your historical style evolutions curated by Aura</p>
        </div>
        <div className="flex items-center gap-4 text-white/20 text-[10px] uppercase font-black tracking-widest border-l border-white/5 pl-6 hidden md:flex">
          <div className="text-right">
            <p className="text-white/60">{outfits.length}</p>
            <p>Stored Profiles</p>
          </div>
        </div>
      </div>

      {outfits.length === 0 ? (
        <div className="py-32 text-center glass-morphism rounded-[60px] border border-white/5 border-dashed">
          <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-8">
            <Bookmark size={32} className="text-white/10" />
          </div>
          <h3 className="text-xl font-display italic mb-2">Vault is currently empty</h3>
          <p className="text-white/30 uppercase tracking-[0.3em] text-[10px] font-bold">Initiate an analysis to begin your style chronicle</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {outfits.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).map((outfit) => (
            <motion.div 
              key={outfit.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="glass-morphism rounded-[40px] p-6 border border-white/5 hover:border-gold/30 transition-all duration-500 group relative"
            >
              <div className="aspect-[4/5] rounded-[32px] overflow-hidden mb-6 relative">
                <img 
                  src={outfit.sourceImage} 
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all duration-1000" 
                  alt={outfit.aesthetic}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-luxury-black via-transparent to-transparent opacity-60" />
                
                <div className="absolute top-4 left-4 flex gap-2">
                  <div className="bg-luxury-black/60 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 text-[8px] font-black uppercase tracking-widest">
                    {new Date(outfit.createdAt?.seconds * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>

                <button 
                  onClick={() => onDelete(outfit.id)}
                  className="absolute top-4 right-4 p-2 bg-red-500/10 hover:bg-red-500/30 text-red-400 rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all border border-red-500/20"
                  title="Delete from Archive"
                >
                  <X size={14} />
                </button>

                <div className="absolute bottom-6 left-6 right-6">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.3em] text-gold font-black mb-1">{outfit.aesthetic}</p>
                      <h4 className="text-2xl font-display italic font-bold">DNA Synthesis</h4>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-black italic">{outfit.score}</p>
                      <p className="text-[8px] uppercase tracking-widest text-white/40">Score</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => onRevisit(outfit)}
                  className="flex-1 py-4 bg-white text-luxury-black rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] hover:bg-gold transition-all flex items-center justify-center gap-2 group/btn"
                >
                  Recall Matrix <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                </button>
                <div className="flex -space-x-3">
                  {outfit.items?.slice(0, 3).map((item: any, i: number) => (
                    <div key={i} className="w-10 h-14 rounded-xl border border-luxury-black overflow-hidden bg-white/10 ring-2 ring-luxury-black transform hover:rotate-3 transition-transform">
                      <img src={item.imageUrl} className="w-full h-full object-cover grayscale" />
                    </div>
                  ))}
                  {outfit.items?.length > 3 && (
                    <div className="w-10 h-14 rounded-xl border border-luxury-black bg-white/5 flex items-center justify-center text-[10px] font-bold text-white/40 ring-2 ring-luxury-black">
                      +{outfit.items.length - 3}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.section>
  );
};

const ProfileView = ({ user, initialData, onSave }: { user: FirebaseUser, initialData: any, onSave: (data: any) => Promise<void> }) => {
  const [formData, setFormData] = useState({
    displayName: initialData?.displayName || user.displayName || '',
    photoURL: initialData?.photoURL || user.photoURL || '',
    fashionAesthetic: initialData?.fashionAesthetic || 'Minimalist Luxury',
    fashionScore: initialData?.fashionScore || 85
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const aesthetics = ['Old Money', 'Streetwear', 'Formal', 'Minimalist Luxury', 'Quiet Luxury', 'Party', 'Avante Garde', 'Bohemian', 'Gorpcore'];

  const handleProfilePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      const resized = await resizeImage(base64, 512, 512); // Profile pics can be small
      setFormData({ ...formData, photoURL: resized });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      await onSave(formData);
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 3000);
    } catch (error) {
      console.error("Profile update failed:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <motion.section 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="pt-32 pb-20 px-8 container mx-auto max-w-2xl"
    >
      <div className="mb-12 text-center">
        <h2 className="font-display text-5xl uppercase italic font-black">Identity <span className="text-gold">Matrix</span></h2>
        <p className="text-white/40 uppercase tracking-widest text-[10px] mt-2">Customize your architectural profile</p>
      </div>

      <form onSubmit={handleSubmit} className="glass-morphism rounded-[40px] p-10 border border-white/5 space-y-8">
        <div className="flex flex-col items-center gap-6 mb-10">
          <div className="relative group">
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-gold/20 relative">
              {formData.photoURL ? (
                <img src={formData.photoURL} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-white/5 flex items-center justify-center text-white/20">
                  <User size={48} />
                </div>
              )}
            </div>
            <label className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-full cursor-pointer">
              <Camera size={24} className="text-gold" />
              <input type="file" className="hidden" accept="image/*" onChange={handleProfilePicChange} />
            </label>
          </div>
          <p className="text-[10px] uppercase font-bold tracking-widest text-white/30">Click to upload architectural portrait</p>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-black tracking-[0.2em] text-gold">Public Persona</label>
            <input 
              type="text" 
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:border-gold/50 outline-none transition-all"
              placeholder="Display Name"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase font-black tracking-[0.2em] text-gold">Primary Aesthetic DNA</label>
            <select 
              value={formData.fashionAesthetic}
              onChange={(e) => setFormData({ ...formData, fashionAesthetic: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:border-gold/50 outline-none transition-all cursor-pointer"
            >
              {aesthetics.map(a => <option key={a} value={a} className="bg-luxury-black">{a}</option>)}
            </select>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-[10px] uppercase font-black tracking-[0.2em] text-gold">Target Aura Score</label>
              <span className="text-gold font-bold">{formData.fashionScore}</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="100"
              value={formData.fashionScore}
              onChange={(e) => setFormData({ ...formData, fashionScore: parseInt(e.target.value) })}
              className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-gold"
            />
          </div>
        </div>

        <button 
          type="submit"
          disabled={isUpdating}
          className="w-full py-5 bg-gold text-luxury-black font-black uppercase tracking-widest rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
        >
          {isUpdating ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-5 h-5 border-2 border-luxury-black border-t-transparent rounded-full" /> : <Check size={20} />}
          {isSuccess ? "Identity Synchronized" : "Update Architecture"}
        </button>
      </form>
    </motion.section>
  );
};

export default function App() {
  const [step, setStep] = useState<'hero' | 'quiz' | 'upload' | 'analyzing' | 'result'>('hero');
  const [uploadMode, setUploadMode] = useState<'file' | 'camera'>('file');
  const [view, setView] = useState<'main' | 'history' | 'trending' | 'profile'>('main');
  const [userData, setUserData] = useState<any>(null);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [filteredRecommendations, setFilteredRecommendations] = useState<AnalysisResult['recommendations']>([]);
  const [searchResults, setSearchResults] = useState<AnalysisResult['recommendations'] | null>(null);
  const [lastSearchQuery, setLastSearchQuery] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [savedOutfits, setSavedOutfits] = useState<any[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [specificRequest, setSpecificRequest] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    (window as any).viewTrends = () => setView('trending');
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        // Fetch/Sync user data
        const userRef = doc(db, 'users', u.uid);
        getDocs(query(collection(db, 'users'), where('uid', '==', u.uid))).then(snap => {
          if (!snap.empty) {
            setUserData(snap.docs[0].data());
          } else {
            const data = {
              uid: u.uid,
              email: u.email,
              displayName: u.displayName,
              photoURL: u.photoURL,
              fashionAesthetic: 'Minimalist Luxury',
              fashionScore: 85,
              updatedAt: serverTimestamp()
            };
            setDoc(userRef, data, { merge: true }).then(() => setUserData(data));
          }
        });
      } else {
        setUserData(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleUpdateProfile = async (data: any) => {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    try {
      await setDoc(userRef, {
        ...data,
        updatedAt: serverTimestamp()
      }, { merge: true });
      setUserData({ ...userData, ...data });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    }
  };

  const handleQuizComplete = async (results: QuizResults) => {
    await handleUpdateProfile({ styleQuizResults: results });
    setStep('upload');
  };

  const fetchHistory = async () => {
    if (!user) return;
    const path = `users/${user.uid}/saved_outfits`;
    try {
      const q = query(collection(db, path));
      const snapshot = await getDocs(q);
      const outfits = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSavedOutfits(outfits);
      setView('history');
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  };

  const handleDeleteOutfit = async (id: string) => {
    if (!user) return;
    const path = `users/${user.uid}/saved_outfits/${id}`;
    if (!confirm("Are you sure you want to purge this record from your archive?")) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/saved_outfits`, id));
      setSavedOutfits(prev => prev.filter(o => o.id !== id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const handleSaveOutfit = async () => {
    if (!user || !analysis || images.length === 0) return;
    setIsSaving(true);
    const path = `users/${user.uid}/saved_outfits`;
    try {
      const outfitRef = doc(collection(db, path));
      await setDoc(outfitRef, {
        id: outfitRef.id,
        ownerId: user.uid,
        sourceImage: images[0],
        sourceImages: images,
        aesthetic: analysis.styleProfile.fashionAesthetic,
        score: analysis.styleProfile.fashionScore,
        items: analysis.recommendations,
        createdAt: serverTimestamp(),
      });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    for (const file of files) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        const resized = await resizeImage(base64, 1024, 1024);
        setImages(prev => [...prev, resized]);
      };
      reader.readAsDataURL(file);
    }
    // Don't auto-analyze, let user add more or confirm
  };

  const runAnalysis = async () => {
    if (images.length === 0) return;
    setStep('analyzing');
    try {
      // Pass quiz results extra context if available
      const quizContext = userData?.styleQuizResults 
        ? `The user's defined aesthetic DNA: Philosophy: ${userData.styleQuizResults.philosophy}, ` +
          `Colors: ${userData.styleQuizResults.colorPalette}, Silhouette: ${userData.styleQuizResults.silhouette}, ` +
          `Env: ${userData.styleQuizResults.environment}, Influence: ${userData.styleQuizResults.influence}.`
        : undefined;

      const result = await analyzeFashionPhoto(images, undefined, quizContext);
      setAnalysis(result);
      setFilteredRecommendations(result.recommendations);
      setStep('result');
    } catch (error) {
      console.error("AI Analysis failed:", error);
      setStep('upload');
    }
  };

  const removeImage = (idx: number) => {
    setImages(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSpecificSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (images.length === 0 || !specificRequest.trim()) return;
    
    setIsSearching(true);
    try {
      const quizContext = userData?.styleQuizResults 
        ? `Philosophy: ${userData.styleQuizResults.philosophy}, Colors: ${userData.styleQuizResults.colorPalette}, Silhouette: ${userData.styleQuizResults.silhouette}`
        : undefined;
      const result = await analyzeFashionPhoto(images, specificRequest, quizContext);
      setSearchResults(result.recommendations);
      setLastSearchQuery(specificRequest);
      setSpecificRequest("");
    } catch (error) {
      console.error("Specialized search failed:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleItemFeedback = async (itemTitle: string, type: 'not_my_style' | 'too_expensive' | 'love') => {
    if (!user) return;
    const path = `users/${user.uid}/feedback`;
    try {
      await addDoc(collection(db, path), {
        userId: user.uid,
        itemTitle,
        feedbackType: type,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar user={user} userData={userData} onViewHistory={fetchHistory} onToggleTrending={() => setView('trending')} onViewProfile={() => setView('profile')} view={view} />
      
      <main>
        <AnimatePresence mode="wait">
          {view === 'history' ? (
            <ArchiveView 
              outfits={savedOutfits} 
              onDelete={handleDeleteOutfit}
              onRevisit={(outfit) => {
                setImages([outfit.sourceImage, ...(outfit.sourceImages || [])]);
                setAnalysis({
                  styleProfile: { 
                    fashionAesthetic: outfit.aesthetic, 
                    fashionScore: outfit.score,
                    faceShape: '', skinTone: '', hairStyle: '', bodyStructure: '', confidenceVibe: '' 
                  },
                  recommendations: outfit.items,
                  overallSuggestions: []
                });
                setFilteredRecommendations(outfit.items);
                setStep('result');
                setView('main');
              }}
            />
          ) : view === 'profile' ? (
            user && <ProfileView user={user} initialData={userData} onSave={handleUpdateProfile} />
          ) : view === 'trending' ? (
            <TrendingView onFeedback={handleItemFeedback} />
          ) : (
            <>
              {step === 'hero' && <Hero key="hero" onStart={() => {
                if (user && userData?.styleQuizResults) {
                  setStep('upload');
                } else {
                  setStep('quiz');
                }
              }} />}
              
              {step === 'quiz' && (
                <StyleQuiz 
                  onComplete={handleQuizComplete}
                  onCancel={() => setStep('hero')}
                />
              )}
              
              {step === 'upload' && (
            <motion.section 
              key="upload"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="min-h-screen pt-32 px-8 flex flex-col items-center"
            >
              <div className="text-center mb-16">
                <h2 className="font-display text-5xl uppercase italic font-black mb-4">Feed the <span className="text-gold">Aura</span></h2>
                <p className="text-white/40 uppercase tracking-widest text-xs">Upload one or multiple looks for comprehensive style DNA sequencing</p>
                
                <div className="flex justify-center gap-4 mt-8">
                  <button 
                    onClick={() => setUploadMode('file')}
                    className={`px-6 py-2 rounded-full text-[10px] uppercase font-bold tracking-widest transition-all border ${uploadMode === 'file' ? 'bg-gold text-luxury-black border-gold' : 'bg-white/5 border-white/10 text-white/40 hover:text-white'}`}
                  >
                    Lookbook Upload
                  </button>
                  <button 
                    onClick={() => setUploadMode('camera')}
                    className={`px-6 py-2 rounded-full text-[10px] uppercase font-bold tracking-widest transition-all border ${uploadMode === 'camera' ? 'bg-gold text-luxury-black border-gold' : 'bg-white/5 border-white/10 text-white/40 hover:text-white'}`}
                  >
                    Direct Capture
                  </button>
                </div>
              </div>

              <div className="w-full max-w-4xl space-y-12">
                {uploadMode === 'file' ? (
                  <label id="upload-zone" className="relative w-full aspect-[21/9] rounded-[40px] border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-6 hover:border-gold/50 hover:bg-gold/5 cursor-pointer transition-all duration-500 overflow-hidden group">
                    <input type="file" className="hidden" accept="image/*" multiple onChange={handleFileUpload} />
                    <div className="relative z-10 p-6 rounded-full bg-white/5 border border-white/10 group-hover:scale-110 group-hover:rotate-12 transition-transform">
                      <Upload size={40} className="text-gold" />
                    </div>
                    <div className="text-center relative z-10 px-8">
                      <span className="block text-lg font-medium">Inject Outfit Media</span>
                      <span className="text-sm text-white/30 uppercase tracking-tighter mt-2 block">Upload full body silhouettes for best analysis</span>
                    </div>
                    <div className="absolute inset-0 shimmer opacity-50 pointer-events-none" />
                  </label>
                ) : (
                  <CameraCapture 
                    onCapture={(base64) => {
                      setImages(prev => [...prev, base64]);
                    }}
                    onCancel={() => setUploadMode('file')}
                  />
                )}

                {/* Gallery of Uploaded Images */}
                <AnimatePresence>
                  {images.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-8"
                    >
                      <div className="flex justify-between items-center">
                        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white/40">Captured DNA ({images.length})</h3>
                        <button onClick={() => setImages([])} className="text-[10px] uppercase font-bold text-white/20 hover:text-red-400 transition-colors">Purge Grid</button>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {images.map((img, i) => (
                          <motion.div 
                            key={i}
                            layout
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            whileHover={{ y: -5 }}
                            className="relative aspect-[3/4] rounded-2xl overflow-hidden glass-morphism border border-white/5 group"
                          >
                            <img src={img} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
                            <button 
                              onClick={() => removeImage(i)}
                              className="absolute top-2 right-2 p-1.5 bg-black/60 backdrop-blur-md rounded-full text-white/40 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <X size={12} />
                            </button>
                          </motion.div>
                        ))}
                        
                        {/* Dummy Add Button in Grid */}
                        <label className="aspect-[3/4] rounded-2xl border-2 border-dashed border-white/5 hover:border-gold/30 hover:bg-gold/5 flex flex-col items-center justify-center cursor-pointer transition-all group">
                          <input type="file" className="hidden" accept="image/*" multiple onChange={handleFileUpload} />
                          <Upload size={20} className="text-white/20 group-hover:text-gold transition-colors" />
                          <span className="text-[8px] uppercase font-bold tracking-widest text-white/20 mt-2">Append Look</span>
                        </label>
                      </div>

                      <div className="flex justify-center pt-8">
                        <button 
                          onClick={runAnalysis}
                          className="px-12 py-5 bg-gold text-luxury-black font-black uppercase tracking-[0.3em] rounded-full hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_rgba(212,175,55,0.4)] flex items-center gap-3"
                        >
                          Synthesize Style DNA <ArrowRight size={20} />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="mt-20 flex flex-wrap justify-center gap-10 opacity-30 text-[10px] font-black uppercase tracking-[0.3em]">
                <div className="flex items-center gap-2"><Zap size={14}/> Multi-Source Analysis</div>
                <div className="flex items-center gap-2"><Globe size={14}/> Global Trends Sync</div>
                <div className="flex items-center gap-2"><Github size={14}/> Open Styling Engine</div>
              </div>
            </motion.section>
          )}

          {step === 'analyzing' && <AnalysisLoader key="analyzing" />}

          {step === 'result' && analysis && (
            <motion.section 
              key="result"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="pt-32 pb-20 px-8 container mx-auto"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                
                {/* Profile Section */}
                <div className="lg:col-span-4 space-y-8">
                  <div className="glass-morphism rounded-[40px] p-8 border border-gold/20 shadow-2xl shadow-gold/5">
                    <div className="text-center mb-10">
                      <div className="relative inline-block">
                        <svg className="w-32 h-32 transform -rotate-90">
                          <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/5" />
                          <motion.circle 
                            cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" 
                            strokeDasharray={364.42}
                            initial={{ strokeDashoffset: 364.42 }}
                            animate={{ strokeDashoffset: 364.42 - (364.42 * (analysis.styleProfile.fashionScore || 0)) / 100 }}
                            transition={{ duration: 2, ease: "easeOut" }}
                            className="text-gold" 
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-3xl font-black font-display italic leading-none">{analysis.styleProfile.fashionScore || 0}</span>
                          <span className="text-[8px] uppercase tracking-widest font-bold opacity-40">Aura Score</span>
                        </div>
                      </div>
                    </div>

                    <div className="w-full aspect-square rounded-3xl overflow-hidden mb-6 border border-white/10 relative group">
                       <img src={images[0] || ''} alt="Analysis Source" className="w-full h-full object-cover grayscale group-hover:scale-110 transition-transform duration-700" />
                       {images.length > 1 && (
                         <div className="absolute bottom-4 right-4 bg-luxury-black/80 backdrop-blur-md px-3 py-1 rounded-full text-[8px] font-bold uppercase tracking-widest text-gold border border-gold/30">
                           +{images.length - 1} More Perspectives
                         </div>
                       )}
                       
                       {/* Gallery mini-overlay on hover */}
                       <div className="absolute inset-0 bg-luxury-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-4">
                          <div className="grid grid-cols-2 gap-2 w-full h-full">
                            {images.slice(0, 4).map((img, i) => (
                              <div key={i} className="rounded-lg overflow-hidden border border-white/10">
                                <img src={img} className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all" />
                              </div>
                            ))}
                          </div>
                       </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <span className="text-[10px] uppercase tracking-widest text-white/40">Archetype</span>
                        <span className="font-bold text-gold italic uppercase">{analysis.styleProfile.fashionAesthetic}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <span className="text-[10px] uppercase tracking-widest text-white/40">Visual Vibe</span>
                        <span className="font-bold italic uppercase">{analysis.styleProfile.confidenceVibe}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <span className="text-[10px] uppercase tracking-widest text-white/40">Complexion</span>
                        <span className="font-bold italic uppercase">{analysis.styleProfile.skinTone}</span>
                      </div>
                    </div>
                  </div>

                  <div className="glass-morphism rounded-[40px] p-8 border border-white/5">
                    <h3 className="text-xs font-black uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                      <Sparkles size={16} className="text-gold" /> AI Advice
                    </h3>
                    <ul className="space-y-4">
                      {analysis.overallSuggestions.map((suggestion, i) => (
                        <li key={i} className="flex gap-4 text-sm text-white/70 leading-relaxed italic">
                          <span className="text-gold font-mono">0{i+1}</span>
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Recommendations Grid */}
                <div className="lg:col-span-8">
                  {/* Specific Search Section */}
                  <div className="glass-morphism rounded-[32px] p-8 mb-12 border border-white/5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 blur-3xl rounded-full" />
                    <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
                      <div className="flex-1">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-2 text-gold">Aura Engine Search</h3>
                        <p className="text-white/40 text-[10px] uppercase font-medium">Architect specific pieces for your frame</p>
                      </div>
                      <form onSubmit={handleSpecificSearch} className="flex gap-2 w-full md:w-auto">
                        <input 
                          type="text" 
                          placeholder="Search for Blazer, Watch, Hat..." 
                          value={specificRequest}
                          onChange={(e) => setSpecificRequest(e.target.value)}
                          className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[10px] w-full md:w-64 focus:border-gold/50 outline-none transition-all uppercase tracking-widest font-bold"
                        />
                        <button 
                          type="submit"
                          disabled={!specificRequest || isSearching}
                          className="p-3 bg-gold text-luxury-black rounded-xl hover:scale-105 transition-all disabled:opacity-50 flex items-center justify-center min-w-[50px]"
                        >
                          {isSearching ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-5 h-5 border-2 border-luxury-black border-t-transparent rounded-full" /> : <ArrowRight size={20} />}
                        </button>
                      </form>
                    </div>
                  </div>

                  {/* Search Results Section */}
                  <AnimatePresence>
                    {searchResults && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mb-16"
                      >
                        <div className="flex justify-between items-center mb-8">
                          <div>
                            <h2 className="font-display text-4xl uppercase italic font-black">Focused <span className="text-gold">Finds</span></h2>
                            <p className="text-white/40 uppercase tracking-widest text-[9px] mt-2">Curated results for: "{lastSearchQuery}"</p>
                          </div>
                          <button 
                            onClick={() => setSearchResults(null)}
                            className="text-[10px] uppercase font-bold text-white/30 hover:text-gold transition-colors"
                          >
                            Clear Results
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          {searchResults.map((item, i) => (
                            <RecommendationCard 
                              key={`search-${i}`} 
                              index={i}
                              onFeedback={handleItemFeedback}
                              item={{
                                id: `search-${i}`,
                                brand: "Custom Search",
                                title: item.itemType,
                                description: item.description,
                                whySuggested: item.whySuggested,
                                price: item.priceINR,
                                image: item.imageUrl,
                                matchScore: item.matchScore,
                                tags: [item.material, item.occasion, ...(item.tags || [])],
                                colorPalette: item.colorPalette,
                                shoppingLink: item.shoppingLink
                              }} 
                            />
                          ))}
                        </div>
                        <div className="h-px bg-white/5 my-16 w-full" />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
                    <div>
                      <h2 className="font-display text-5xl uppercase italic font-black">Style <br /> <span className="text-gold">Edit</span></h2>
                      <p className="text-white/40 uppercase tracking-widest text-[10px] mt-2">Curated recommendations for the Indian Market</p>
                    </div>
                  </div>

                  <FilterControls 
                    recommendations={analysis.recommendations} 
                    onFilterChange={setFilteredRecommendations} 
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {filteredRecommendations.map((item, i) => (
                      <RecommendationCard 
                        key={i} 
                        index={i}
                        onFeedback={handleItemFeedback}
                        item={{
                          id: i,
                          brand: item.category || "Editorial Select",
                          title: item.itemType,
                          description: item.description,
                          whySuggested: item.whySuggested,
                          price: item.priceINR,
                          image: item.imageUrl,
                          matchScore: item.matchScore,
                          tags: [item.material, item.occasion, ...(item.tags || [])],
                          colorPalette: item.colorPalette,
                          shoppingLink: item.shoppingLink
                        }} 
                      />
                    ))}
                  </div>

                  {filteredRecommendations.length === 0 && (
                    <div className="py-20 text-center glass-morphism rounded-[40px] border border-white/5 opacity-50">
                      <ShoppingBag size={40} className="mx-auto mb-4 text-white/20" />
                      <p className="uppercase tracking-[0.2em] text-[10px] font-bold">No items match your architectural constraints</p>
                    </div>
                  )}

                  {user && (
                    <div className="mt-12 flex justify-center">
                      <button 
                        onClick={handleSaveOutfit}
                        disabled={isSaving || isSaved}
                        className={`
                          flex items-center gap-3 px-10 py-4 rounded-full border border-gold/30 font-black uppercase tracking-[0.2em] text-[10px] transition-all
                          ${isSaved ? 'bg-green-500/20 border-green-500 text-green-500' : 'hover:bg-gold hover:text-luxury-black'}
                          ${isSaving ? 'opacity-50 cursor-wait' : ''}
                        `}
                      >
                        {isSaving ? 'Encrypting Archive...' : isSaved ? <><Check size={16}/> Saved to Archive</> : <><Bookmark size={16}/> Commit to My Archive</>}
                      </button>
                    </div>
                  )}
                </div>

              </div>

              <div className="mt-20 pt-10 border-t border-white/5 flex justify-center">
                 <button 
                  onClick={() => setStep('upload')}
                  className="px-10 py-4 rounded-full border border-white/10 text-[10px] uppercase font-black tracking-[0.4em] hover:bg-gold hover:text-luxury-black transition-all"
                 >
                   Reset Analysis Engine
                 </button>
              </div>
            </motion.section>
          )}
            </>
          )}
        </AnimatePresence>
      </main>

      {/* Footer Decoration */}
      <div className="fixed bottom-0 left-0 w-full h-[2px] bg-gold/5 overflow-hidden z-0">
        <motion.div 
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          className="h-full w-1/3 bg-gold/50 blur-sm"
        />
      </div>

      <StylistChat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} analysis={analysis} />
      
      {!isChatOpen && (
        <motion.button 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-8 right-8 w-16 h-16 bg-gold text-luxury-black rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-[90]"
        >
          <MessageSquare size={28} />
          <motion.div 
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute inset-0 rounded-full border-4 border-gold"
          />
        </motion.button>
      )}
    </div>
  );
}
