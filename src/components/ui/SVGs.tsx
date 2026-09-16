import React from 'react';

export const BotanicalSVG = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
    <svg viewBox="0 0 100 100" className={className} style={style} fill="none">
        <path d="M50,100 C50,100 20,80 20,50 C20,20 50,0 50,0 C50,0 80,20 80,50 C80,80 50,100 50,100 Z" fill="currentColor" opacity="0.1"/>
        <path d="M50,100 Q40,50 10,40 Q40,40 50,0 Q60,40 90,40 Q60,50 50,100 Z" fill="currentColor" opacity="0.15"/>
    </svg>
);

export const BotanicalCrestSVG = ({ size = "48", color }: { size?: string; color: string }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        <circle cx="32" cy="32" r="31" stroke={color} strokeWidth="1.5" strokeDasharray="4 4" opacity="0.6"/>
        <path d="M32 12C32 12 22 20 22 32C22 44 32 52 32 52C32 52 42 44 42 32C42 20 32 12 32 12Z" stroke={color} strokeWidth="2"/>
        <path d="M32 12V52" stroke={color} strokeWidth="2"/>
        <circle cx="32" cy="32" r="6" fill={color} opacity="0.2"/>
    </svg>
);

export const RouletteWheelSVG = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 100 100" className={className} fill="none">
        <circle cx="50" cy="50" r="48" fill="#FDFBF7" stroke="#A4C3A2" strokeWidth="4"/>
        <circle cx="50" cy="50" r="42" fill="#F4EAD5" stroke="#8C6B52" strokeWidth="1" opacity="0.3"/>
        {[0, 30, 60, 90, 120, 150].map(deg => (
            <line key={deg} x1="50" y1="2" x2="50" y2="98" stroke="#A4C3A2" strokeWidth="1" transform={`rotate(${deg} 50 50)`} opacity="0.5"/>
        ))}
        <circle cx="50" cy="50" r="10" fill="#4A3219"/>
        <circle cx="50" cy="50" r="4" fill="#D4AF37"/>
    </svg>
);
