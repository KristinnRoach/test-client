import { keyMap } from './keymap';

interface AudioState {
  context: AudioContext | null;
  buffer: AudioBuffer | null;
  fadeOutTime: number;
}

interface ActiveNote {
  source: AudioBufferSourceNode;
  gain: GainNode;
}

const audioState: AudioState = {
  context: null,
  buffer: null,
  fadeOutTime: 0.1, // 100ms default fadeout
};

const activeNotes = new Map<string, ActiveNote>();

// Convert MIDI note to playback rate
function midiNoteToPlaybackRate(midiNote: number): number {
  return Math.pow(2, (midiNote - 60) / 12);
}

// Update fade out max time based on buffer duration
function updateFadeOutSlider() {
  const slider = document.getElementById('fadeOutTime') as HTMLInputElement;
  if (slider && audioState.buffer) {
    slider.max = audioState.buffer.duration.toString();
    // Set a reasonable default (100ms or 10% of duration, whichever is smaller)
    const defaultFade = Math.min(0.1, audioState.buffer.duration * 0.1);
    slider.value = defaultFade.toString();
    audioState.fadeOutTime = defaultFade;
  }
}

// Initialize audio context and load buffer from file
async function initializeAudioBuffer(file: File): Promise<void> {
  try {
    if (!audioState.context) {
      audioState.context = new AudioContext();
    }

    const arrayBuffer = await file.arrayBuffer();
    audioState.buffer = await audioState.context.decodeAudioData(arrayBuffer);
    updateFadeOutSlider();
  } catch (error) {
    console.error('Error initializing audio buffer:', error);
    throw error;
  }
}

// Play audio at specified MIDI note
function playNote(keyCode: string, midiNote: number) {
  if (!audioState.context || !audioState.buffer) return;

  // Stop any existing note for this key
  stopNote(keyCode, true);

  const source = audioState.context.createBufferSource();
  const gain = audioState.context.createGain();

  source.buffer = audioState.buffer;
  source.playbackRate.value = midiNoteToPlaybackRate(midiNote);
  source.connect(gain);
  gain.connect(audioState.context.destination);
  source.start(0);

  activeNotes.set(keyCode, { source, gain });
}

// Stop note with fadeout
function stopNote(keyCode: string, immediate = false) {
  const note = activeNotes.get(keyCode);
  if (!note) return;

  const { source, gain } = note;
  const now = audioState.context?.currentTime || 0;

  if (immediate) {
    gain.gain.setValueAtTime(0, now);
    source.stop(now);
  } else {
    gain.gain.setValueAtTime(1, now);
    gain.gain.linearRampToValueAtTime(0, now + audioState.fadeOutTime);
    source.stop(now + audioState.fadeOutTime);
  }

  activeNotes.delete(keyCode);
}

// Handle keyboard events
function handleKeyDown(event: KeyboardEvent) {
  if (event.repeat) return; // Ignore key repeat
  const midiNote = keyMap[event.code];
  if (midiNote !== undefined) {
    playNote(event.code, midiNote);
  }
}

function handleKeyUp(event: KeyboardEvent) {
  if (keyMap[event.code] !== undefined) {
    stopNote(event.code);
  }
}

// Add to your existing fileInput change handler
// Add fade out slider listener
function initializeFadeOutSlider() {
  const slider = document.getElementById('fadeOutTime') as HTMLInputElement;
  if (slider) {
    slider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      audioState.fadeOutTime = value;
    });
  }
}

function initializeKeyboardPlayback(file: File) {
  initializeAudioBuffer(file)
    .then(() => {
      // Add keyboard listeners only after buffer is loaded
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('keyup', handleKeyUp);
      initializeFadeOutSlider();
    })
    .catch((error) => {
      console.error('Failed to initialize keyboard playback:', error);
    });
}

// Cleanup function to remove event listener
function cleanup() {
  document.removeEventListener('keydown', handleKeyDown);
  document.removeEventListener('keyup', handleKeyUp);
  // Stop all active notes
  activeNotes.forEach((_, keyCode) => stopNote(keyCode, true));
}

// Export for use in main.ts
export { initializeKeyboardPlayback, cleanup };
