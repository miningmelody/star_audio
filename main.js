// Global state
let audioFiles = new Map();
let favorites = new Set();

// DOM Elements
const uploadBtn = document.getElementById('uploadBtn');
const uploadModal = document.getElementById('uploadModal');
const fileInput = document.getElementById('fileInput');
const dropZone = document.querySelector('.drop-zone');
const progressContainer = document.querySelector('.progress-container');
const progressBar = document.querySelector('.progress');
const progressText = document.querySelector('.progress-text span');
const confirmUploadBtn = document.getElementById('confirmUpload');
const cancelUploadBtn = document.getElementById('cancelUpload');
const audioCards = document.getElementById('audioCards');
const batchActions = document.getElementById('batchActions');
const favoritesList = document.getElementById('favoritesList');

// Event Listeners
uploadBtn.addEventListener('click', () => {
    uploadModal.style.display = 'block';
});

cancelUploadBtn.addEventListener('click', () => {
    uploadModal.style.display = 'none';
    resetUploadState();
});

dropZone.addEventListener('click', () => {
    fileInput.click();
});

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = 'var(--primary-dark)';
});

dropZone.addEventListener('dragleave', () => {
    dropZone.style.borderColor = 'var(--primary-color)';
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = 'var(--primary-color)';
    const files = e.dataTransfer.files;
    handleFiles(files);
});

fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
});

// File handling
function handleFiles(files) {
    const wavFiles = Array.from(files).filter(file => file.type === 'audio/wav');
    
    if (wavFiles.length === 0) {
        alert('Please select WAV files only.');
        return;
    }

    let filesToUpload = [];
    let filesToSkip = [];

    wavFiles.forEach(file => {
        if (audioFiles.has(file.name)) {
            filesToSkip.push(file);
        } else {
            filesToUpload.push(file);
        }
    });

    if (filesToSkip.length > 0) {
        const skipMessage = `The following files already exist:\n${filesToSkip.map(f => f.name).join('\n')}\n\nDo you want to overwrite them?`;
        if (confirm(skipMessage)) {
            filesToUpload = [...filesToUpload, ...filesToSkip];
        }
    }

    if (filesToUpload.length > 0) {
        uploadFiles(filesToUpload);
    }
}

async function uploadFiles(files) {
    progressContainer.style.display = 'block';
    confirmUploadBtn.style.display = 'none';

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const progress = ((i + 1) / files.length) * 100;
        
        // Simulate file upload (replace with actual upload logic)
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        progressBar.style.width = `${progress}%`;
        progressText.textContent = `${Math.round(progress)}%`;
        
        // Process the audio file
        await processAudioFile(file);
    }

    progressText.textContent = '100%';
    confirmUploadBtn.style.display = 'block';
}

async function processAudioFile(file) {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    // Create audio file object
    const audioFile = {
        name: file.name,
        size: formatFileSize(file.size),
        duration: formatDuration(audioBuffer.duration),
        sampleRate: audioBuffer.sampleRate,
        buffer: audioBuffer,
        isFavorite: favorites.has(file.name)
    };

    audioFiles.set(file.name, audioFile);
    createAudioCard(audioFile);
}

function createAudioCard(audioFile) {
    const card = document.createElement('div');
    card.className = 'audio-card';
    card.dataset.filename = audioFile.name;

    // Create waveform
    const waveformContainer = document.createElement('div');
    waveformContainer.className = 'waveform-container';
    
    const waveform = document.createElement('div');
    waveform.id = `waveform-${audioFile.name}`;
    waveformContainer.appendChild(waveform);

    // Create remove button
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.innerHTML = '×';
    removeBtn.onclick = () => removeAudioFile(audioFile.name);
    waveformContainer.appendChild(removeBtn);

    // Create info section
    const info = document.createElement('div');
    info.className = 'audio-info';
    info.innerHTML = `
        <p title="${audioFile.name}">Name: ${audioFile.name}</p>
        <p title="${audioFile.duration}">Duration: ${audioFile.duration}</p>
        <p title="${audioFile.sampleRate}">Sample Rate: ${audioFile.sampleRate} Hz</p>
        <p title="${audioFile.size}">Size: ${audioFile.size}</p>
    `;

    // Create controls
    const controls = document.createElement('div');
    controls.className = 'audio-controls';
    controls.innerHTML = `
        <input type="checkbox" class="audio-select">
        <button class="play-btn">Play</button>
        <button class="favorite-btn">${audioFile.isFavorite ? 'Unfavorite' : 'Favorite'}</button>
    `;

    // Add event listeners
    const playBtn = controls.querySelector('.play-btn');
    playBtn.onclick = () => playAudio(audioFile);

    const favoriteBtn = controls.querySelector('.favorite-btn');
    favoriteBtn.onclick = () => toggleFavorite(audioFile.name, favoriteBtn);

    const checkbox = controls.querySelector('.audio-select');
    checkbox.onchange = () => updateBatchActions();

    // Assemble card
    card.appendChild(waveformContainer);
    card.appendChild(info);
    card.appendChild(controls);
    audioCards.appendChild(card);

    // Draw waveform
    drawWaveform(audioFile);
}

