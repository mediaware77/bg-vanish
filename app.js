// Elementos do DOM
const imageInput = document.getElementById('imageInput');
const fileName = document.getElementById('fileName');
const removeBtn = document.getElementById('removeBtn');
const loading = document.getElementById('loading');
const originalPreview = document.getElementById('originalPreview');
const resultPreview = document.getElementById('resultPreview');
const downloadBtn = document.getElementById('downloadBtn');
const resetBtn = document.getElementById('resetBtn');

// Elementos de corte
const cropBtn = document.getElementById('cropBtn');
const cropToolbar = document.getElementById('cropToolbar');
const cropResultLabel = document.getElementById('cropResultLabel');
const aspectBtns = document.querySelectorAll('.aspect-btn');
const applyCropBtn = document.getElementById('applyCropBtn');
const cancelCropBtn = document.getElementById('cancelCropBtn');

// Estado da aplicação
let selectedFile = null;
let resultBlob = null;
let removeBackground = null;

// Estado de corte
let cropMode = false;
let cropTarget = 'original';
let cropAspectRatio = null;
let cropSelection = null;
let isDragging = false;
let isResizing = false;
let activeHandle = null;
let dragStartPos = { x: 0, y: 0 };
let initialCropRect = null;

// Carregar biblioteca de forma assíncrona
async function loadLibrary() {
    try {
        const module = await import('https://esm.sh/@imgly/background-removal@1.4.5');
        removeBackground = module.removeBackground;
        console.log('Biblioteca carregada com sucesso!');
    } catch (error) {
        console.error('Erro ao carregar biblioteca:', error);
        alert('Erro ao carregar biblioteca de remoção de fundo. Verifique sua conexão.');
    }
}

// Iniciar carregamento da biblioteca
loadLibrary();

// Evento: Seleção de arquivo
imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];

    if (file) {
        selectedFile = file;
        fileName.textContent = file.name;
        removeBtn.disabled = false;

        // Mostrar preview da imagem original
        const reader = new FileReader();
        reader.onload = (event) => {
            originalPreview.innerHTML = `<img src="${event.target.result}" alt="Original">`;
        };
        reader.readAsDataURL(file);

        // Limpar resultado anterior
        resultPreview.innerHTML = '<p class="placeholder">Resultado aparecerá aqui</p>';
        resultPreview.classList.remove('transparent-bg');
        downloadBtn.classList.add('hidden');
        resetBtn.classList.remove('hidden');
        cropBtn.classList.remove('hidden');
        resultBlob = null;
    }
});

// Evento: Botão "Remover BG"
removeBtn.addEventListener('click', async () => {
    if (!selectedFile) return;

    if (!removeBackground) {
        alert('Biblioteca ainda está carregando. Aguarde um momento.');
        return;
    }

    // Mostrar loading
    loading.classList.remove('hidden');
    removeBtn.disabled = true;

    try {
        // Processar imagem
        resultBlob = await removeBackground(selectedFile);

        // Criar URL para exibir resultado
        const resultUrl = URL.createObjectURL(resultBlob);

        // Mostrar resultado com fundo xadrez (indica transparência)
        resultPreview.innerHTML = `<img src="${resultUrl}" alt="Sem fundo">`;
        resultPreview.classList.add('transparent-bg');

        // Mostrar botão de download
        downloadBtn.classList.remove('hidden');

        // Habilitar opção de cortar resultado
        cropResultLabel.classList.remove('hidden');

    } catch (error) {
        console.error('Erro ao remover fundo:', error);
        resultPreview.innerHTML = '<p class="placeholder" style="color: #e94560;">Erro ao processar imagem</p>';
    } finally {
        // Esconder loading
        loading.classList.add('hidden');
        removeBtn.disabled = false;
    }
});

// Evento: Botão de download
downloadBtn.addEventListener('click', () => {
    if (!resultBlob) return;

    // Criar link de download
    const link = document.createElement('a');
    const originalName = selectedFile.name.replace(/\.[^/.]+$/, '');
    link.download = `${originalName}_sem_fundo.png`;
    link.href = URL.createObjectURL(resultBlob);
    link.click();

    // Limpar URL
    URL.revokeObjectURL(link.href);
});

