let stream;
let chunks;
let mediaRecord;
const useAudio = true;
let isLoadedRecordArea = true;
const mainAreaElement = document.querySelector('main');
const changeAreaButton = document.getElementById('change-area');
let stopAndSaveButton;
let startButton;
let openVideoButton;
let visualizationVideoPlayer;

const recordAreaTemplate = `
<video autoplay></video>
<br>
<button id="save-video">Stop and Save Video</button>
<button id="start-record">Start Record</button>
`;

const videoPlayerAreaTemplate = `
<button id="open-video">Open Video</button>
<br>
<br>
<video controls autoplay id="visualization-area"></video>
`;

window.addEventListener("load", async () => {
  if (!acceptFileSystemAccess()) {
    alert('Your browser not support File System API.');
    return;
  }

  if (!acceptMediaStreamRecording()) {
    alert('Your browser not support MediaStream Recording API.');
    return;
  }

  loadChangeAreaButton();
  
  const areaBuilder  = isLoadedRecordArea
  ? buildVideoRecordArea
  : buildVideoPlayerArea;

  await areaBuilder();
});

const recordState = {
  InRecord: "IN_RECORD",
  Processing: "PROCESSING",
  Normal: "NORMAL"
}

function setRecordState(state) {
  switch (state) {
    case recordState.InRecord:
      startButton.disabled = true;
      stopAndSaveButton.disabled = false;
      break;
    case recordState.Processing:
      startButton.disabled = true;
      stopAndSaveButton.disabled = true;
      break;
    case recordState.Normal:
      startButton.disabled = false;
      stopAndSaveButton.disabled = true;
      break;
    default:
      break;
  }
}

function loadChangeAreaButton() {
  changeAreaButton.innerText = isLoadedRecordArea
    ? 'Load Video Player'
    : 'Load Video Record';

  changeAreaButton.addEventListener('click', async () => {
    isLoadedRecordArea = !isLoadedRecordArea;

    changeAreaButton.innerText = isLoadedRecordArea
    ? 'Load Video Player'
    : 'Load Video Record';

    const areaBuilder  = isLoadedRecordArea
      ? buildVideoRecordArea
      : buildVideoPlayerArea;

    await areaBuilder();
  });
}

async function buildVideoRecordArea() {
  mainAreaElement.innerHTML = recordAreaTemplate;
  
  stopAndSaveButton = document.getElementById('save-video');
  startButton = document.getElementById('start-record');

  stopAndSaveButton.disabled = true;
  startButton.disabled = true;

  if (acceptDevicesAccess() === false) {
    alert("Devices access is not accepted.");
    return;
  }

  const videoStreamIsLoaded = await loadVideoStream();

  if (videoStreamIsLoaded === false)
    return;
  
  playStream(stream);

  loadStartButton();
  loadStopAndSaveButton();
  setRecordState(recordState.Normal);
}

function buildVideoPlayerArea() {
  mainAreaElement.innerHTML = videoPlayerAreaTemplate;

  openVideoButton = document.getElementById('open-video');
  visualizationVideoPlayer = document.getElementById('visualization-area');

  loadOpenVideoButton();
}



async function loadVideoStream() {
  try {
    stream = await navigator.mediaDevices.getUserMedia(
    {
      video: true,
      audio: useAudio
    });

    return true;
  } catch (error) {
    return false;
  }
}

function loadStartButton() {
  startButton.addEventListener('click', async () => {
    chunks = [];

    mediaRecord = getMediaRecord(stream);
    mediaRecord.start(1000);
      
    setRecordState(recordState.InRecord);

    console.log('Started Record!');
  });
}

function loadStopAndSaveButton() {
  stopAndSaveButton.addEventListener('click', async () => {
    mediaRecord.stop();
    console.log('Stoped Record!');
    setRecordState(recordState.Processing);

    setTimeout(() => {
      var blobObject = new Blob(chunks);
      saveFile(blobObject);

      setRecordState(recordState.Normal);
    }, 1000);
  });
}

function loadOpenVideoButton() {
  openVideoButton.addEventListener('click', async () => {
    const options = {
      types: [
        {
          description: 'Videos',
          accept: {
            'video/*': ['.webm']
          }
        }
      ],
      excludeAcceptAllOption: true,
      multiple: false
    };

    let fileHandle;

    try {
      [fileHandle] = await window.showOpenFilePicker(options);
    } catch (error) {
      console.log(error)
      return;
    }

    if (fileHandle.kind !== 'file')
      return;

    const file = await fileHandle.getFile();

    visualizationVideoPlayer.src = URL.createObjectURL(file);
  });
}

async function saveFile(blob) {
  const handleSaveFile = await getSaveFileHandle();

  if (handleSaveFile === undefined)
    return;

  const writableStream = await handleSaveFile.createWritable();

  await writableStream.write(blob);

  await writableStream.close();
}

async function getSaveFileHandle() {
    const options = {
      types: [
        {
          description: 'Video',
          accept: { 'video/webm': ['.webm'] }
        }
      ]
    };

    let handleSaveFile;

    try {
      handleSaveFile = await window.showSaveFilePicker(options);    
    } catch { }

    return handleSaveFile;
}

function playStream(stream) {
  const videoElement = document.querySelector('video');
  videoElement.srcObject = stream;
}

function getMediaRecord(stream) {
  const mediaRecord = new MediaRecorder(stream, {
    mimeType: 'video/webm; codecs=vp9'
  });

  mediaRecord.ondataavailable = handlerDataAvailableInRecord;

  return mediaRecord;
}

function handlerDataAvailableInRecord(eventBlob) {
  if (eventBlob.data.size <= 0) return;

  chunks.push(eventBlob.data);
}

function acceptFileSystemAccess() {
  return window.showOpenFilePicker !== undefined &&
         window.showSaveFilePicker !== undefined &&
         window.showDirectoryPicker !== undefined;
}

function acceptMediaStreamRecording() {
  return typeof(MediaRecorder) !== undefined;
}

function acceptDevicesAccess() {
  const acceptDevicesAccess =
        "mediaDevices" in navigator && "getUserMedia" in navigator.mediaDevices;

  return acceptDevicesAccess;
}