class SoundService {
    private audioContext: AudioContext | null = null;
    private isUnlocked: boolean = false;

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

    // Determine if context is suspended and try to resume
    public async unlock() {
        if (!this.audioContext) this.init();
        if (this.audioContext && this.audioContext.state === 'suspended') {
            try {
                await this.audioContext.resume();
                this.isUnlocked = true;
                console.log('AudioContext used & resumed');
            } catch (e) {
                console.error('Failed to resume AudioContext', e);
            }
        }
    }

    private loopInterval: any = null;

    public startLoop(type: 'beep' | 'alert') {
        if (this.loopInterval) clearInterval(this.loopInterval);

        // Play immediately
        if (type === 'beep') this.playBeep();
        else this.playAlert();

        // Loop every 3 seconds
        this.loopInterval = setInterval(() => {
            if (type === 'beep') this.playBeep();
            else this.playAlert();
        }, 3000);
    }

    public stopLoop() {
        if (this.loopInterval) {
            clearInterval(this.loopInterval);
            this.loopInterval = null;
        }
    }

    public playBeep(volume = 0.3) {
        this.playSound(800, 1000, 0.1, volume); // Short high beep
    }

    public playAlert(volume = 0.5) {
        // Distinct "New Order" sound (two tones)
        this.playSound(600, 800, 0.15, volume);
        setTimeout(() => this.playSound(800, 1200, 0.3, volume), 200);
    }

    private playSound(startFreq: number, endFreq: number, duration: number, volume: number) {
        if (!this.audioContext) return;

        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.type = 'sine';
            oscillator.frequency.value = startFreq;

            // Volume Envelope
            gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

            // Pitch Slide
            oscillator.frequency.exponentialRampToValueAtTime(endFreq, this.audioContext.currentTime + duration);

            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + duration);
        } catch (e) {
            console.warn('Error playing sound:', e);
            // Try to recover/re-init if something broke
            this.unlock();
        }
    }
}

export const soundService = new SoundService();
