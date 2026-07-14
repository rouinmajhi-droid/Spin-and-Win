import { useState, useEffect, FormEvent } from "react";
import { db, doc, updateDoc, setDoc, collection, getDocs } from "../firebase";
import { AppConfig, LiveStats, UserProfile } from "../types";
import { 
  Settings, 
  Users, 
  TrendingUp, 
  Save, 
  UserX, 
  UserCheck, 
  ShieldAlert, 
  Search, 
  Smartphone, 
  HelpCircle,
  X,
  Sliders,
  CheckCircle,
  Clock,
  User as UserIcon,
  HelpCircle as QuestionIcon,
  RefreshCw
} from "lucide-react";

interface AdminPanelProps {
  onClose: () => void;
  config: AppConfig;
  stats: LiveStats;
  currentUserId: string;
}

export default function AdminPanel({ onClose, config, stats, currentUserId }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<"settings" | "counters" | "users">("settings");
  
  // Settings Form State
  const [whatsappNumber, setWhatsappNumber] = useState(config.whatsappNumber);
  const [whatsappMessage, setWhatsappMessage] = useState(config.whatsappMessage);
  const [youtubeLink, setYoutubeLink] = useState(config.youtubeLink);
  const [instagramLink, setInstagramLink] = useState(config.instagramLink);
  const [subscribeLink, setSubscribeLink] = useState(config.subscribeLink);
  const [freeWebsiteProbability, setFreeWebsiteProbability] = useState(config.freeWebsiteProbability);
  
  // Stats Form State
  const [totalUsers, setTotalUsers] = useState(stats.totalUsers);
  const [totalSpins, setTotalSpins] = useState(stats.totalSpins);
  const [freeWebsiteWinners, setFreeWebsiteWinners] = useState(stats.freeWebsiteWinners);
  const [otherWinners, setOtherWinners] = useState(stats.otherWinners);

  // Users State
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Spin Reset State
  const [resetTarget, setResetTarget] = useState("");
  const [resetCount, setResetCount] = useState(1);
  const [resetStatus, setResetStatus] = useState({ success: false, error: "" });
  const [isResetting, setIsResetting] = useState(false);
  
  // Status feedback
  const [saveStatus, setSaveStatus] = useState({ success: false, msg: "" });

  // Fetch all users
  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      const list: UserProfile[] = [];
      querySnapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as UserProfile);
      });
      // Sort: newest first, or blocked first
      list.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      setUsersList(list);
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (activeTab === "users") {
      fetchUsers();
    }
  }, [activeTab]);

  const handleSaveSettings = async (e: FormEvent) => {
    e.preventDefault();
    setSaveStatus({ success: false, msg: "" });
    try {
      const configRef = doc(db, "config", "settings");
      await setDoc(configRef, {
        whatsappNumber,
        whatsappMessage,
        youtubeLink,
        instagramLink,
        subscribeLink,
        freeWebsiteProbability: Number(freeWebsiteProbability),
      }, { merge: true });

      setSaveStatus({ success: true, msg: "Configuration updated successfully!" });
      setTimeout(() => setSaveStatus({ success: false, msg: "" }), 3000);
    } catch (err: any) {
      setSaveStatus({ success: false, msg: "Failed to update configuration: " + err.message });
    }
  };

  const handleResetSpin = async (targetEmailOrId: string, count: number) => {
    if (!targetEmailOrId.trim()) {
      setResetStatus({ success: false, error: "Please enter a valid challenger email or user ID." });
      return;
    }
    
    setIsResetting(true);
    setResetStatus({ success: false, error: "" });
    
    try {
      // Find user in local list first to verify
      const matchedUser = usersList.find(u => 
        u.id === targetEmailOrId.trim() || 
        u.email.toLowerCase() === targetEmailOrId.trim().toLowerCase()
      );
      
      const userIdToUpdate = matchedUser ? matchedUser.id : targetEmailOrId.trim();
      
      const userRef = doc(db, "users", userIdToUpdate);
      await updateDoc(userRef, {
        hasSpun: false,
        remainingSpins: Number(count),
        spinOutcome: null,
        spunAt: null
      });
      
      setResetStatus({ success: true, error: "" });
      setResetTarget("");
      
      // Update local state if the user exists in our current list
      setUsersList(prev => 
        prev.map(u => u.id === userIdToUpdate 
          ? { ...u, hasSpun: false, remainingSpins: Number(count), spinOutcome: null, spunAt: null } 
          : u
        )
      );
      
      setTimeout(() => setResetStatus({ success: false, error: "" }), 4000);
    } catch (err: any) {
      setResetStatus({ success: false, error: "Failed to reset spin status: " + err.message });
    } finally {
      setIsResetting(false);
    }
  };

  const handleSaveCounters = async (e: FormEvent) => {
    e.preventDefault();
    setSaveStatus({ success: false, msg: "" });
    try {
      const statsRef = doc(db, "counters", "stats");
      await setDoc(statsRef, {
        totalUsers: Number(totalUsers),
        totalSpins: Number(totalSpins),
        freeWebsiteWinners: Number(freeWebsiteWinners),
        otherWinners: Number(otherWinners),
      }, { merge: true });

      setSaveStatus({ success: true, msg: "Counters updated successfully!" });
      setTimeout(() => setSaveStatus({ success: false, msg: "" }), 3000);
    } catch (err: any) {
      setSaveStatus({ success: false, msg: "Failed to update counters: " + err.message });
    }
  };

  const handleToggleBlockUser = async (user: UserProfile) => {
    try {
      const userRef = doc(db, "users", user.id);
      const newBlockedState = !user.blocked;
      
      await updateDoc(userRef, {
        blocked: newBlockedState
      });

      // Update local state
      setUsersList(prev => 
          prev.map(u => u.id === user.id ? { ...u, blocked: newBlockedState } : u)
      );
    } catch (err: any) {
      alert("Error toggling block state: " + err.message);
    }
  };

  const filteredUsers = usersList.filter(user => 
    user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.spinOutcome && user.spinOutcome.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-40 bg-black/90 backdrop-blur-md flex justify-center items-start overflow-y-auto p-4 md:p-8">
      <div id="admin-panel-container" className="bg-[#050505] border border-neon/20 rounded-2xl w-full max-w-4xl shadow-[0_0_50px_rgba(57,255,20,0.15)] overflow-hidden my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-black border-b border-zinc-900">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-zinc-950 border border-neon/30 text-neon">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-zinc-100 tracking-tight font-display uppercase">Admin Control Panel</h2>
              <p className="text-xs text-zinc-400 font-display">Configure parameters, override metrics, and govern users</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-zinc-900 bg-[#080808] p-2 gap-2">
          <button
            onClick={() => setActiveTab("settings")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider font-bold font-display transition-all cursor-pointer ${
              activeTab === "settings" 
                ? "bg-neon/10 text-neon border border-neon/30 shadow-[0_0_15px_rgba(57,255,20,0.15)]" 
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
            }`}
          >
            <Settings className="w-4 h-4" />
            Redirection Links
          </button>

          <button
            onClick={() => setActiveTab("counters")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider font-bold font-display transition-all cursor-pointer ${
              activeTab === "counters" 
                ? "bg-neon/10 text-neon border border-neon/30 shadow-[0_0_15px_rgba(57,255,20,0.15)]" 
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Live Counters Overrides
          </button>

          <button
            onClick={() => setActiveTab("users")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider font-bold font-display transition-all cursor-pointer ${
              activeTab === "users" 
                ? "bg-neon/10 text-neon border border-neon/30 shadow-[0_0_15px_rgba(57,255,20,0.15)]" 
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
            }`}
          >
            <Users className="w-4 h-4" />
            Users Ledger ({usersList.length || "..."})
          </button>
        </div>

        {/* Feedback Alerts */}
        {saveStatus.msg && (
          <div className={`mx-6 mt-4 p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 font-display uppercase tracking-wide ${
            saveStatus.success 
              ? "bg-neon/10 border-neon/30 text-neon" 
              : "bg-rose-950/40 border-rose-900/50 text-rose-400"
          }`}>
            <CheckCircle className="w-4 h-4" />
            {saveStatus.msg}
          </div>
        )}

        {/* Tab Contents */}
        <div className="p-6">
          
          {/* TAB 1: Redirection Links */}
          {activeTab === "settings" && (
            <form onSubmit={handleSaveSettings} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 font-display">
                    WhatsApp Number (International format, no + or spaces)
                  </label>
                  <input
                    type="text"
                    required
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 focus:border-neon rounded-xl px-4 py-2.5 text-sm text-zinc-100 outline-none transition-colors font-mono"
                    placeholder="e.g. 1234567890"
                  />
                  <span className="text-[11px] text-zinc-500 mt-1 block">Pre-filled messages will route to this WhatsApp line.</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 font-display">
                    Free Website Winner Odds (%)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    max="100"
                    value={freeWebsiteProbability}
                    onChange={(e) => setFreeWebsiteProbability(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-850 focus:border-neon rounded-xl px-4 py-2.5 text-sm text-zinc-100 outline-none transition-colors font-mono"
                    placeholder="e.g. 15"
                  />
                  <span className="text-[11px] text-zinc-500 mt-1 block">Adjusts win weight. Remainder split between other options.</span>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 font-display">
                    WhatsApp Pre-filled Message Text
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={whatsappMessage}
                    onChange={(e) => setWhatsappMessage(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 focus:border-neon rounded-xl px-4 py-2.5 text-sm text-zinc-100 outline-none transition-colors"
                    placeholder="Hello! I won a free website..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 font-display">
                    "Long Tutorial" Redirect Link
                  </label>
                  <input
                    type="url"
                    required
                    value={youtubeLink}
                    onChange={(e) => setYoutubeLink(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 focus:border-neon rounded-xl px-4 py-2.5 text-sm text-zinc-100 outline-none transition-colors font-mono"
                    placeholder="YouTube video link"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 font-display">
                    "Instagram/Social" URL (Aesthetic fallback)
                  </label>
                  <input
                    type="url"
                    required
                    value={instagramLink}
                    onChange={(e) => setInstagramLink(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 focus:border-neon rounded-xl px-4 py-2.5 text-sm text-zinc-100 outline-none transition-colors font-mono"
                    placeholder="Instagram link"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 font-display">
                    "Subscribe Channel" Subscription Link
                  </label>
                  <input
                    type="url"
                    required
                    value={subscribeLink}
                    onChange={(e) => setSubscribeLink(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 focus:border-neon rounded-xl px-4 py-2.5 text-sm text-zinc-100 outline-none transition-colors font-mono"
                    placeholder="YouTube channel sub_confirmation URL"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-zinc-900">
                <button
                  type="submit"
                  className="flex items-center gap-2 bg-neon hover:bg-neon/90 text-black px-5 py-2.5 rounded-xl font-bold text-xs font-display uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(57,255,20,0.3)] cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  Save Changes
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: Live Counters Overrides */}
          {activeTab === "counters" && (
            <form onSubmit={handleSaveCounters} className="space-y-5">
              <p className="text-xs text-zinc-400 italic mb-4 font-display">
                * Note: Modifying these fields directly overrides the real-time counters visible on the public statistics boards.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 font-display">
                    Total Registered Users
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={totalUsers}
                    onChange={(e) => setTotalUsers(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-850 focus:border-neon rounded-xl px-4 py-2.5 text-sm text-zinc-100 outline-none transition-colors font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 font-display">
                    Total Spins Conducted
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={totalSpins}
                    onChange={(e) => setTotalSpins(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-850 focus:border-neon rounded-xl px-4 py-2.5 text-sm text-zinc-100 outline-none transition-colors font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 font-display">
                    Free Website Winners
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={freeWebsiteWinners}
                    onChange={(e) => setFreeWebsiteWinners(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-850 focus:border-neon rounded-xl px-4 py-2.5 text-sm text-zinc-100 outline-none transition-colors font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 font-display">
                    Other Winners (Tutorials, Instagram, Subs)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={otherWinners}
                    onChange={(e) => setOtherWinners(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-850 focus:border-neon rounded-xl px-4 py-2.5 text-sm text-zinc-100 outline-none transition-colors font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-zinc-900">
                <button
                  type="submit"
                  className="flex items-center gap-2 bg-neon hover:bg-neon/90 text-black px-5 py-2.5 rounded-xl font-bold text-xs font-display uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(57,255,20,0.3)] cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  Override Counters
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: Users Ledger */}
          {activeTab === "users" && (
            <div className="space-y-4">
              {/* Spin Reset Console */}
              <div className="bg-[#050505] border border-neon/20 p-5 rounded-2xl shadow-[0_0_20px_rgba(57,255,20,0.05)]">
                <div className="flex items-center gap-2 mb-3">
                  <RefreshCw className="w-4 h-4 text-neon animate-pulse" />
                  <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider font-display">Manual Spin Reset Console</h4>
                </div>
                <p className="text-[11px] text-zinc-400 mb-4 font-display leading-normal">
                  Manually restore spin privileges for any challenger. Enter their email address or unique User ID, specify the authorized spin allowance, and run the reset protocol to re-enable their "Spin Now" launcher.
                </p>
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleResetSpin(resetTarget, resetCount);
                  }}
                  className="grid grid-cols-1 md:grid-cols-12 gap-3"
                >
                  <div className="md:col-span-6">
                    <input
                      type="text"
                      required
                      placeholder="Enter Challenger Email or User ID..."
                      value={resetTarget}
                      onChange={(e) => setResetTarget(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-850 focus:border-neon rounded-xl px-4 py-2 text-xs text-zinc-100 outline-none transition-colors font-mono placeholder:text-zinc-600"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <input
                      type="number"
                      required
                      min="1"
                      max="10"
                      placeholder="Spins Allowed..."
                      value={resetCount}
                      onChange={(e) => setResetCount(Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-850 focus:border-neon rounded-xl px-4 py-2 text-xs text-zinc-100 outline-none transition-colors font-mono text-center"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <button
                      type="submit"
                      disabled={isResetting}
                      className="w-full h-full flex items-center justify-center gap-1.5 bg-neon hover:bg-neon/90 disabled:opacity-50 text-black px-4 py-2 rounded-xl font-bold text-xs font-display uppercase tracking-wider transition-all cursor-pointer shadow-[0_0_10px_rgba(57,255,20,0.15)]"
                    >
                      {isResetting ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5" />
                      )}
                      <span>Restore Spin</span>
                    </button>
                  </div>
                </form>

                {resetStatus.error && (
                  <p className="text-[11px] text-rose-400 mt-2 font-semibold font-display">
                    ✕ {resetStatus.error}
                  </p>
                )}
                {resetStatus.success && (
                  <p className="text-[11px] text-neon mt-2 font-semibold font-display">
                    ✓ Spin privileges and allowance successfully reinstated!
                  </p>
                )}
              </div>

              {/* Search Bar */}
              <div className="flex items-center gap-3 bg-zinc-950 border border-zinc-850 focus-within:border-neon/50 rounded-xl px-4 py-2.5 transition-colors">
                <Search className="w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search by name, email or prize outcome..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent text-sm text-zinc-100 outline-none w-full font-display"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="text-zinc-500 hover:text-zinc-300 cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* User List Table */}
              <div className="border border-zinc-900 rounded-xl overflow-hidden bg-black/40">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-black border-b border-zinc-900 text-zinc-400 font-medium font-display">
                        <th className="p-4 text-xs font-bold uppercase tracking-wider">User Profile</th>
                        <th className="p-4 text-xs font-bold uppercase tracking-wider">Spin State</th>
                        <th className="p-4 text-xs font-bold uppercase tracking-wider">Outcome</th>
                        <th className="p-4 text-xs font-bold uppercase tracking-wider">Reg Date</th>
                        <th className="p-4 text-xs font-bold uppercase tracking-wider text-right">Governing Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900 font-display">
                      {loadingUsers ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-zinc-400">
                            <div className="flex items-center justify-center gap-2">
                              <RefreshCw className="w-4 h-4 animate-spin text-neon" />
                              Fetching User Database...
                            </div>
                          </td>
                        </tr>
                      ) : filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-zinc-500">
                            No users matched your search keywords.
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((user) => {
                          const isCurrentUser = user.id === currentUserId;
                          return (
                            <tr key={user.id} className={`hover:bg-zinc-950/40 transition-colors ${user.blocked ? "bg-rose-950/10" : ""}`}>
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <img 
                                    src={user.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&q=80"} 
                                    alt={user.displayName}
                                    referrerPolicy="no-referrer"
                                    className="w-9 h-9 rounded-full border border-zinc-800 object-cover"
                                  />
                                  <div>
                                    <div className="font-bold text-zinc-200 flex items-center gap-1.5 text-xs sm:text-sm">
                                      {user.displayName}
                                      {isCurrentUser && (
                                        <span className="text-[9px] bg-neon/20 text-neon px-1.5 py-0.5 rounded uppercase font-black">You</span>
                                      )}
                                    </div>
                                    <div className="text-xs text-zinc-500 font-mono">{user.email}</div>
                                  </div>
                                </div>
                              </td>

                              <td className="p-4">
                                {user.hasSpun && (!user.remainingSpins || user.remainingSpins <= 0) ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-neon bg-neon/10 border border-neon/30 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                    <CheckCircle className="w-3 h-3" />
                                    Spun
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-950/20 border border-amber-900/30 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                    <Clock className="w-3 h-3" />
                                    {user.remainingSpins && user.remainingSpins > 0 ? `${user.remainingSpins} Spins Left` : "Ready"}
                                  </span>
                                )}
                              </td>

                              <td className="p-4 font-bold text-zinc-300 text-xs sm:text-sm">
                                {user.spinOutcome ? (
                                  <span className={user.spinOutcome === "Free Website" ? "text-neon font-black drop-shadow-[0_0_6px_rgba(57,255,20,0.3)]" : ""}>
                                    {user.spinOutcome}
                                  </span>
                                ) : (
                                  <span className="text-zinc-600 italic">—</span>
                                )}
                              </td>

                              <td className="p-4 text-xs text-zinc-500 font-mono">
                                {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}
                              </td>

                              <td className="p-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {user.hasSpun && (
                                    <button
                                      onClick={() => handleResetSpin(user.id, 1)}
                                      className="inline-flex items-center gap-1 bg-neon/15 hover:bg-neon/30 text-neon border border-neon/30 px-2.5 py-1.5 rounded-lg text-[10px] uppercase tracking-wider font-bold transition-all cursor-pointer select-none"
                                      title="Restore 1 Spin Allowance"
                                    >
                                      <RefreshCw className="w-3 h-3" />
                                      <span>Restore Spin</span>
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleToggleBlockUser(user)}
                                    disabled={isCurrentUser}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-wider font-bold transition-all select-none
                                      ${user.blocked
                                        ? "bg-neon/10 hover:bg-neon/20 text-neon border border-neon/30"
                                        : "bg-rose-950/20 hover:bg-rose-900/30 text-rose-400 border border-rose-500/30"
                                      }
                                      ${isCurrentUser ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                                    `}
                                  >
                                    {user.blocked ? (
                                      <>
                                        <UserCheck className="w-3.5 h-3.5" />
                                        Unblock
                                      </>
                                    ) : (
                                      <>
                                        <UserX className="w-3.5 h-3.5" />
                                        Block
                                      </>
                                    )}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