// Evento: Botão de reiniciar
resetBtn.addEventListener('click', () => {
    // Sair do modo de corte se ativo
    if (cropMode) {
        exitCropMode();
    }

    // Limpar estado
    selectedFile = null;
    resultBlob = null;

    // Limpar input
    imageInput.value = '';
    fileName.textContent = 'Nenhum arquivo selecionado';

    // Limpar previews
    originalPreview.innerHTML = '<p class="placeholder">Imagem original aparecerá aqui</p>';
    resultPreview.innerHTML = '<p class="placeholder">Resultado aparecerá aqui</p>';
    resultPreview.classList.remove('transparent-bg');

    // Esconder botões e desabilitar
    removeBtn.disabled = true;
    downloadBtn.classList.add('hidden');
    resetBtn.classList.add('hidden');
    cropBtn.classList.add('hidden');
    cropResultLabel.classList.add('hidden');

    // Resetar estado de corte
    cropTarget = 'original';
    document.querySelector('input[name="cropTarget"][value="original"]').checked = true;
});

// ===== FUNÇÕES DE CORTE =====

function enterCropMode() {
    cropMode = true;
    cropToolbar.classList.remove('hidden');
    cropBtn.classList.add('hidden');
    removeBtn.disabled = true;
    downloadBtn.classList.add('hidden');

    if (resultBlob) {
        cropResultLabel.classList.remove('hidden');
    }

    const targetPreview = cropTarget === 'original' ? originalPreview : resultPreview;
    const targetBox = targetPreview.closest('.image-box');
    targetBox.classList.add('crop-active');

    initCropOverlay(targetPreview);
}

function exitCropMode() {
    cropMode = false;
    cropToolbar.classList.add('hidden');
    cropBtn.classList.remove('hidden');
    removeBtn.disabled = !selectedFile;

    if (resultBlob) {
        downloadBtn.classList.remove('hidden');
    }

    removeCropOverlay();

    document.querySelectorAll('.image-box').forEach(box => {
        box.classList.remove('crop-active');
    });

    cropSelection = null;
}

function initCropOverlay(previewElement) {
    const img = previewElement.querySelector('img');
    if (!img) return;

    if (!img.complete) {
        img.onload = () => initCropOverlay(previewElement);
        return;
    }

    // Remover overlay existente
    removeCropOverlay();

    const overlayContainer = document.createElement('div');
    overlayContainer.className = 'crop-overlay-container';
    overlayContainer.id = 'cropOverlay';

    const previewRect = previewElement.getBoundingClientRect();
    const imgWidth = img.offsetWidth;
    const imgHeight = img.offsetHeight;
    const offsetX = (previewRect.width - imgWidth) / 2;
    const offsetY = (previewRect.height - imgHeight) / 2;

    overlayContainer.dataset.scaleX = img.naturalWidth / imgWidth;
    overlayContainer.dataset.scaleY = img.naturalHeight / imgHeight;
    overlayContainer.dataset.offsetX = offsetX;
    overlayContainer.dataset.offsetY = offsetY;
    overlayContainer.dataset.imgWidth = imgWidth;
    overlayContainer.dataset.imgHeight = imgHeight;

    const selection = document.createElement('div');
    selection.className = 'crop-selection';
    selection.id = 'cropSelection';

    // Seleção inicial: 80% da imagem, centralizada
    const initialWidth = imgWidth * 0.8;
    const initialHeight = imgHeight * 0.8;
    const initialX = offsetX + (imgWidth - initialWidth) / 2;
    const initialY = offsetY + (imgHeight - initialHeight) / 2;

    selection.style.left = `${initialX}px`;
    selection.style.top = `${initialY}px`;
    selection.style.width = `${initialWidth}px`;
    selection.style.height = `${initialHeight}px`;

    cropSelection = { x: initialX, y: initialY, width: initialWidth, height: initialHeight };

    // Adicionar handles
    const handles = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
    handles.forEach(pos => {
        const handle = document.createElement('div');
        handle.className = `crop-handle ${pos}`;
        handle.dataset.handle = pos;
        selection.appendChild(handle);
    });

    // Criar áreas escurecidas
    const dimmedAreas = createDimmedAreas(offsetX, offsetY, imgWidth, imgHeight);
    dimmedAreas.forEach(area => overlayContainer.appendChild(area));

    overlayContainer.appendChild(selection);
    previewElement.appendChild(overlayContainer);

    addCropInteractionListeners(overlayContainer, selection);
}

