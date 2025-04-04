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

confirmUploadBtn.addEventListener('click', () => {
    uploadModal.style.display = 'none';
    resetUploadState();
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
        alert('请只选择WAV格式的文件');
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
        const skipMessage = `以下文件已存在:\n${filesToSkip.map(f => f.name).join('\n')}\n\n是否要覆盖它们?`;
        if (confirm(skipMessage)) {
            // 先移除已存在的文件和DOM元素
            filesToSkip.forEach(file => {
                if (audioFiles.has(file.name)) {
                    const card = document.querySelector(`[data-filename="${file.name}"]`);
                    if (card) card.remove();
                    audioFiles.delete(file.name);
                    favorites.delete(file.name);
                }
            });
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
        
        // Upload file to backend
        const formData = new FormData();
        formData.append('file', file);
        
        try {
            const response = await fetch('http://localhost:8000/api/upload-file/', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error('文件上传失败');
            }
        } catch (error) {
            console.error('Error uploading file:', error);
            alert(`上传文件 ${file.name} 失败: ${error.message}`);
            continue;
        }
        
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

    // Create envelope container
    const envelopeContainer = document.createElement('div');
    envelopeContainer.className = 'envelope-container';
    
    const envelope = document.createElement('div');
    envelope.id = `envelope-${audioFile.name}`;
    envelopeContainer.appendChild(envelope);

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
        <p title="${audioFile.name}">文件名: ${audioFile.name}</p>
        <p title="${audioFile.duration}">时长: ${audioFile.duration}</p>
        <p title="${audioFile.sampleRate}">采样率: ${audioFile.sampleRate} Hz</p>
        <p title="${audioFile.size}">大小: ${audioFile.size}</p>
    `;

    // Create controls
    const controls = document.createElement('div');
    controls.className = 'audio-controls';
    controls.innerHTML = `
        <input type="checkbox" class="audio-select">
        <button class="play-btn">播放</button>
        <button class="favorite-btn" data-favorite="${audioFile.isFavorite}">
            ${audioFile.isFavorite ? '取消收藏' : '收藏'}
        </button>
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
    card.appendChild(envelopeContainer);  // 添加包络区域
    card.appendChild(info);
    card.appendChild(controls);
    audioCards.appendChild(card);

    // Draw waveforms
    drawWaveform(audioFile);
    drawEnvelope(audioFile);  // 新增绘制包络函数
}

// 新增绘制包络函数
function drawEnvelope(audioFile) {
    const envelope = document.getElementById(`envelope-${audioFile.name}`);
    const data = audioFile.buffer.getChannelData(0);
    const canvas = document.createElement('canvas');
    canvas.width = 373;
    canvas.height = 60;  // 包络区域高度较小
    
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'var(--primary-light)';
    
    // 计算包络
    const segmentSize = Math.floor(data.length / canvas.width);
    const envelopeData = [];
    
    for (let i = 0; i < canvas.width; i++) {
        const start = i * segmentSize;
        const end = Math.min(start + segmentSize, data.length);
        const segment = data.slice(start, end);
        const max = Math.max(...segment.map(Math.abs));
        envelopeData.push(max);
    }
    
    // 绘制包络
    ctx.beginPath();
    ctx.moveTo(0, canvas.height);
    for (let x = 0; x < canvas.width; x++) {
        const y = canvas.height - (envelopeData[x] * canvas.height);
        ctx.lineTo(x, y);
    }
    ctx.lineTo(canvas.width, canvas.height);
    ctx.closePath();
    ctx.fill();
    
    envelope.appendChild(canvas);
}

function drawWaveform(audioFile) {
    const waveform = document.getElementById(`waveform-${audioFile.name}`);
    const data = audioFile.buffer.getChannelData(0);
    const step = Math.ceil(data.length / 100);
    const amp = 50;
    
    const canvas = document.createElement('canvas');
    canvas.width = 373;
    canvas.height = 60;
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
        button.setAttribute('data-favorite', 'false');
        button.textContent = '收藏';
    } else {
        favorites.add(filename);
        button.setAttribute('data-favorite', 'true');
        button.textContent = '取消收藏';
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
                    取消收藏
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
        favoriteBtn.setAttribute('data-favorite', 'false');
        favoriteBtn.textContent = '收藏';
    }
}

function removeAudioFile(filename) {
    if (confirm(`确定要删除 ${filename} 吗?`)) {
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
            favoriteBtn.setAttribute('data-favorite', 'true');
            favoriteBtn.textContent = '取消收藏';
        }
    });
    updateFavoritesList();
};

document.getElementById('batchDelete').onclick = () => {
    const selectedFiles = Array.from(document.querySelectorAll('.audio-select:checked')).map(checkbox => {
        const card = checkbox.closest('.audio-card');
        return card.dataset.filename;
    });

    if (confirm(`确定要删除 ${selectedFiles.length} 个文件吗?`)) {
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
    if (bytes === 0) return '0 字节';
    const k = 1024;
    const sizes = ['字节', 'KB', 'MB', 'GB'];
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

// 在全局变量部分添加
const menuToggle = document.createElement('div');
menuToggle.className = 'menu-toggle';
menuToggle.innerHTML = '☰';

// 在 header 中添加菜单按钮
document.querySelector('header').prepend(menuToggle);

// 添加事件监听
menuToggle.addEventListener('click', () => {
    document.querySelector('.sidebar').classList.toggle('active');
    document.querySelector('.container').classList.toggle('active');
});

// 在 DOM Elements 部分添加
const sidebarLinks = document.querySelectorAll('.sidebar-nav a');

// 事件监听器部分保持不变
sidebarLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        sidebarLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        
        // 这里可以添加切换不同视图的逻辑
        const section = link.textContent.trim();
        console.log(`切换到: ${section}`);
    });
});

// Add this after the existing code
document.getElementById('downloadFavorites').addEventListener('click', async () => {
    try {
        // Get the list of favorite files from the favorites table
        const favoriteRows = document.querySelectorAll('#favoritesList tr');
        const favorites = Array.from(favoriteRows).map(row => {
            return row.querySelector('td:nth-child(2)').textContent; // Get the filename from the second column
        });

        if (favorites.length === 0) {
            alert('收藏夹为空，请先添加音频文件到收藏夹');
            return;
        }

        console.log('Attempting to download files:', favorites);

        const response = await fetch('http://localhost:8000/api/download-favorites/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ favorites }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`下载失败: ${errorText}`);
        }

        // Create a blob from the response
        const blob = await response.blob();
        
        if (blob.size === 0) {
            throw new Error('下载的文件为空');
        }
        
        // Create a download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'favorites.zip';
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    } catch (error) {
        console.error('Error downloading favorites:', error);
        alert(error.message);
    }
});