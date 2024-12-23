import { keyMap } from './keymap';

interface AudioState {
  context: AudioContext | null;
  buffer: AudioBuffer | null;
}

const audioState: AudioState = {
  context: null,
  buffer: null,
};

// Convert MIDI note to playback rate
function midiNoteToPlaybackRate(midiNote: number): number {
  return Math.pow(2, (midiNote - 60) / 12);
}

// Initialize audio context and load buffer from file
async function initializeAudioBuffer(file: File): Promise<void> {
  try {
    if (!audioState.context) {
      audioState.context = new AudioContext();
    }

    const arrayBuffer = await file.arrayBuffer();
    audioState.buffer = await audioState.context.decodeAudioData(arrayBuffer);
  } catch (error) {
    console.error('Error initializing audio buffer:', error);
    throw error;
  }
}

// Play audio at specified MIDI note
function playNote(midiNote: number) {
  if (!audioState.context || !audioState.buffer) return;

  const source = audioState.context.createBufferSource();
  source.buffer = audioState.buffer;
  source.playbackRate.value = midiNoteToPlaybackRate(midiNote);
  source.connect(audioState.context.destination);
  source.start(0);
}

// Handle keyboard events
function handleKeyDown(event: KeyboardEvent) {
  const midiNote = keyMap[event.code];
  if (midiNote !== undefined) {
    playNote(midiNote);
  }
}

// Add to your existing fileInput change handler
function initializeKeyboardPlayback(file: File) {
  initializeAudioBuffer(file)
    .then(() => {
      // Add keyboard listener only after buffer is loaded
      document.addEventListener('keydown', handleKeyDown);
    })
    .catch((error) => {
      console.error('Failed to initialize keyboard playback:', error);
    });
}

// Cleanup function to remove event listener
function cleanup() {
  document.removeEventListener('keydown', handleKeyDown);
}

// Export for use in main.ts
export { initializeKeyboardPlayback, cleanup };