function drawWaveform(audioFile) {
    const waveform = document.getElementById(`waveform-${audioFile.name}`);
    const data = audioFile.buffer.getChannelData(0);
    const step = Math.ceil(data.length / 100);
    const amp = 50;
    
    const canvas = document.createElement('canvas');
    canvas.width = waveform.clientWidth;
    canvas.height = waveform.clientHeight;
    const ctx = canvas.getContext('2d');
    
    ctx.strokeStyle = 'var(--primary-color)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height / 2);
    
    for (let i = 0; i < data.length; i += step) {
        const x = (i / data.length) * canvas.width;
        const y = (data[i] * amp) + (canvas.height / 2);
        ctx.lineTo(x, y);
    }
    
    ctx.stroke();
    waveform.appendChild(canvas);
}

function playAudio(audioFile) {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createBufferSource();
    source.buffer = audioFile.buffer;
    source.connect(audioContext.destination);
    source.start(0);
}

function toggleFavorite(filename, button) {
    if (favorites.has(filename)) {
        favorites.delete(filename);
        button.textContent = 'Favorite';
    } else {
        favorites.add(filename);
        button.textContent = 'Unfavorite';
    }
    updateFavoritesList();
}

function updateFavoritesList() {
    favoritesList.innerHTML = '';
    Array.from(favorites).forEach((filename, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${filename}</td>
            <td>${new Date().toLocaleDateString()}</td>
            <td>
                <button class="secondary-btn" onclick="removeFavorite('${filename}')">
                    Remove from Favorites
                </button>
            </td>
        `;
        favoritesList.appendChild(row);
    });
}

function removeFavorite(filename) {
    favorites.delete(filename);
    updateFavoritesList();
    const card = document.querySelector(`[data-filename="${filename}"]`);
    if (card) {
        const favoriteBtn = card.querySelector('.favorite-btn');
        favoriteBtn.textContent = 'Favorite';
    }
}

function removeAudioFile(filename) {
    if (confirm(`Are you sure you want to remove ${filename}?`)) {
        audioFiles.delete(filename);
        favorites.delete(filename);
        const card = document.querySelector(`[data-filename="${filename}"]`);
        card.remove();
        updateFavoritesList();
        updateBatchActions();
    }
}

function updateBatchActions() {
    const checkboxes = document.querySelectorAll('.audio-select:checked');
    batchActions.style.display = checkboxes.length > 0 ? 'flex' : 'none';
}

// Batch action handlers
document.getElementById('selectAll').onclick = () => {
    document.querySelectorAll('.audio-select').forEach(checkbox => {
        checkbox.checked = true;
    });
    updateBatchActions();
};

document.getElementById('invertSelection').onclick = () => {
    document.querySelectorAll('.audio-select').forEach(checkbox => {
        checkbox.checked = !checkbox.checked;
    });
    updateBatchActions();
};

document.getElementById('batchFavorite').onclick = () => {
    document.querySelectorAll('.audio-select:checked').forEach(checkbox => {
        const card = checkbox.closest('.audio-card');
        const filename = card.dataset.filename;
        const favoriteBtn = card.querySelector('.favorite-btn');
        if (!favorites.has(filename)) {
            favorites.add(filename);
            favoriteBtn.textContent = 'Unfavorite';
        }
    });
    updateFavoritesList();
};

document.getElementById('batchDelete').onclick = () => {
    const selectedFiles = Array.from(document.querySelectorAll('.audio-select:checked')).map(checkbox => {
        const card = checkbox.closest('.audio-card');
        return card.dataset.filename;
    });

    if (confirm(`Are you sure you want to delete ${selectedFiles.length} files?`)) {
        selectedFiles.forEach(filename => {
            audioFiles.delete(filename);
            favorites.delete(filename);
            const card = document.querySelector(`[data-filename="${filename}"]`);
            card.remove();
        });
        updateFavoritesList();
        updateBatchActions();
    }
};

// Utility functions
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function resetUploadState() {
    progressContainer.style.display = 'none';
    progressBar.style.width = '0%';
    progressText.textContent = '0%';
    fileInput.value = '';
} 