function createDimmedAreas(imgOffsetX, imgOffsetY, imgWidth, imgHeight) {
    const areas = [];
    const sel = cropSelection;

    // Topo
    const top = document.createElement('div');
    top.className = 'crop-dimmed-area crop-dim-top';
    top.style.left = `${imgOffsetX}px`;
    top.style.top = `${imgOffsetY}px`;
    top.style.width = `${imgWidth}px`;
    top.style.height = `${sel.y - imgOffsetY}px`;
    areas.push(top);

    // Base
    const bottom = document.createElement('div');
    bottom.className = 'crop-dimmed-area crop-dim-bottom';
    bottom.style.left = `${imgOffsetX}px`;
    bottom.style.top = `${sel.y + sel.height}px`;
    bottom.style.width = `${imgWidth}px`;
    bottom.style.height = `${imgOffsetY + imgHeight - (sel.y + sel.height)}px`;
    areas.push(bottom);

    // Esquerda
    const left = document.createElement('div');
    left.className = 'crop-dimmed-area crop-dim-left';
    left.style.left = `${imgOffsetX}px`;
    left.style.top = `${sel.y}px`;
    left.style.width = `${sel.x - imgOffsetX}px`;
    left.style.height = `${sel.height}px`;
    areas.push(left);

    // Direita
    const right = document.createElement('div');
    right.className = 'crop-dimmed-area crop-dim-right';
    right.style.left = `${sel.x + sel.width}px`;
    right.style.top = `${sel.y}px`;
    right.style.width = `${imgOffsetX + imgWidth - (sel.x + sel.width)}px`;
    right.style.height = `${sel.height}px`;
    areas.push(right);

    return areas;
}

function removeCropOverlay() {
    const overlay = document.getElementById('cropOverlay');
    if (overlay) {
        overlay.remove();
    }
}

function addCropInteractionListeners(overlay, selection) {
    const handles = selection.querySelectorAll('.crop-handle');

    // Redimensionamento via handles
    handles.forEach(handle => {
        handle.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            isResizing = true;
            activeHandle = handle.dataset.handle;
            dragStartPos = { x: e.clientX, y: e.clientY };
            initialCropRect = { ...cropSelection };
            document.addEventListener('mousemove', onCropResize);
            document.addEventListener('mouseup', onCropEnd);
        });

        handle.addEventListener('touchstart', (e) => {
            e.stopPropagation();
            e.preventDefault();
            isResizing = true;
            activeHandle = handle.dataset.handle;
            const touch = e.touches[0];
            dragStartPos = { x: touch.clientX, y: touch.clientY };
            initialCropRect = { ...cropSelection };
            document.addEventListener('touchmove', onCropResizeTouch, { passive: false });
            document.addEventListener('touchend', onCropEnd);
        });
    });

    // Arrastar seleção
    selection.addEventListener('mousedown', (e) => {
        if (e.target.classList.contains('crop-handle')) return;
        isDragging = true;
        dragStartPos = { x: e.clientX, y: e.clientY };
        initialCropRect = { ...cropSelection };
        document.addEventListener('mousemove', onCropDrag);
        document.addEventListener('mouseup', onCropEnd);
    });

    selection.addEventListener('touchstart', (e) => {
        if (e.target.classList.contains('crop-handle')) return;
        e.preventDefault();
        isDragging = true;
        const touch = e.touches[0];
        dragStartPos = { x: touch.clientX, y: touch.clientY };
        initialCropRect = { ...cropSelection };
        document.addEventListener('touchmove', onCropDragTouch, { passive: false });
        document.addEventListener('touchend', onCropEnd);
    });
}

function onCropDrag(e) {
    if (!isDragging) return;
    handleDrag(e.clientX, e.clientY);
}

function onCropDragTouch(e) {
    if (!isDragging) return;
    e.preventDefault();
    const touch = e.touches[0];
    handleDrag(touch.clientX, touch.clientY);
}

function handleDrag(clientX, clientY) {
    const overlay = document.getElementById('cropOverlay');
    if (!overlay) return;

    const imgWidth = parseFloat(overlay.dataset.imgWidth);
    const imgHeight = parseFloat(overlay.dataset.imgHeight);
    const offsetX = parseFloat(overlay.dataset.offsetX);
    const offsetY = parseFloat(overlay.dataset.offsetY);

    const dx = clientX - dragStartPos.x;
    const dy = clientY - dragStartPos.y;

    let newX = initialCropRect.x + dx;
    let newY = initialCropRect.y + dy;

    // Restringir aos limites da imagem
    newX = Math.max(offsetX, Math.min(newX, offsetX + imgWidth - cropSelection.width));
    newY = Math.max(offsetY, Math.min(newY, offsetY + imgHeight - cropSelection.height));

    cropSelection.x = newX;
    cropSelection.y = newY;

    updateCropUI();
}

