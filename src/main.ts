import './style.css';
import {
  initializeKeyboardPlayback,
  cleanup,
  updateAudioBuffer,
} from './playback';
import { initializeRecorder } from './recorder';

// API endpoint from the notebook
// const LOCAL_API_URL = 'http://localhost:5001/process';
const COLAB_API_URL = 'https://singular-roughy-humane.ngrok-free.app/process';

// DOM Elements type definition
interface DOMElements {
  fileInput: HTMLInputElement;
  // sampleNameInput: HTMLInputElement;
  uploadBtn: HTMLButtonElement;
  normalizeOpt: HTMLInputElement;
  trimOpt: HTMLInputElement;
  tuneOpt: HTMLInputElement;
  saveToFirebaseOpt: HTMLInputElement;
  targetPitchInput: HTMLInputElement;
  formatOpt: HTMLSelectElement;
  pitchSection: HTMLDivElement;
  originalAudio: HTMLAudioElement;
  processedAudio: HTMLAudioElement;
  statusDiv: HTMLDivElement;
  recordBtn: HTMLButtonElement;
  recordingTime: HTMLSpanElement;
}

// Updated interface to match server
interface ProcessingOptions {
  normalize: boolean;
  trim: boolean;
  tune: boolean;
  // sampleName?: string;
  saveToFirebase?: boolean;
  targetPitchHz?: number;
  outputFormat?: 'wav' | 'mp3' | 'webm';
  returnType?: 'url' | 'blob';
}

// Initialize DOM elements
function initializeElements(): DOMElements | null {
  const elements = {
    fileInput: document.getElementById('audioFile') as HTMLInputElement,
    // sampleNameInput: document.getElementById('sampleName') as HTMLInputElement,
    uploadBtn: document.getElementById('uploadBtn') as HTMLButtonElement,
    normalizeOpt: document.getElementById('normalizeOpt') as HTMLInputElement,
    trimOpt: document.getElementById('trimOpt') as HTMLInputElement,
    tuneOpt: document.getElementById('tuneOpt') as HTMLInputElement,

    saveToFirebaseOpt: document.getElementById(
      'saveToFirebaseOpt'
    ) as HTMLInputElement,

    formatOpt: document.getElementById('formatOpt') as HTMLSelectElement,

    targetPitchInput: document.getElementById(
      'targetPitch'
    ) as HTMLInputElement,
    pitchSection: document.querySelector('.pitch-section') as HTMLDivElement,
    originalAudio: document.getElementById('originalAudio') as HTMLAudioElement,
    processedAudio: document.getElementById(
      'processedAudio'
    ) as HTMLAudioElement,
    statusDiv: document.getElementById('status') as HTMLDivElement,
    recordBtn: document.getElementById('recordBtn') as HTMLButtonElement,
    recordingTime: document.getElementById('recordingTime') as HTMLSpanElement,
  };

  // Verify all elements exist
  for (const [key, element] of Object.entries(elements)) {
    if (!element) {
      console.error(`Element not found: ${key}`);
      return null;
    }
  }

  return elements;
}

