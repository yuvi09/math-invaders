const fs = require('fs');

const assetsDir = './public/assets';
if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
}

// Create player ship (Modern X-wing style)
const playerSvg = `
<svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
    <defs>
        <!-- Gradient for the ship body -->
        <linearGradient id="shipBody" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#4ade80;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#22c55e;stop-opacity:1" />
        </linearGradient>
        
        <!-- Gradient for wings -->
        <linearGradient id="wingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#22c55e;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#15803d;stop-opacity:1" />
        </linearGradient>
        
        <!-- Glow effect -->
        <filter id="glow">
            <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
            <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
            </feMerge>
        </filter>
    </defs>
    
    <!-- Engine glow -->
    <circle cx="32" cy="60" r="6" fill="#4ade80" filter="url(#glow)" opacity="0.6"/>
    
    <!-- Main body (fuselage) -->
    <path d="M32,4 L44,32 L32,60 L20,32 Z" fill="url(#shipBody)" filter="url(#glow)"/>
    
    <!-- Wings -->
    <path d="M20,28 L4,32 L20,44 Z" fill="url(#wingGradient)"/>
    <path d="M44,28 L60,32 L44,44 Z" fill="url(#wingGradient)"/>
    
    <!-- Wing details -->
    <line x1="4" y1="32" x2="20" y2="32" stroke="#86efac" stroke-width="1"/>
    <line x1="44" y1="32" x2="60" y2="32" stroke="#86efac" stroke-width="1"/>
    
    <!-- Cockpit -->
    <circle cx="32" cy="20" r="6" fill="#f0f9ff" opacity="0.9"/>
    <circle cx="32" cy="20" r="4" fill="#0ea5e9" opacity="0.7"/>
    
    <!-- Laser cannons -->
    <rect x="8" y="31" width="6" height="2" fill="#22c55e" filter="url(#glow)"/>
    <rect x="50" y="31" width="6" height="2" fill="#22c55e" filter="url(#glow)"/>
    
    <!-- Energy lines -->
    <path d="M32,8 L32,56" stroke="#86efac" stroke-width="1" opacity="0.5"/>
</svg>
`;

fs.writeFileSync(`${assetsDir}/player.svg`, playerSvg);

// Create enemy (modern style)
const enemySvg = `
<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg">
    <defs>
        <radialGradient id="enemyGradient">
            <stop offset="0%" style="stop-color:#ef4444;stop-opacity:1"/>
            <stop offset="100%" style="stop-color:#b91c1c;stop-opacity:1"/>
        </radialGradient>
        <filter id="enemyGlow">
            <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
            <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
            </feMerge>
        </filter>
    </defs>
    
    <!-- Main body -->
    <circle cx="16" cy="16" r="14" fill="url(#enemyGradient)" filter="url(#enemyGlow)"/>
    
    <!-- Inner details -->
    <circle cx="16" cy="16" r="8" fill="#991b1b" opacity="0.6"/>
    <circle cx="16" cy="16" r="4" fill="#f87171" opacity="0.8"/>
</svg>
`;

fs.writeFileSync(`${assetsDir}/enemy.svg`, enemySvg);

// Create bullet (energy bolt style)
const bulletSvg = `
<svg width="8" height="16" xmlns="http://www.w3.org/2000/svg">
    <defs>
        <linearGradient id="bulletGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:#fef08a;stop-opacity:1"/>
            <stop offset="100%" style="stop-color:#facc15;stop-opacity:1"/>
        </linearGradient>
        <filter id="bulletGlow">
            <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
            <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
            </feMerge>
        </filter>
    </defs>
    
    <!-- Energy bolt -->
    <path d="M4,0 L8,4 L4,16 L0,4 Z" fill="url(#bulletGradient)" filter="url(#bulletGlow)"/>
</svg>
`;

fs.writeFileSync(`${assetsDir}/bullet.svg`, bulletSvg); 