function onCropResize(e) {
    if (!isResizing) return;
    handleResize(e.clientX, e.clientY);
}

function onCropResizeTouch(e) {
    if (!isResizing) return;
    e.preventDefault();
    const touch = e.touches[0];
    handleResize(touch.clientX, touch.clientY);
}

function handleResize(clientX, clientY) {
    const overlay = document.getElementById('cropOverlay');
    if (!overlay) return;

    const imgWidth = parseFloat(overlay.dataset.imgWidth);
    const imgHeight = parseFloat(overlay.dataset.imgHeight);
    const offsetX = parseFloat(overlay.dataset.offsetX);
    const offsetY = parseFloat(overlay.dataset.offsetY);

    const dx = clientX - dragStartPos.x;
    const dy = clientY - dragStartPos.y;

    let newRect = { ...initialCropRect };
    const handle = activeHandle;

    if (handle.includes('e')) {
        newRect.width = Math.max(50, initialCropRect.width + dx);
    }
    if (handle.includes('w')) {
        const widthChange = Math.min(dx, initialCropRect.width - 50);
        newRect.x = initialCropRect.x + widthChange;
        newRect.width = initialCropRect.width - widthChange;
    }
    if (handle.includes('s')) {
        newRect.height = Math.max(50, initialCropRect.height + dy);
    }
    if (handle.includes('n')) {
        const heightChange = Math.min(dy, initialCropRect.height - 50);
        newRect.y = initialCropRect.y + heightChange;
        newRect.height = initialCropRect.height - heightChange;
    }

    // Aplicar restrição de proporção
    if (cropAspectRatio) {
        newRect = constrainToAspectRatio(newRect, handle);
    }

    // Restringir aos limites da imagem
    newRect.x = Math.max(offsetX, newRect.x);
    newRect.y = Math.max(offsetY, newRect.y);
    newRect.width = Math.min(newRect.width, offsetX + imgWidth - newRect.x);
    newRect.height = Math.min(newRect.height, offsetY + imgHeight - newRect.y);

    cropSelection = newRect;
    updateCropUI();
}

function constrainToAspectRatio(rect, handle) {
    if (!cropAspectRatio) return rect;

    const targetRatio = cropAspectRatio.width / cropAspectRatio.height;

    if (handle.includes('e') || handle.includes('w')) {
        rect.height = rect.width / targetRatio;
    } else if (handle.includes('n') || handle.includes('s')) {
        rect.width = rect.height * targetRatio;
    } else {
        const currentRatio = rect.width / rect.height;
        if (currentRatio > targetRatio) {
            rect.height = rect.width / targetRatio;
        } else {
            rect.width = rect.height * targetRatio;
        }
    }

    return rect;
}

function onCropEnd() {
    isDragging = false;
    isResizing = false;
    activeHandle = null;
    document.removeEventListener('mousemove', onCropDrag);
    document.removeEventListener('mousemove', onCropResize);
    document.removeEventListener('mouseup', onCropEnd);
    document.removeEventListener('touchmove', onCropDragTouch);
    document.removeEventListener('touchmove', onCropResizeTouch);
    document.removeEventListener('touchend', onCropEnd);
}

function updateCropUI() {
    const selection = document.getElementById('cropSelection');
    if (!selection) return;

    selection.style.left = `${cropSelection.x}px`;
    selection.style.top = `${cropSelection.y}px`;
    selection.style.width = `${cropSelection.width}px`;
    selection.style.height = `${cropSelection.height}px`;

    updateDimmedAreas();
}

