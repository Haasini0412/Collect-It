import confetti from 'canvas-confetti';

export function fireFullConfetti() {
  try {
    const count = 200;
    const defaults = {
      origin: { y: 0.7 },
      zIndex: 9999,
    };

    function fire(particleRatio: number, opts: confetti.Options) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });
    }

    fire(0.25, {
      spread: 26,
      startVelocity: 55,
      colors: ['#6366F1', '#8B5CF6', '#22D3EE'],
    });
    fire(0.2, {
      spread: 60,
      colors: ['#34D399', '#FBBF24', '#F472B6'],
    });
    fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8,
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      scalar: 1.2,
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 45,
    });
  } catch (e) {
    console.error('Confetti error:', e);
  }
}

export function fireMiniConfetti() {
  try {
    confetti({
      particleCount: 40,
      spread: 45,
      origin: { y: 0.8 },
      colors: ['#34D399', '#6366F1', '#22D3EE'],
      zIndex: 9999,
    });
  } catch (e) {
    // ignore
  }
}
