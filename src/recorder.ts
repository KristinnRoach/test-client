interface RecorderState {
  mediaRecorder: MediaRecorder | null;
  recordingChunks: Blob[];
  isRecording: boolean;
  startTime: number | null;
  timerInterval: number | null;
}

const recorderState: RecorderState = {
  mediaRecorder: null,
  recordingChunks: [],
  isRecording: false,
  startTime: null,
  timerInterval: null,
};

export async function initializeRecorder(
  recordBtn: HTMLButtonElement,
  timeDisplay: HTMLSpanElement,
  onRecordingComplete: (blob: Blob) => void
) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recorderState.mediaRecorder = new MediaRecorder(stream);

    recorderState.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recorderState.recordingChunks.push(event.data);
      }
    };

    recorderState.mediaRecorder.onstop = () => {
      const audioBlob = new Blob(recorderState.recordingChunks, {
        type: 'audio/wav',
      });
      onRecordingComplete(audioBlob);
      recorderState.recordingChunks = [];
      stopTimer();
    };

    recordBtn.addEventListener('click', () =>
      toggleRecording(recordBtn, timeDisplay)
    );
  } catch (error) {
    console.error('Error initializing recorder:', error);
    recordBtn.disabled = true;
    recordBtn.textContent = 'Recording not available';
  }
}

function toggleRecording(
  recordBtn: HTMLButtonElement,
  timeDisplay: HTMLSpanElement
) {
  if (!recorderState.mediaRecorder) return;

  if (!recorderState.isRecording) {
    startRecording(recordBtn, timeDisplay);
  } else {
    stopRecording(recordBtn);
  }
}

function startRecording(
  recordBtn: HTMLButtonElement,
  timeDisplay: HTMLSpanElement
) {
  if (!recorderState.mediaRecorder) return;

  recorderState.recordingChunks = [];
  recorderState.mediaRecorder.start();
  recorderState.isRecording = true;
  recorderState.startTime = Date.now();

  recordBtn.textContent = 'Stop Recording';
  recordBtn.classList.add('recording');

  startTimer(timeDisplay);
}

function stopRecording(recordBtn: HTMLButtonElement) {
  if (!recorderState.mediaRecorder) return;

  recorderState.mediaRecorder.stop();
  recorderState.isRecording = false;

  recordBtn.textContent = 'Record';
  recordBtn.classList.remove('recording');
}

function startTimer(display: HTMLSpanElement) {
  const updateTimer = () => {
    if (!recorderState.startTime) return;

    const elapsed = Date.now() - recorderState.startTime;
    const seconds = Math.floor(elapsed / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainderSeconds = seconds % 60;

    display.textContent = `${minutes
      .toString()
      .padStart(2, '0')}:${remainderSeconds.toString().padStart(2, '0')}`;
  };

  updateTimer();
  recorderState.timerInterval = window.setInterval(updateTimer, 1000);
}

function stopTimer() {
  if (recorderState.timerInterval !== null) {
    clearInterval(recorderState.timerInterval);
    recorderState.timerInterval = null;
    recorderState.startTime = null;
  }
}
