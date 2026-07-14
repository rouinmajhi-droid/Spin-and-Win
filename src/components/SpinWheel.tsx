import { useState, useRef, useEffect } from "react";
import { doc, getDoc, updateDoc, setDoc, increment } from "../firebase";
import { db } from "../firebase";
import { Gift, Sparkles, Youtube, Instagram, MessageCircle, AlertCircle, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface SpinWheelProps {
  userId: string;
  userEmail: string;
  hasSpun: boolean;
  onSpinComplete: (outcome: string) => void;
  whatsappNumber: string;
  whatsappMessage: string;
  youtubeLink: string;
  instagramLink: string;
  subscribeLink: string;
  freeWebsiteProbability: number; // e.g. 15 for 15%
  isBlocked: boolean;
  remainingSpins?: number;
}

const SECTORS = [
  { text: "Free Website", color: "#39FF14", index: 0, outcome: "Free Website" },
  { text: "Long Tutorial", color: "#000000", index: 1, outcome: "Long Tutorial" },
  { text: "Subscribe Channel", color: "#111111", index: 2, outcome: "Subscribe Channel" },
  { text: "Free Website", color: "#39FF14", index: 3, outcome: "Free Website" },
  { text: "Long Tutorial", color: "#000000", index: 4, outcome: "Long Tutorial" },
  { text: "Subscribe Channel", color: "#111111", index: 5, outcome: "Subscribe Channel" },
];

export default function SpinWheel({
  userId,
  userEmail,
  hasSpun,
  onSpinComplete,
  whatsappNumber,
  whatsappMessage,
  youtubeLink,
  instagramLink,
  subscribeLink,
  freeWebsiteProbability,
  isBlocked,
  remainingSpins
}: SpinWheelProps) {
  const [spinning, setSpinning] = useState(false);
  const [currentRotation, setCurrentRotation] = useState(0);
  const [wonOutcome, setWonOutcome] = useState<string | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const wheelRef = useRef<HTMLDivElement>(null);

  // Determine the winning slice
  const getOutcomeByWeights = () => {
    const rand = Math.random() * 100;
    
    // Check if user won the Free Website based on admin probability
    if (rand < freeWebsiteProbability) {
      // Free Website slices are at index 0 and 3
      const indices = [0, 3];
      return SECTORS[indices[Math.floor(Math.random() * indices.length)]];
    } else {
      // Remaining slices
      const nonFreeSectors = SECTORS.filter(s => s.outcome !== "Free Website");
      return nonFreeSectors[Math.floor(Math.random() * nonFreeSectors.length)];
    }
  };

  const handleSpin = async () => {
    if (spinning) return;
    const userRemainingSpins = remainingSpins !== undefined ? remainingSpins : (hasSpun ? 0 : 1);
    if (userRemainingSpins <= 0) {
      setErrorMsg("You have already used your spin! Keep scrolling to claim your reward.");
      return;
    }
    if (isBlocked) {
      setErrorMsg("Your account has been restricted by the administrator.");
      return;
    }

    try {
      // Re-verify from DB that they haven't spun yet to avoid multi-click bypass
      const userRef = doc(db, "users", userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const dbRemaining = userData.remainingSpins !== undefined ? userData.remainingSpins : (userData.hasSpun ? 0 : 1);
        if (dbRemaining <= 0) {
          setErrorMsg("Verify: You have already spun!");
          return;
        }
      }

      setErrorMsg("");
      setSpinning(true);

      // Determine outcome
      const selectedSector = getOutcomeByWeights();
      const targetSectorIndex = selectedSector.index;

      // Calculate exact rotation angle
      // Slices are 360 / 6 = 60 degrees each.
      // Index 0 is centered around 0/360 deg, but we spin clockwise so the pointer is at the top (90 degrees).
      // A standard wheel pointer is at 90 deg (top).
      // Slice angle is 60 deg. Center of slice i is i * 60 deg.
      // To land on index i, the wheel must rotate so that (i * 60) lands at the pointer (top/90deg or 270deg offset).
      const extraRotations = 8 + Math.floor(Math.random() * 4); // 8 to 11 full spins
      const targetAngle = (270 - (targetSectorIndex * 60) + 360) % 360;
      const finalAngle = currentRotation + (extraRotations * 360) + targetAngle - (currentRotation % 360);

      setCurrentRotation(finalAngle);

      // Save outcome to DB *immediately* as spinning starts so they cannot refresh or cheat the spin.
      const timestamp = new Date().toISOString();
      await updateDoc(userRef, {
        hasSpun: true,
        spinOutcome: selectedSector.outcome,
        spunAt: timestamp,
        remainingSpins: 0,
      });

      // Update Live Counters
      const statsRef = doc(db, "counters", "stats");
      const isFreeWebsite = selectedSector.outcome === "Free Website";
      
      await setDoc(statsRef, {
        totalSpins: increment(1),
        freeWebsiteWinners: isFreeWebsite ? increment(1) : increment(0),
        otherWinners: isFreeWebsite ? increment(0) : increment(1),
      }, { merge: true });

      // Wait for spin animation to complete
      setTimeout(() => {
        setSpinning(false);
        setWonOutcome(selectedSector.outcome);
        setShowResultModal(true);
        onSpinComplete(selectedSector.outcome);
      }, 5000);

    } catch (err: any) {
      console.error("Spin error:", err);
      setErrorMsg("An error occurred. Please try again.");
      setSpinning(false);
    }
  };

  // Pre-filled encoded WhatsApp link
  const encodedMsg = encodeURIComponent(whatsappMessage);
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMsg}`;

  // Helper to render segment paths for the wheel
  const renderSlices = () => {
    return SECTORS.map((sector, i) => {
      const angle = 60; // 360 / 6
      const startAngleRad = (i * angle - 30) * Math.PI / 180;
      const endAngleRad = ((i + 1) * angle - 30) * Math.PI / 180;
      
      const r = 100;
      const x1 = 100 + r * Math.cos(startAngleRad);
      const y1 = 100 + r * Math.sin(startAngleRad);
      const x2 = 100 + r * Math.cos(endAngleRad);
      const y2 = 100 + r * Math.sin(endAngleRad);

      const d = `M 100 100 L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`;

      // Draw text rotation along the centerline of each sector (i * 60)
      const textRotation = i * angle;
      const needFlip = i === 2 || i === 3 || i === 4;
      
      return (
        <g key={i} className="select-none">
          {/* Slice Path */}
          <path
            d={d}
            fill={i % 2 === 0 ? "#050a05" : "#000000"}
            stroke="#39FF14"
            strokeWidth="1.2"
            className="transition-colors duration-300"
          />
          {/* Glowing edge dots */}
          <circle
            cx={x2}
            cy={y2}
            r="1.8"
            fill="#39FF14"
            className="animate-pulse"
          />
          {/* Slice Label Text: centered, running center-outwards, readable and flipped on left side */}
          <text
            transform={needFlip 
              ? `rotate(${textRotation}, 100, 100) translate(190, 100) rotate(180)` 
              : `rotate(${textRotation}, 100, 100) translate(128, 100)`
            }
            textAnchor="start"
            dominantBaseline="middle"
            fill={sector.outcome === "Free Website" ? "#39FF14" : "#e4e4e7"}
            fontSize="6.0"
            fontWeight={sector.outcome === "Free Website" ? "900" : "bold"}
            className="font-display tracking-wider"
            style={{ textShadow: sector.outcome === "Free Website" ? "0 0 5px rgba(57, 255, 20, 0.85)" : "none" }}
          >
            {sector.text}
          </text>
        </g>
      );
    });
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 relative z-10">
      {/* Outer Glow Wrapper */}
      <div className="relative w-[340px] h-[340px] sm:w-[420px] sm:h-[420px] flex items-center justify-center">
        {/* Pointer Arrow */}
        <div className="absolute top-0 z-30 flex flex-col items-center -mt-2">
          <div className="w-0 h-0 border-l-[16px] border-l-transparent border-r-[16px] border-r-transparent border-t-[28px] border-t-neon drop-shadow-[0_4px_12px_rgba(57,255,20,0.85)]" />
          <div className="w-2.5 h-2.5 rounded-full bg-neon -mt-1 shadow-[0_0_12px_#39FF14]" />
        </div>

        {/* Dynamic Wheel Outer Ring */}
        <div className="absolute inset-0 rounded-full border-8 border-zinc-900 bg-black/95 shadow-[0_0_40px_rgba(57,255,20,0.3)] flex items-center justify-center overflow-hidden">
          {/* Aesthetic outer revolving dashed ring */}
          <div className="absolute inset-2 rounded-full border-2 border-dashed border-neon/30 animate-[spin_40s_linear_infinite]" />
          
          {/* Wheel content container with rotating transform */}
          <div
            ref={wheelRef}
            className="w-[94%] h-[94%] rounded-full relative flex items-center justify-center select-none"
            style={{
              transform: `rotate(${currentRotation}deg)`,
              transition: spinning ? "transform 5000ms cubic-bezier(0.15, 0.85, 0.2, 1)" : "none",
            }}
          >
            {/* Draw Slices SVG */}
            <svg
              viewBox="0 0 200 200"
              className="w-full h-full drop-shadow-[0_0_20px_rgba(57,255,20,0.2)]"
            >
              <defs>
                <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#39FF14" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#090f09" stopOpacity="0" />
                </radialGradient>
              </defs>
              {renderSlices()}
            </svg>
          </div>
        </div>

        {/* Wheel Center Spin Button / Hub */}
        <button
          onClick={handleSpin}
          disabled={spinning || hasSpun || isBlocked}
          id="wheel-spin-button"
          className={`absolute z-20 w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-neon flex items-center justify-center cursor-pointer select-none transition-all duration-300 shadow-[0_0_25px_rgba(57,255,20,0.7)] overflow-hidden group
            ${spinning 
              ? "border-zinc-800 cursor-not-allowed scale-95" 
              : hasSpun 
                ? "border-neon/40" 
                : "border-neon hover:scale-105 active:scale-95"
            }`}
        >
          {/* Circular User Portrait Background */}
          <img
            src="/src/assets/images/rabin_developer_1783964265571.jpg"
            alt="Rabin Developer"
            referrerPolicy="no-referrer"
            className={`absolute inset-0 w-full h-full object-cover rounded-full transition-transform duration-500
              ${spinning ? "animate-pulse" : "group-hover:scale-110"}`}
          />
          {/* Overlay to ensure text readability */}
          <div className="absolute inset-0 bg-black/50 group-hover:bg-black/40 transition-colors duration-300 rounded-full" />
          
          {/* SPIN text over the top */}
          <div className="relative z-10 flex flex-col items-center justify-center text-center">
            {spinning ? (
              <RefreshCw className="w-5 h-5 animate-spin text-neon drop-shadow-[0_0_8px_#39FF14]" />
            ) : hasSpun ? (
              <Gift className="w-5 h-5 text-neon/80 drop-shadow-[0_0_8px_#39FF14]" />
            ) : (
              <>
                <Sparkles className="w-4 h-4 mb-0.5 text-neon drop-shadow-[0_0_8px_#39FF14] group-hover:scale-125 transition-transform" />
                <span className="font-display font-black tracking-wider text-[10px] text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">SPIN</span>
              </>
            )}
          </div>
        </button>
      </div>

      {/* Helper text / error notifications */}
      <div className="mt-6 text-center max-w-sm px-4">
        {errorMsg ? (
          <div className="flex items-center gap-2 text-rose-400 bg-rose-950/40 border border-rose-900/50 px-3.5 py-2.5 rounded-lg text-sm shadow-md">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="text-left">{errorMsg}</span>
          </div>
        ) : hasSpun ? (
          <div className="flex items-center gap-2 text-neon bg-zinc-950/60 border border-neon/30 px-3.5 py-2 rounded-lg text-sm shadow-md animate-pulse">
            <Gift className="w-4 h-4 text-neon" />
            <span>Success! Click the claim button below.</span>
          </div>
        ) : (
          <p className="text-zinc-400 text-xs sm:text-sm tracking-wide">
            Test your luck! You have <strong className="text-neon">1 spin only</strong>.
          </p>
        )}
      </div>

      {/* Result dialog */}
      <AnimatePresence>
        {showResultModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              id="spin-result-modal"
              className="bg-[#050505] border border-neon/30 p-6 sm:p-8 rounded-2xl max-w-md w-full text-center shadow-[0_0_50px_rgba(57,255,20,0.15)] relative overflow-hidden"
            >
              {/* Decorative top green laser glow */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-neon to-transparent shadow-[0_0_12px_#39FF14]" />

              <div className="mx-auto w-16 h-16 bg-zinc-950 border border-neon/40 rounded-full flex items-center justify-center mb-4">
                <Gift className="w-8 h-8 text-neon animate-bounce" />
              </div>

              <h3 className="text-2xl font-bold text-zinc-100 tracking-tight font-display">
                CONGRATULATIONS!
              </h3>
              <p className="text-zinc-400 text-sm mt-1">
                You spun the wheel and won:
              </p>

              <div className="my-6 p-4 rounded-xl bg-zinc-950 border border-neon/20 shadow-inner">
                <span className="text-3xl font-black text-neon tracking-tight block drop-shadow-[0_0_10px_rgba(57,255,20,0.4)] font-display">
                  {wonOutcome}
                </span>
              </div>

              {/* Specific Reward Redirection CTA */}
              {wonOutcome === "Free Website" && (
                <div className="space-y-4">
                  <p className="text-zinc-300 text-xs sm:text-sm">
                    Amazing! To claim your <strong className="text-neon">Free Website Setup</strong>, send a message to our developers on WhatsApp.
                  </p>
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 px-5 rounded-xl transition-all shadow-[0_4px_12px_rgba(16,185,129,0.3)] hover:shadow-[0_4px_16px_rgba(16,185,129,0.5)] font-display text-sm tracking-wide"
                  >
                    <MessageCircle className="w-5 h-5" />
                    Claim on WhatsApp
                  </a>
                </div>
              )}

              {wonOutcome === "Long Tutorial" && (
                <div className="space-y-4">
                  <p className="text-zinc-300 text-xs sm:text-sm">
                    Unlock elite developer knowledge! Click below to access your video tutorial.
                  </p>
                  <a
                    href={youtubeLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white font-semibold py-3 px-5 rounded-xl transition-all shadow-[0_4px_12px_rgba(220,38,38,0.3)] font-display text-sm tracking-wide"
                  >
                    <Youtube className="w-5 h-5" />
                    Watch Tutorial Video
                  </a>
                </div>
              )}

              {wonOutcome === "Subscribe Channel" && (
                <div className="space-y-4">
                  <p className="text-zinc-300 text-xs sm:text-sm">
                    Support our channel and get notified when premium courses are launched!
                  </p>
                  <a
                    href={subscribeLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold py-3 px-5 rounded-xl transition-all shadow-[0_4px_12px_rgba(225,29,72,0.3)] font-display text-sm tracking-wide"
                  >
                    <Youtube className="w-5 h-5" />
                    Subscribe to YouTube
                  </a>
                </div>
              )}

              <button
                onClick={() => setShowResultModal(false)}
                className="mt-4 text-xs text-zinc-500 hover:text-zinc-300 underline underline-offset-4 font-medium block mx-auto py-1"
              >
                Close Window
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