// Initialize event listeners
function initializeEventListeners(elements: DOMElements) {
  const {
    fileInput,
    // sampleNameInput,
    uploadBtn,
    tuneOpt,
    pitchSection,
    normalizeOpt,
    trimOpt,
    saveToFirebaseOpt,
    formatOpt,
    targetPitchInput,
    originalAudio,
    processedAudio,
    statusDiv,
  } = elements;

  // Disable upload button initially
  uploadBtn.disabled = true;

  // File selection handler
  fileInput.addEventListener('change', (event: Event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      uploadBtn.disabled = false;
      originalAudio.src = URL.createObjectURL(file);
      // Initialize keyboard playback
      cleanup(); // Remove any existing listeners
      initializeKeyboardPlayback(file);
    } else {
      uploadBtn.disabled = true;
    }
  });

  // Auto-tune option toggle
  tuneOpt.addEventListener('change', () => {
    pitchSection.style.display = tuneOpt.checked ? 'block' : 'none';
  });

  // Upload button handler
  uploadBtn.addEventListener('click', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;

    try {
      // Gather options
      const options: ProcessingOptions = {
        normalize: normalizeOpt.checked,
        trim: trimOpt.checked,
        tune: tuneOpt.checked,
        outputFormat: formatOpt.value as 'wav' | 'mp3' | 'webm',
        saveToFirebase: saveToFirebaseOpt.checked,
        returnType: saveToFirebaseOpt.checked ? 'url' : 'blob',
      };

      if (options.tune) {
        options.targetPitchHz = parseFloat(targetPitchInput.value);
      }

      // Process the audio
      const result = await processAudio(file, options, statusDiv);

      // // // Handle the result
      // if (typeof result === 'string') {
      //   // Firebase URL
      //   processedAudio.src = result;
      //   updateStatus('Audio processed and uploaded to Firebase', statusDiv);
      // } else {
      //   // Blob result
      //   processedAudio.src = URL.createObjectURL(result);
      //   updateStatus('Audio processed successfully', statusDiv);
      // }

      // Handle the result
      if (typeof result === 'string') {
        // Firebase URL
        processedAudio.src = result;
        const response = await fetch(result);
        const audioBlob = await response.blob();
        await updateAudioBuffer(audioBlob);
        updateStatus('Audio processed and uploaded to Firebase', statusDiv);
      } else {
        // Blob result
        processedAudio.src = URL.createObjectURL(result);
        await updateAudioBuffer(result);
        updateStatus('Audio processed successfully', statusDiv);
      }
    } catch (error) {
      updateStatus(
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        statusDiv
      );
    }
  });
}

// V2
async function processAudio(
  file: File,
  options: ProcessingOptions,
  statusDiv: HTMLDivElement
): Promise<Blob> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('options', JSON.stringify(options));

  try {
    updateStatus('Processing audio...', statusDiv);
    const response = await fetch(COLAB_API_URL, {
      method: 'POST',
      body: formData,
      mode: 'cors',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.blob();
  } catch (error) {
    console.error('Error processing audio:', error);
    throw error;
  }
}

function updateStatus(message: string, statusDiv: HTMLDivElement) {
  statusDiv.textContent = message;
  // (window as any).addStatusLog?.(message);
}

// Test server connection
async function testServerConnection(statusDiv: HTMLDivElement) {
  try {
    const response = await fetch(COLAB_API_URL, {
      method: 'GET',
      mode: 'cors',
    });
    if (response.ok) {
      updateStatus('Server connected successfully', statusDiv);
      return true;
    } else {
      updateStatus('Server is not responding correctly', statusDiv);
      return false;
    }
  } catch (error) {
    updateStatus(
      'Cannot connect to server. Make sure the notebook is running and ngrok tunnel is active',
      statusDiv
    );
    console.error('Server connection test failed:', error);
    return false;
  }
}

// Initialize the application
async function initializeApp() {
  const elements = initializeElements();
  if (elements) {
    await testServerConnection(elements.statusDiv);
    initializeEventListeners(elements);

    // Initialize status log component
    //const statusLogRoot = createRoot(document.getElementById('status-log')!);
    //statusLogRoot.render(<StatusLog />);

    // Initialize the recorder
    initializeRecorder(
      elements.recordBtn,
      elements.recordingTime,
      (audioBlob: Blob) => {
        // Create a File object from the Blob
        const file = new File([audioBlob], 'recording.wav', {
          type: 'audio/wav',
        });

        // Update the file input
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        elements.fileInput.files = dataTransfer.files;

        // Enable upload button and initialize keyboard playback
        elements.uploadBtn.disabled = false;
        elements.originalAudio.src = URL.createObjectURL(file);
        cleanup(); // Remove any existing listeners
        initializeKeyboardPlayback(file);
      }
    );
  } else {
    console.error('Failed to initialize application: missing elements');
  }
}

// Start the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);