function updateDimmedAreas() {
    const overlay = document.getElementById('cropOverlay');
    if (!overlay) return;

    const imgWidth = parseFloat(overlay.dataset.imgWidth);
    const imgHeight = parseFloat(overlay.dataset.imgHeight);
    const offsetX = parseFloat(overlay.dataset.offsetX);
    const offsetY = parseFloat(overlay.dataset.offsetY);

    const dimTop = overlay.querySelector('.crop-dim-top');
    const dimBottom = overlay.querySelector('.crop-dim-bottom');
    const dimLeft = overlay.querySelector('.crop-dim-left');
    const dimRight = overlay.querySelector('.crop-dim-right');

    if (dimTop) {
        dimTop.style.height = `${cropSelection.y - offsetY}px`;
    }
    if (dimBottom) {
        dimBottom.style.top = `${cropSelection.y + cropSelection.height}px`;
        dimBottom.style.height = `${offsetY + imgHeight - (cropSelection.y + cropSelection.height)}px`;
    }
    if (dimLeft) {
        dimLeft.style.top = `${cropSelection.y}px`;
        dimLeft.style.width = `${cropSelection.x - offsetX}px`;
        dimLeft.style.height = `${cropSelection.height}px`;
    }
    if (dimRight) {
        dimRight.style.left = `${cropSelection.x + cropSelection.width}px`;
        dimRight.style.top = `${cropSelection.y}px`;
        dimRight.style.width = `${offsetX + imgWidth - (cropSelection.x + cropSelection.width)}px`;
        dimRight.style.height = `${cropSelection.height}px`;
    }
}

async function applyCrop() {
    if (!cropSelection) return;

    const overlay = document.getElementById('cropOverlay');
    const scaleX = parseFloat(overlay.dataset.scaleX);
    const scaleY = parseFloat(overlay.dataset.scaleY);
    const offsetX = parseFloat(overlay.dataset.offsetX);
    const offsetY = parseFloat(overlay.dataset.offsetY);

    // Converter para coordenadas reais da imagem
    const actualCrop = {
        x: (cropSelection.x - offsetX) * scaleX,
        y: (cropSelection.y - offsetY) * scaleY,
        width: cropSelection.width * scaleX,
        height: cropSelection.height * scaleY
    };

    const targetPreview = cropTarget === 'original' ? originalPreview : resultPreview;
    const sourceImg = targetPreview.querySelector('img');

    // Criar canvas para corte
    const canvas = document.createElement('canvas');
    canvas.width = actualCrop.width;
    canvas.height = actualCrop.height;
    const ctx = canvas.getContext('2d');

    // Desenhar porção cortada
    ctx.drawImage(
        sourceImg,
        actualCrop.x, actualCrop.y, actualCrop.width, actualCrop.height,
        0, 0, actualCrop.width, actualCrop.height
    );

    // Converter para blob
    const croppedBlob = await new Promise(resolve => {
        canvas.toBlob(resolve, 'image/png');
    });

    const croppedUrl = URL.createObjectURL(croppedBlob);

    if (cropTarget === 'original') {
        originalPreview.innerHTML = `<img src="${croppedUrl}" alt="Original Recortado">`;
        selectedFile = new File([croppedBlob], selectedFile.name, { type: 'image/png' });

        // Limpar resultado anterior
        if (resultBlob) {
            resultPreview.innerHTML = '<p class="placeholder">Resultado aparecerá aqui</p>';
            resultPreview.classList.remove('transparent-bg');
            resultBlob = null;
        }
    } else {
        resultPreview.innerHTML = `<img src="${croppedUrl}" alt="Resultado Recortado">`;
        resultBlob = croppedBlob;
    }

    exitCropMode();
}

// ===== EVENT LISTENERS DE CORTE =====

cropBtn.addEventListener('click', enterCropMode);
cancelCropBtn.addEventListener('click', exitCropMode);
applyCropBtn.addEventListener('click', applyCrop);

aspectBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        aspectBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const ratio = btn.dataset.ratio;
        if (ratio === 'free') {
            cropAspectRatio = null;
        } else {
            const [w, h] = ratio.split(':').map(Number);
            cropAspectRatio = { width: w, height: h };

            // Ajustar seleção atual para a proporção
            if (cropSelection) {
                const currentWidth = cropSelection.width;
                cropSelection.height = currentWidth / (w / h);
                updateCropUI();
            }
        }
    });
});

document.querySelectorAll('input[name="cropTarget"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        if (cropMode) {
            removeCropOverlay();
            document.querySelectorAll('.image-box').forEach(box => {
                box.classList.remove('crop-active');
            });

            cropTarget = e.target.value;
            const targetPreview = cropTarget === 'original' ? originalPreview : resultPreview;
            targetPreview.closest('.image-box').classList.add('crop-active');
            initCropOverlay(targetPreview);
        }
    });
});

console.log('Script carregado!');
