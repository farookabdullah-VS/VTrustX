import React from 'react';
import './Logo.css';

export function Logo({
    size = 40,
    variant = 'full', // 'full', 'icon', 'monogram', 'saudi-foundation', 'saudi-vision'
    color = 'var(--primary-color, #00F5FF)',
    textColor = 'var(--text-main, #1A1C21)',
    showText = true,
    className = '',
    spinning = false
}) {
    const iconSize = size;
    const secondaryColor = '#8B5CF6'; // Deep Purple
    const bananaAccent = '#FFE135'; // Neon Banana Yellow

    const LogoIcon = () => (
        <div className={spinning ? 'logo-spinning' : ''} style={{ position: 'relative', width: iconSize, height: iconSize, flexShrink: 0 }}>
            <svg width={iconSize} height={iconSize} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="logo_grad_main" x1="10" y1="10" x2="90" y2="90" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor={color} />
                        <stop offset="100%" stopColor={secondaryColor} />
                    </linearGradient>
                    <linearGradient id="logo_grad_glow" x1="50" y1="0" x2="50" y2="100" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor={color} stopOpacity="0.8" />
                        <stop offset="100%" stopColor={bananaAccent} stopOpacity="0" />
                    </linearGradient>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* Background Glow */}
                <circle cx="50" cy="50" r="40" fill="url(#logo_grad_glow)" opacity="0.1" />

                {/* Stylized X Shape - Unique Nano/Tech Style */}
                <g filter="url(#glow)">
                    {/* Primary Stroke (Tech Blue) */}
                    <path
                        d="M20 20 L 45 50 L 20 80"
                        stroke={color}
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                    />
                    {/* Secondary Stroke (Banana Yellow Accent) */}
                    <path
                        d="M80 20 L 55 50 L 80 80"
                        stroke={bananaAccent}
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                    />
                    {/* Central Connection */}
                    <circle cx="50" cy="50" r="6" fill="white" stroke={secondaryColor} strokeWidth="2" />

                    {/* Tech Dots */}
                    <circle cx="20" cy="20" r="3" fill={color} />
                    <circle cx="80" cy="80" r="3" fill={bananaAccent} />
                </g>
            </svg>
        </div>
    );

    const LogoText = () => (
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', marginLeft: '12px', height: iconSize }}>
            <div style={{
                fontSize: size * 0.65,
                fontWeight: 900,
                letterSpacing: '-0.03em',
                lineHeight: 1,
                color: textColor,
                fontFamily: "'Outfit', sans-serif",
                display: 'flex',
                alignItems: 'center'
            }}>
                RAYI <span style={{ color: bananaAccent, marginLeft: '2px', textShadow: `0 0 10px ${bananaAccent}66` }}>X</span>
            </div>
            <div style={{
                fontSize: size * 0.35,
                fontWeight: 700,
                color: color,
                marginTop: '3px',
                fontFamily: "'Noto Sans Arabic', sans-serif",
                letterSpacing: '0.05em',
                textAlign: 'right'
            }}>
                رأيــــي
            </div>
        </div>
    );

    const Monogram = () => (
        <div style={{
            width: size,
            height: size,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)`,
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.1)',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: `0 4px 12px ${color}22`
        }}>
            <div style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: size * 0.5,
                fontWeight: 900,
                color: 'white',
                zIndex: 1
            }}>
                R<span style={{ color: bananaAccent }}>X</span>
            </div>
            <div style={{
                position: 'absolute',
                width: '150%',
                height: '150%',
                background: `radial-gradient(circle at top left, ${color}22 0%, transparent 60%)`,
                zIndex: 0
            }}></div>
        </div>
    );

    const SaudiFoundationLogo = () => {
        const gold = '#C1A062';
        const maroon = '#7C2230';
        const silk = '#9B1B30';

        return (
            <div className={`logo-container ${className}`} style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                <div style={{ position: 'relative', width: iconSize, height: iconSize, flexShrink: 0 }}>
                    <svg width={iconSize} height={iconSize} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <linearGradient id="seal_grad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                                <stop stopColor={maroon} />
                                <stop offset="1" stopColor={silk} />
                            </linearGradient>
                            <filter id="gold_glow">
                                <feGaussianBlur stdDeviation="2" result="blur" />
                                <feComposite in="SourceGraphic" in2="blur" operator="over" />
                            </filter>
                        </defs>

                        {/* Outer Geometric Frame */}
                        <rect x="5" y="5" width="90" height="90" rx="10" stroke={gold} strokeWidth="2" opacity="0.8" />
                        <rect x="10" y="10" width="80" height="80" rx="6" stroke={gold} strokeWidth="0.5" opacity="0.4" />

                        {/* Background Seal */}
                        <circle cx="50" cy="50" r="38" fill="url(#seal_grad)" />

                        {/* The Date Palm */}
                        <g opacity="0.9" stroke={gold} strokeWidth="1.5" strokeLinecap="round">
                            <path d="M50 35V65M50 40C40 40 35 30 35 30M50 45C40 45 32 38 32 38M50 50C42 50 38 48 38 48" />
                            <path d="M50 40C60 40 65 30 65 30M50 45C60 45 68 38 68 38M50 50C58 50 62 48 62 48" />
                        </g>

                        {/* Precise Royal X Mark */}
                        <g filter="url(#gold_glow)">
                            <path d="M35 50C35 41.7157 41.7157 35 50 35C58.2843 35 65 41.7157 65 50C65 58.2843 58.2843 65 50 65" stroke={gold} strokeWidth="4" strokeLinecap="round" />
                            <path d="M42 42L58 58M58 42L42 58" stroke="white" strokeWidth="8" strokeLinecap="round" />
                            <path d="M42 42L58 58M58 42L42 58" stroke={gold} strokeWidth="3" strokeLinecap="round" />
                        </g>

                        <text x="50" y="82" fontFamily="'Outfit', sans-serif" fontSize="6" fontWeight="800" fill={gold} textAnchor="middle" letterSpacing="1">1727 • ٢٠٢٤</text>
                    </svg>
                    <div style={{
                        position: 'absolute', top: '10%', left: '10%', width: '80%', height: '80%',
                        background: `radial-gradient(circle, ${gold}44 0%, transparent 70%)`,
                        opacity: 0.3, filter: 'blur(12px)', zIndex: -1
                    }}></div>
                </div>
                {showText && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginLeft: '16px' }}>
                        <div style={{
                            fontSize: size * 0.7, fontWeight: 800, color: gold, fontFamily: "'Outfit', sans-serif", letterSpacing: '0.1em'
                        }}>
                            Rayi<span style={{ color: 'white' }}>X</span>
                        </div>
                        <div style={{
                            fontSize: size * 0.45, fontWeight: 900, color: 'white', marginTop: '-2px', textAlign: 'right', fontFamily: "'Noto Sans Arabic', sans-serif"
                        }}>
                            التأسيس
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const SaudiVisionLogo = () => {
        const neonGreen = '#00FFA3';
        const visionPurple = '#7000FF';
        const royalBlue = '#0057FF';

        return (
            <div className={`logo-container ${className}`} style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                <div style={{ position: 'relative', width: iconSize, height: iconSize, flexShrink: 0 }}>
                    <svg width={iconSize} height={iconSize} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <linearGradient id="vision_grad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                                <stop stopColor={neonGreen} />
                                <stop offset="0.5" stopColor={visionPurple} />
                                <stop offset="1" stopColor={royalBlue} />
                            </linearGradient>
                            <filter id="vision_glow">
                                <feGaussianBlur stdDeviation="3" result="blur" />
                                <feComposite in="SourceGraphic" in2="blur" operator="over" />
                            </filter>
                        </defs>

                        {/* Vision 2030 Symbolism (Stylized V and 30) */}
                        <path d="M15 30L50 85L85 30" stroke="url(#vision_grad)" strokeWidth="4" strokeLinecap="round" opacity="0.4" />

                        {/* Central High-Tech RayiX Mark */}
                        <circle cx="50" cy="50" r="35" stroke="url(#vision_grad)" strokeWidth="2" strokeDasharray="5 5" />

                        <g filter="url(#vision_glow)">
                            <path
                                d="M25 50C25 36.1929 36.1929 25 50 25C63.8071 25 75 36.1929 75 50C75 63.8071 63.8071 75 50 75"
                                stroke="url(#vision_grad)"
                                strokeWidth="8"
                                strokeLinecap="round"
                            />
                            <path d="M38 38L62 62M62 38L38 62" stroke="white" strokeWidth="12" strokeLinecap="round" />
                        </g>

                        {/* Vision Text */}
                        <text x="50" y="92" fontFamily="'Outfit', sans-serif" fontSize="7" fontWeight="900" fill={neonGreen} textAnchor="middle" letterSpacing="2">VISION ٢٠٣٠</text>
                    </svg>
                </div>
                {showText && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginLeft: '12px' }}>
                        <div style={{
                            fontSize: size * 0.75, fontWeight: 900, color: 'white', fontFamily: "'Outfit', sans-serif"
                        }}>
                            Rayi<span style={{ color: neonGreen }}>X</span>
                        </div>
                        <div style={{
                            fontSize: size * 0.35, fontWeight: 800, color: neonGreen, marginTop: '-2px', textAlign: 'right', fontFamily: "'Noto Sans Arabic', sans-serif"
                        }}>
                            رؤية المملكة
                        </div>
                    </div>
                )}
            </div>
        );
    };

    if (variant === 'saudi-vision') return <SaudiVisionLogo />;
    if (variant === 'saudi-foundation') return <SaudiFoundationLogo />;
    if (variant === 'monogram') return <Monogram />;

    return (
        <div className={`logo-container ${className}`} style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
            <LogoIcon />
            {(variant === 'full' && showText) && <LogoText />}
        </div>
    );
}
