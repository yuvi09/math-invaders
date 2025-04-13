const fs = require('fs');
const { exec } = require('child_process');

// We'll use SoX to generate sound effects
// First, make sure SoX is installed:
// brew install sox

const generateSounds = () => {
    // Create shoot sound (short high-pitched beep)
    exec('sox -n public/assets/shoot.mp3 synth 0.1 sine 880 gain -10');

    // Create explosion sound (white noise with fade out)
    exec('sox -n public/assets/explosion.mp3 synth 0.3 noise gain -5 fade 0 0.3 0.2');

    // Create boss explosion sound (bigger explosion)
    exec('sox -n public/assets/boss-explosion.mp3 synth 0.5 noise gain -3 fade 0 0.5 0.3');
};

generateSounds(); 