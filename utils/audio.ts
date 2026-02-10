class SoundService {
    private audioContext: AudioContext | null = null;
    private isUnlocked: boolean = false;
    private loopInterval: any = null;

    constructor() {
        this.init();
    }

    private init() {
        if (typeof window !== 'undefined') {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContextClass) {
                this.audioContext = new AudioContextClass();
            }
        }
    }

    // Resume suspended AudioContext (required by browser autoplay policies)
    public async unlock() {
        if (!this.audioContext) this.init();
        if (this.audioContext && this.audioContext.state === 'suspended') {
            try {
                await this.audioContext.resume();
                this.isUnlocked = true;
                console.log('[SoundService] AudioContext resumed');
            } catch (e) {
                console.error('[SoundService] Failed to resume AudioContext', e);
            }
        } else if (this.audioContext) {
            this.isUnlocked = true;
        }
    }

    private async ensureReady() {
        if (!this.audioContext) this.init();
        if (this.audioContext && this.audioContext.state === 'suspended') {
            try {
                await this.audioContext.resume();
            } catch (e) {
                console.warn('[SoundService] Could not resume AudioContext:', e);
            }
        }
    }

    public startLoop(type: 'beep' | 'alert') {
        console.log(`[SoundService] Starting loop: ${type}`);
        if (this.loopInterval) clearInterval(this.loopInterval);

        // Ensure AudioContext is ready before playing
        this.ensureReady().then(() => {
            // Play immediately
            if (type === 'beep') this.playBeep();
            else this.playAlert();

            // Loop every 3 seconds
            this.loopInterval = setInterval(() => {
                this.ensureReady().then(() => {
                    if (type === 'beep') this.playBeep();
                    else this.playAlert();
                });
            }, 3000);
        });
    }

    public stopLoop() {
        console.log('[SoundService] Stopping loop');
        if (this.loopInterval) {
            clearInterval(this.loopInterval);
            this.loopInterval = null;
        }
    }

    public playBeep(volume = 0.3) {
        this.playSound(800, 1000, 0.1, volume);
    }

    public playAlert(volume = 0.5) {
        this.playSound(600, 800, 0.15, volume);
        setTimeout(() => this.playSound(800, 1200, 0.3, volume), 200);
    }

    private playSound(startFreq: number, endFreq: number, duration: number, volume: number) {
        if (!this.audioContext) return;

        try {
            // If context is closed, re-init
            if (this.audioContext.state === 'closed') {
                this.init();
                if (!this.audioContext) return;
            }

            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.type = 'sine';
            oscillator.frequency.value = startFreq;

            gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

            oscillator.frequency.exponentialRampToValueAtTime(endFreq, this.audioContext.currentTime + duration);

            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + duration);
        } catch (e) {
            console.warn('[SoundService] Error playing sound:', e);
            this.init();
        }
    }
}

export const soundService = new SoundService();
