import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

interface Particle {
  id: number;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  color: string;
  size: number;
  delay: number;
  shape: 'rect' | 'circle' | 'star';
}

const COLORS = [
  '#10B981', // Emerald
  '#059669', // Dark emerald
  '#FF146B', // Brand Pink
  '#F59E0B', // Amber
  '#FCD34D', // Gold
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
];

export const CelebrationConfetti: React.FC = () => {
  // Generate a fixed set of subtle particles so render is deterministic
  const particles: Particle[] = useMemo(() => {
    const list: Particle[] = [];
    const count = 30;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * 2 * Math.PI + (Math.random() * 0.4 - 0.2);
      const distance = 80 + Math.random() * 140; // Subtle radius around the badge
      const x = Math.cos(angle) * distance;
      // Bias slightly upwards so it feels like a cheerful upward pop
      const y = Math.sin(angle) * distance - (40 + Math.random() * 60);

      list.push({
        id: i,
        x,
        y,
        rotation: Math.random() * 360,
        scale: 0.8 + Math.random() * 0.5,
        color: COLORS[i % COLORS.length],
        size: i % 3 === 0 ? 9 : 6,
        delay: 0.05 + Math.random() * 0.15,
        shape: i % 4 === 0 ? 'star' : i % 3 === 0 ? 'circle' : 'rect',
      });
    }

    return list;
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-20 flex items-center justify-center">
      {/* Expanding subtle celebration rings behind checkmark */}
      <motion.div
        initial={{ scale: 0.4, opacity: 0.8 }}
        animate={{ scale: 2.2, opacity: 0 }}
        transition={{ duration: 1.4, ease: 'easeOut' }}
        className="absolute w-24 h-24 rounded-full border-2 border-emerald-400/60 pointer-events-none"
      />
      <motion.div
        initial={{ scale: 0.6, opacity: 0.6 }}
        animate={{ scale: 2.8, opacity: 0 }}
        transition={{ duration: 1.8, delay: 0.15, ease: 'easeOut' }}
        className="absolute w-24 h-24 rounded-full border border-[#ff146b]/40 pointer-events-none"
      />

      {/* Confetti pieces bursting outwards */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{
            x: 0,
            y: 0,
            scale: 0,
            opacity: 1,
            rotate: 0,
          }}
          animate={{
            x: p.x,
            y: p.y + 40, // Drifts downward gently
            scale: [0, p.scale, p.scale * 0.7, 0],
            opacity: [0, 1, 1, 0],
            rotate: p.rotation + 180,
          }}
          transition={{
            duration: 1.6 + Math.random() * 0.4,
            delay: p.delay,
            ease: [0.16, 1, 0.3, 1],
          }}
          style={{
            position: 'absolute',
            width: p.size,
            height: p.shape === 'rect' ? p.size * 1.6 : p.size,
            backgroundColor: p.shape === 'star' ? 'transparent' : p.color,
            borderRadius: p.shape === 'circle' ? '50%' : p.shape === 'rect' ? '2px' : '0',
          }}
        >
          {p.shape === 'star' && (
            <svg
              viewBox="0 0 24 24"
              fill={p.color}
              className="w-full h-full drop-shadow-xs"
            >
              <polygon points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9" />
            </svg>
          )}
        </motion.div>
      ))}
    </div>
  );
};
