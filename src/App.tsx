import { useState, useEffect, FormEvent } from "react";
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  db,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  increment,
  User
} from "./firebase";
import { AppConfig, LiveStats, UserProfile } from "./types";
import InteractiveBackground from "./components/InteractiveBackground";
import SpinWheel from "./components/SpinWheel";
import AdminPanel from "./components/AdminPanel";
import { 
  Gift, 
  TrendingUp, 
  Users, 
  Sparkles, 
  LogOut, 
  ShieldCheck, 
  CheckCircle, 
  AlertOctagon, 
  MessageCircle, 
  Youtube, 
  Instagram, 
  Award,
  Gamepad2,
  Lock,
  Unlock,
  KeyRound,
  Eye,
  Info,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Default seed configs
const DEFAULT_CONFIG: AppConfig = {
  whatsappNumber: "919000000000",
  whatsappMessage: "Hello, I won a free website setup on your Spin & Win wheel! Please help me get started.",
  youtubeLink: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  instagramLink: "https://www.instagram.com/instagram",
  subscribeLink: "https://www.youtube.com/channel/UC_x5XG1OV2P6uZZ5FSM9Ttw?sub_confirmation=1",
  freeWebsiteProbability: 15
};

const DEFAULT_STATS: LiveStats = {
  totalUsers: 145,
  totalSpins: 112,
  freeWebsiteWinners: 18,
  otherWinners: 94
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [appConfig, setAppConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [liveStats, setLiveStats] = useState<LiveStats>(DEFAULT_STATS);
  
  // UI states
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [activeNotification, setActiveNotification] = useState<string | null>(null);

  // Seed default configurations and stats if they don't exist
  const ensureDefaultFirestoreDocs = async () => {
    try {
      const configRef = doc(db, "config", "settings");
      const configSnap = await getDoc(configRef);
      if (!configSnap.exists()) {
        await setDoc(configRef, DEFAULT_CONFIG);
      }

      const statsRef = doc(db, "counters", "stats");
      const statsSnap = await getDoc(statsRef);
      if (!statsSnap.exists()) {
        await setDoc(statsRef, DEFAULT_STATS);
      }
    } catch (err) {
      console.error("Error seeding default Firestore values:", err);
    }
  };

  useEffect(() => {
    ensureDefaultFirestoreDocs();
  }, []);

  // Real-time Firestore Listeners
  useEffect(() => {
    // 1. Listen to app configuration settings
    const configUnsub = onSnapshot(doc(db, "config", "settings"), (docSnap) => {
      if (docSnap.exists()) {
        setAppConfig(docSnap.data() as AppConfig);
      }
    });

    // 2. Listen to global statistics
    const statsUnsub = onSnapshot(doc(db, "counters", "stats"), (docSnap) => {
      if (docSnap.exists()) {
        setLiveStats(docSnap.data() as LiveStats);
      }
    });

    return () => {
      configUnsub();
      statsUnsub();
    };
  }, []);

  // Listen to User Profile changes once logged in
  useEffect(() => {
    if (!currentUser) {
      setUserProfile(null);
      return;
    }

    const userProfileRef = doc(db, "users", currentUser.uid);
    const userUnsub = onSnapshot(userProfileRef, (docSnap) => {
      if (docSnap.exists()) {
        setUserProfile(docSnap.data() as UserProfile);
      }
    });

    return () => {
      userUnsub();
    };
  }, [currentUser]);

  // Auth state listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setLoadingAuth(true);
      if (user) {
        setCurrentUser(user);
        
        // Create or update user profile in DB
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          const newUser: UserProfile = {
            id: user.uid,
            email: user.email || "",
            displayName: user.displayName || "Contender",
            photoURL: user.photoURL || "",
            hasSpun: false,
            spinOutcome: null,
            spunAt: null,
            blocked: false,
            createdAt: new Date().toISOString()
          };
          await setDoc(userRef, newUser);

          // Increment registered users count
          const statsRef = doc(db, "counters", "stats");
          await setDoc(statsRef, {
            totalUsers: increment(1)
          }, { merge: true });
        }
      } else {
        setCurrentUser(null);
      }
      setLoadingAuth(false);
    });

    return () => unsub();
  }, []);

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error("Auth error:", err);
      alert("Failed to authenticate with Google. Details: " + err.message);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err: any) {
      console.error("Logout error:", err);
    }
  };

  // Admin Verification check
  const isAdmin = currentUser?.email?.toLowerCase() === "rouinmajhi@gmail.com";

  const handleAdminAccessAttempt = () => {
    if (isAdmin) {
      setShowAdminPanel(true);
    }
  };

  // Notification popup handler
  const handleSpinSuccess = (outcome: string) => {
    setActiveNotification(`Congratulations! You won "${outcome}". Claim your prize below!`);
    setTimeout(() => {
      setActiveNotification(null);
    }, 7000);
  };

  return (
    <div className="min-h-screen text-zinc-100 font-sans bg-[#050505] flex flex-col relative overflow-x-hidden">
      {/* Animated Canvas Background (Green dust trail & clicks pop balloons) */}
      <InteractiveBackground />

      {/* Floating Active Success Notifications */}
      <AnimatePresence>
        {activeNotification && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-[#050505] border border-neon/40 px-6 py-3.5 rounded-2xl shadow-[0_10px_30px_rgba(57,255,20,0.3)] flex items-center gap-3 max-w-md w-[90%]"
          >
            <Sparkles className="w-5 h-5 text-neon shrink-0 animate-pulse" />
            <span className="text-sm font-bold text-zinc-100 font-display">{activeNotification}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Bar */}
      <header className="relative z-20 w-full bg-black/80 backdrop-blur-md border-b border-neon/10 py-4 px-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#39FF14] to-lime-400 flex items-center justify-center shadow-[0_0_15px_rgba(57,255,20,0.6)]">
            <Gamepad2 className="w-5 h-5 text-black stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-md sm:text-lg font-black text-zinc-100 tracking-tight leading-none flex items-center gap-1.5 font-display">
              SPIN <span className="text-neon">/</span> WIN
            </h1>
            <span className="text-[9px] text-neon font-mono tracking-widest font-black block mt-0.5">IMMERSIVE CHALLENGE</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {currentUser && (
            <>
              {/* Profile card summary */}
              <div className="hidden sm:flex items-center gap-2 bg-zinc-950/80 border border-zinc-800 px-3 py-1.5 rounded-xl">
                <img 
                  src={currentUser.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&q=80"} 
                  alt={currentUser.displayName || "User"} 
                  referrerPolicy="no-referrer"
                  className="w-6 h-6 rounded-full border border-neon/30 object-cover"
                />
                <span className="text-xs font-semibold text-zinc-300 max-w-[100px] truncate">
                  {currentUser.displayName}
                </span>
              </div>

              {/* Admin Panel button */}
              {isAdmin && (
                <button
                  onClick={handleAdminAccessAttempt}
                  id="admin-panel-button"
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl transition-all cursor-pointer font-display tracking-wide bg-zinc-950 text-neon border border-neon/30 shadow-[0_0_15px_rgba(57,255,20,0.2)] hover:bg-zinc-900"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span className="hidden md:inline">Admin Panel</span>
                </button>
              )}

              <button
                onClick={handleSignOut}
                id="sign-out-button"
                className="flex items-center gap-1 text-xs font-semibold text-zinc-400 hover:text-rose-400 bg-zinc-950 hover:bg-rose-950/20 border border-zinc-800 hover:border-rose-950 px-3 py-2 rounded-xl transition-all cursor-pointer font-display"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </>
          )}

          {!currentUser && !loadingAuth && (
            <button
              onClick={handleGoogleLogin}
              id="header-login-button"
              className="flex items-center gap-1.5 text-xs font-bold bg-neon hover:bg-neon/90 text-black px-4 py-2 rounded-xl transition-all shadow-[0_0_15px_rgba(57,255,20,0.45)] cursor-pointer font-display uppercase tracking-wider"
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-grow flex flex-col justify-center items-center py-8 px-4 relative z-10 max-w-7xl mx-auto w-full">
        {loadingAuth ? (
          <div className="flex flex-col items-center justify-center p-12 bg-zinc-950/80 border border-zinc-900 rounded-3xl">
            <div className="w-10 h-10 border-4 border-neon border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-zinc-400 mt-4 tracking-wide font-medium font-display">Synchronizing Secure Session...</p>
          </div>
        ) : !currentUser ? (
          /* High-Converting Logged Out Interface */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center w-full my-auto">
            
            {/* Value Proposition Left Column */}
            <div className="lg:col-span-7 flex flex-col justify-center space-y-6 text-left">
              <span className="inline-flex items-center gap-2 bg-neon/10 border border-neon/30 text-neon text-xs font-bold px-3 py-1.5 rounded-full w-fit tracking-wide uppercase font-display">
                <Sparkles className="w-3.5 h-3.5 animate-spin" /> Limited Time Opportunity
              </span>
              
              <h2 className="text-4xl sm:text-5xl lg:text-6.5xl font-black tracking-tight leading-[1.05] text-zinc-100 font-display">
                Spin The Wheel & <span className="text-neon drop-shadow-[0_0_20px_rgba(57,255,20,0.5)]">Win Premium Rewards</span>
              </h2>
              
              <p className="text-zinc-400 text-base sm:text-lg max-w-xl leading-relaxed">
                Connect your Google Account to access your personal high-converting wheel. Every validated contender gets <strong className="text-neon font-black">one guarantee spin</strong> to secure real developer benefits, premium tutorials, or a fully functional website setups!
              </p>

              {/* Benefit checklist badges */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg pt-2">
                {[
                  "Free Custom Website Setups",
                  "Elite Full-Stack Developer Guides",
                  "Direct Premium Channel Subscriptions",
                  "Verified Creator Social Access"
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2.5 bg-zinc-950/60 border border-zinc-900 p-2.5 rounded-xl">
                    <CheckCircle className="w-4 h-4 text-neon shrink-0" />
                    <span className="text-xs font-semibold text-zinc-200 font-display">{item}</span>
                  </div>
                ))}
              </div>

              {/* Login Button with Google Branding */}
              <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <button
                  onClick={handleGoogleLogin}
                  id="google-login-hero-button"
                  className="flex items-center justify-center gap-3 bg-white hover:bg-zinc-100 text-black font-black px-8 py-4 rounded-2xl transition-all shadow-[0_0_20px_rgba(57,255,20,0.3)] hover:shadow-[0_0_30px_rgba(57,255,20,0.5)] hover:scale-[1.02] active:scale-[0.98] cursor-pointer font-display uppercase tracking-wider text-sm"
                >
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#EA4335"
                      d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.41 0-6.177-2.767-6.177-6.177s2.767-6.177 6.177-6.177c1.559 0 2.978.583 4.07 1.543l3.076-3.076C19.266 2.22 15.973 1 12.24 1C6.033 1 1 6.033 1 12.24s5.033 11.24 11.24 11.24c5.898 0 10.87-4.234 11.24-10.285v-2.91H12.24z"
                    />
                  </svg>
                  Sign In with Google to Spin
                </button>
                
                <div className="flex items-center gap-1.5 text-xs text-zinc-500 justify-center font-display">
                  <Lock className="w-3.5 h-3.5" /> Securing with Google Firebase Auth
                </div>
              </div>
            </div>

            {/* Simulated interactive visual right column */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center">
              <div className="relative w-[300px] h-[300px] sm:w-[360px] sm:h-[360px] rounded-full border-4 border-dashed border-neon/20 flex items-center justify-center p-6 animate-[spin_60s_linear_infinite] bg-zinc-950/20 backdrop-blur-sm">
                <div className="absolute inset-4 rounded-full border border-neon/10 flex items-center justify-center">
                  <div className="absolute inset-8 rounded-full bg-zinc-950/55 flex flex-col items-center justify-center text-center p-4">
                    <Award className="w-10 h-10 text-neon animate-pulse mb-2" />
                    <span className="text-xs font-black text-neon uppercase tracking-widest font-display">Contest Active</span>
                  </div>
                </div>
                <div className="w-full h-full rounded-full border border-neon/20 relative">
                  {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                    <div 
                      key={i} 
                      className="absolute w-2.5 h-2.5 rounded-full bg-neon shadow-[0_0_10px_#39FF14]"
                      style={{
                        top: `${50 + 44 * Math.sin((i * 45 * Math.PI) / 180)}%`,
                        left: `${50 + 44 * Math.cos((i * 45 * Math.PI) / 180)}%`,
                      }}
                    />
                  ))}
                </div>
              </div>
              
              {/* Highlight statistic banner */}
              <div className="mt-8 bg-zinc-950/60 border border-zinc-900 rounded-2xl p-4 flex gap-4 items-center max-w-sm w-full">
                <div className="p-3 bg-zinc-950 border border-neon/20 text-neon rounded-xl">
                  <TrendingUp className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="text-xl font-black text-zinc-200 font-display">{liveStats.freeWebsiteWinners + 25} Websites</div>
                  <div className="text-xs text-zinc-400">Total website configurations awarded this month!</div>
                </div>
              </div>
            </div>

          </div>
        ) : userProfile?.blocked ? (
          /* BLOCK SCREEN */
          <div className="max-w-md w-full bg-zinc-950 border border-rose-500/40 p-8 rounded-2xl text-center shadow-[0_0_30px_rgba(239,68,68,0.15)] relative my-auto">
            <div className="w-16 h-16 bg-rose-950/60 border border-rose-500/40 rounded-full flex items-center justify-center mx-auto mb-5">
              <AlertOctagon className="w-8 h-8 text-rose-500" />
            </div>
            <h3 className="text-2xl font-black text-zinc-100 font-display tracking-tight">ACCOUNT RESTRICTED</h3>
            <p className="text-zinc-400 text-sm mt-3 leading-relaxed">
              Your access to the "Spin & Win" system has been restricted by an administrator due to security parameters. If you believe this is an error, please reach out to our admin desk.
            </p>
            <div className="mt-6 p-4 rounded-xl bg-black border border-rose-950 text-xs font-mono text-rose-400">
              USER_ID: {currentUser.uid}
            </div>
            <button 
              onClick={handleSignOut}
              className="mt-6 w-full bg-zinc-900 hover:bg-zinc-800 text-zinc-100 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer font-display"
            >
              Log Out Session
            </button>
          </div>
        ) : (
          /* Logged In Dashboard Layout */
          <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start my-auto">
            
            {/* Column 1: Spin & Win Core (Left side, takes 6 cols) */}
            <div className="lg:col-span-6 flex flex-col items-center justify-center bg-zinc-950/40 backdrop-blur-sm border border-neon/10 p-6 sm:p-8 rounded-3xl shadow-inner text-center">
              <div className="mb-6">
                <span className="inline-flex items-center gap-1.5 bg-neon/10 border border-neon/30 text-neon text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest mb-2 font-display">
                  <Gamepad2 className="w-3.5 h-3.5" /> SECURE MATCH
                </span>
                <h3 className="text-2xl font-black text-zinc-100 font-display">Contender's Stage</h3>
                <p className="text-xs text-zinc-400 mt-1 max-w-sm">
                  Spin the validated wheel below. Results are instantly committed to the cloud database.
                </p>
              </div>

              {/* Dynamic Spin Wheel */}
              <SpinWheel
                userId={currentUser.uid}
                userEmail={currentUser.email || ""}
                hasSpun={userProfile?.hasSpun || false}
                onSpinComplete={handleSpinSuccess}
                whatsappNumber={appConfig.whatsappNumber}
                whatsappMessage={appConfig.whatsappMessage}
                youtubeLink={appConfig.youtubeLink}
                instagramLink={appConfig.instagramLink}
                subscribeLink={appConfig.subscribeLink}
                freeWebsiteProbability={appConfig.freeWebsiteProbability}
                isBlocked={userProfile?.blocked || false}
                remainingSpins={userProfile?.remainingSpins}
              />

              {/* Claim Reward Banner if user has already Spun */}
              {userProfile?.hasSpun && userProfile.spinOutcome && (
                <div className="mt-8 w-full bg-neon/5 border border-neon/20 rounded-2xl p-5 text-center relative overflow-hidden shadow-inner">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-neon/5 rounded-full blur-xl pointer-events-none" />
                  <span className="text-[10px] font-black text-neon tracking-widest uppercase block mb-1 font-display">Your Claim Ticket</span>
                  <div className="text-zinc-400 text-xs mb-3">You won: <strong className="text-neon font-black text-lg font-display block mt-1 drop-shadow-[0_0_8px_rgba(57,255,20,0.4)]">{userProfile.spinOutcome}</strong></div>
                  
                  {/* Reward Action Redirectors */}
                  {userProfile.spinOutcome === "Free Website" && (
                    <a
                      href={`https://wa.me/${appConfig.whatsappNumber}?text=${encodeURIComponent(appConfig.whatsappMessage)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm py-2.5 px-6 rounded-xl transition-all shadow-md cursor-pointer font-display tracking-wide"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Connect on WhatsApp
                    </a>
                  )}

                  {userProfile.spinOutcome === "Long Tutorial" && (
                    <a
                      href={appConfig.youtubeLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold text-sm py-2.5 px-6 rounded-xl transition-all shadow-md cursor-pointer font-display tracking-wide"
                    >
                      <Youtube className="w-4 h-4" />
                      Watch Tutorial Video
                    </a>
                  )}

                  {userProfile.spinOutcome === "Subscribe Channel" && (
                    <a
                      href={appConfig.subscribeLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm py-2.5 px-6 rounded-xl transition-all shadow-md cursor-pointer font-display tracking-wide"
                    >
                      <Youtube className="w-4 h-4" />
                      Subscribe Channel
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Column 2: Live Analytics Dashboard (Right side, takes 6 cols) */}
            <div className="lg:col-span-6 flex flex-col space-y-6">
              
              {/* Introduction Banner Card */}
              <div className="bg-zinc-950/40 backdrop-blur-sm border border-neon/10 p-6 rounded-3xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-neon/5 rounded-full blur-2xl pointer-events-none" />
                <div className="flex gap-4 items-start">
                  <div className="p-3 bg-zinc-950 border border-neon/20 text-neon rounded-2xl shrink-0">
                    <Award className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-zinc-100 font-display">Live Analytics Board</h3>
                    <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                      Real-time telemetry listening directly to global challenger outcomes on Firebase Firestore. Stats synchronize automatically as soon as users trigger spins!
                    </p>
                  </div>
                </div>
              </div>

              {/* Bento grid Statistics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Total Contenders */}
                <div className="bg-zinc-950/40 border border-zinc-900 hover:border-neon/30 transition-all p-5 rounded-2xl shadow-md relative group overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-neon/10 to-transparent group-hover:via-neon/60 transition-all" />
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider font-display">Total Contenders</span>
                    <Users className="w-4 h-4 text-neon" />
                  </div>
                  <div className="text-3xl font-black text-zinc-100 tracking-tight drop-shadow-md font-display">
                    {liveStats.totalUsers}
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1">Verified unique Google profile signups</p>
                </div>

                {/* Total Spins */}
                <div className="bg-zinc-950/40 border border-zinc-900 hover:border-neon/30 transition-all p-5 rounded-2xl shadow-md relative group overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-neon/10 to-transparent group-hover:via-neon/60 transition-all" />
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider font-display">Spins Conducted</span>
                    <Gamepad2 className="w-4 h-4 text-neon" />
                  </div>
                  <div className="text-3xl font-black text-zinc-100 tracking-tight drop-shadow-md font-display">
                    {liveStats.totalSpins}
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1">Validated spin events stored in database</p>
                </div>

                {/* Free Website Winners */}
                <div className="bg-neon/5 border border-neon/20 hover:border-neon/40 transition-all p-5 rounded-2xl shadow-md relative group overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-neon/30 to-transparent group-hover:via-neon/75 transition-all" />
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-xs font-black text-neon uppercase tracking-wider font-display">Website Winners</span>
                    <Award className="w-4 h-4 text-neon animate-bounce" />
                  </div>
                  <div className="text-3xl font-black text-neon tracking-tight drop-shadow-[0_0_12px_rgba(57,255,20,0.4)] font-display">
                    {liveStats.freeWebsiteWinners}
                  </div>
                  <p className="text-[10px] text-neon/60 mt-1 font-semibold">WhatsApp setups initiated by lucky winners</p>
                </div>

                {/* Win Rate / Engagement Card */}
                <div className="bg-zinc-950/40 border border-zinc-900 hover:border-neon/30 transition-all p-5 rounded-2xl shadow-md relative group overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-neon/10 to-transparent group-hover:via-neon/60 transition-all" />
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider font-display">Engagement Rate</span>
                    <TrendingUp className="w-4 h-4 text-neon" />
                  </div>
                  <div className="text-3xl font-black text-zinc-100 tracking-tight drop-shadow-md font-display">
                    {liveStats.totalUsers > 0 
                      ? Math.min(100, Math.round((liveStats.totalSpins / liveStats.totalUsers) * 100)) 
                      : 0}%
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1">Spin count vs verified signed-in contenders</p>
                </div>

              </div>

              {/* Contest Rules Summary */}
              <div className="bg-zinc-950/40 border border-zinc-900 p-5 rounded-2xl text-xs text-zinc-400 leading-relaxed">
                <div className="flex items-center gap-2 mb-2 font-bold text-zinc-300 font-display uppercase tracking-wider">
                  <Info className="w-4 h-4 text-neon" />
                  <span>Challenger Directives</span>
                </div>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Only one spin is authorized per verified Google User ID.</li>
                  <li>Refreshing, logout, or navigation during active spins will not reset your turn.</li>
                  <li>Administrators reserve absolute governance over prize fulfillments.</li>
                </ul>
              </div>

            </div>

          </div>
        )}
      </main>

      {/* Admin Control Panel Overlay */}
      <AnimatePresence>
        {showAdminPanel && (
          <AdminPanel
            onClose={() => setShowAdminPanel(false)}
            config={appConfig}
            stats={liveStats}
            currentUserId={currentUser?.uid || ""}
          />
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="relative z-20 w-full py-6 text-center text-[10px] text-zinc-600 border-t border-zinc-900 bg-black/50 mt-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 font-display">
          <div>
            &copy; 2026 Spin & Win Challenge. Powered securely by Google Firebase Auth & Cloud Firestore.
          </div>
          <div className="flex gap-4 items-center">
            <span className="hover:text-zinc-400 cursor-pointer">Security Terms</span>
            <span className="hover:text-zinc-400 cursor-pointer">Fulfillment Disclaimer</span>
            {currentUser && isAdmin && (
              <button 
                onClick={handleAdminAccessAttempt}
                className="text-neon hover:text-neon/80 hover:underline transition-all font-bold"
              >
                Access Admin Portal
              </button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
