import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  color: string;
  shadowColor: string;
  decay: number;
  isSpark?: boolean;
}

interface PopCircle {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
  shadowColor: string;
}

const NEON_COLORS = [
  { rgb: "255, 0, 127", hex: "#ff007f" }, // Magenta
  { rgb: "0, 240, 255", hex: "#00f0ff" }, // Cyan
  { rgb: "255, 230, 0", hex: "#ffe600" }, // Yellow
  { rgb: "255, 90, 0", hex: "#ff5a00" },  // Orange
  { rgb: "180, 0, 255", hex: "#b400ff" }, // Purple
  { rgb: "0, 102, 255", hex: "#0066ff" }, // Blue
  { rgb: "57, 255, 20", hex: "#39ff14" },  // Neon Green
];

export default function InteractiveBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];
    let popCircles: PopCircle[] = [];

    // Resize canvas
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();

    const resizeObserver = new ResizeObserver(() => {
      resizeCanvas();
    });
    resizeObserver.observe(document.body);

    // Mouse Move event
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      mouseRef.current.active = true;

      // Add a floating green trail particle
      if (Math.random() < 0.6) {
        particles.push({
          x: e.clientX,
          y: e.clientY,
          vx: (Math.random() - 0.5) * 1.5,
          vy: -Math.random() * 1.5 - 0.5, // Drift upwards
          radius: Math.random() * 4 + 1.5,
          alpha: 1.0,
          color: `rgba(${Math.floor(Math.random() * 50)}, ${Math.floor(Math.random() * 105) + 150}, ${Math.floor(Math.random() * 50)}, `,
          shadowColor: "#39FF14",
          decay: Math.random() * 0.015 + 0.008,
        });
      }
    };

    // Click event (Balloon Popping Effect)
    const handleClick = (e: MouseEvent) => {
      const clickX = e.clientX;
      const clickY = e.clientY;

      // Pick a random primary accent color for the popped circle
      const randomColor = NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)];

      // 1. Create a "Balloon pop" ripple ring
      popCircles.push({
        x: clickX,
        y: clickY,
        radius: 2,
        maxRadius: Math.random() * 45 + 35,
        alpha: 1.0,
        color: randomColor.rgb,
        shadowColor: randomColor.hex,
      });

      // 2. Create exploding multi-colored pieces (sparks/shreds of the "balloon")
      const numSparks = Math.floor(Math.random() * 15) + 15;
      for (let i = 0; i < numSparks; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 6 + 2;
        const sparkColor = NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)];
        
        particles.push({
          x: clickX,
          y: clickY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: Math.random() * 5 + 2,
          alpha: 1.0,
          color: `rgba(${sparkColor.rgb}, `,
          shadowColor: sparkColor.hex,
          decay: Math.random() * 0.03 + 0.015,
          isSpark: true,
        });
      }
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("click", handleClick);
    window.addEventListener("mouseleave", handleMouseLeave);

    // Animation Loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Background gradient grid
      ctx.fillStyle = "rgba(5, 5, 5, 0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Update & Draw Pop Circles (The Balloon Ring pop effect)
      popCircles = popCircles.filter((circle) => {
        circle.radius += (circle.maxRadius - circle.radius) * 0.15;
        circle.alpha -= 0.04;

        if (circle.alpha <= 0) return false;

        ctx.beginPath();
        ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${circle.color}, ${circle.alpha})`;
        ctx.lineWidth = 3;
        ctx.stroke();

        // Draw dotted popping outer segments to look like balloon shredding
        ctx.beginPath();
        ctx.arc(circle.x, circle.y, circle.radius + 5, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${circle.color}, ${circle.alpha * 0.5})`;
        ctx.setLineDash([5, 8]);
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.setLineDash([]);

        return true;
      });

      // Update & Draw Particles (floating trails + popping sparks)
      particles = particles.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;

        if (p.isSpark) {
          // Spark particles have gravity and air resistance
          p.vy += 0.1; // gravity
          p.vx *= 0.96; // air resistance
          p.vy *= 0.96;
        } else {
          // Floating particles float up gently
          p.vx += (Math.random() - 0.5) * 0.1;
        }

        if (p.alpha <= 0 || p.radius <= 0) return false;

        // Draw particle with glow
        ctx.save();
        ctx.shadowBlur = p.isSpark ? 12 : 6;
        ctx.shadowColor = p.shadowColor;
        ctx.fillStyle = p.color + p.alpha + ")";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        return true;
      });

      // Ambient floating neon dust (spawn occasional background particles)
      if (Math.random() < 0.15) {
        particles.push({
          x: Math.random() * canvas.width,
          y: canvas.height + 10,
          vx: (Math.random() - 0.5) * 0.5,
          vy: -Math.random() * 0.8 - 0.2,
          radius: Math.random() * 2 + 1,
          alpha: 0.8,
          color: `rgba(57, 255, 20, `,
          shadowColor: "#39FF14",
          decay: Math.random() * 0.005 + 0.002,
        });
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("click", handleClick);
      window.removeEventListener("mouseleave", handleMouseLeave);
      resizeObserver.disconnect();
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="fixed inset-0 w-full h-full pointer-events-none z-0 overflow-hidden" style={{ background: "#050505" }}>
      {/* Grid Overlay from Immersive UI */}
      <div className="absolute inset-0 opacity-[0.06] pointer-events-none" style={{ backgroundImage: "radial-gradient(#39FF14 1.5px, transparent 1.5px)", backgroundSize: "32px 32px" }}></div>
      {/* Top right & bottom left ambient glow filters */}
      <div className="absolute top-[-10%] right-[-5%] w-[450px] h-[450px] bg-[#39FF14] rounded-full blur-[180px] opacity-[0.06] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-5%] w-[350px] h-[350px] bg-[#39FF14] rounded-full blur-[150px] opacity-[0.06] pointer-events-none"></div>
      <canvas
        id="interactive-bg-canvas"
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-[9999]"
      />
    </div>
  );
}
