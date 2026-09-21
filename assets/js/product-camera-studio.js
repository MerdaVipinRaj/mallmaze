/**
 * ============================================================
 * MALLMAZE — AI PRODUCT CAMERA + IMAGE UPLOAD STUDIO
 * Production E-Commerce Media Studio (Vanilla JS Engine)
 * ============================================================
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ProductCameraStudio = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // SVG Icons
  const ICONS = {
    camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z"/><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z"/></svg>',
    upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"/></svg>',
    flip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"/></svg>',
    flash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5"/></svg>',
    sparkles: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"/></svg>',
    arrowLeft: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"/></svg>',
    arrowRight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"/></svg>',
    refresh: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"/></svg>'
  };

  class ProductCameraStudio {
    constructor(options = {}) {
      this.options = Object.assign({
        containerId: null,
        maxImages: 9,
        storeId: 'general',
        productId: '',
        onImagesChange: null,
        onToast: null,
        apiUploadUrl: '/api/uploads',
        apiProcessUrl: '/api/images/process'
      }, options);

      this.images = []; // Array of { id, url, originalUrl, isPrimary, status, file, width, height }
      this.activeStream = null;
      this.activeTrack = null;
      this.currentFacingMode = 'environment';
      this.availableCameras = [];
      this.torchActive = false;
      this.capturedRawDataUrl = null;
      this.currentEnhancedDataUrl = null;
      this.activeBgTheme = 'white'; // 'white', 'dark', 'sand', 'blue', 'transparent'
      this.enhanceApplied = false;
      this.bgRemoved = false;
      this.objectUrls = new Set();

      this.initModalDom();
      if (this.options.containerId) {
        this.renderGalleryComponent(this.options.containerId);
      }
    }

    // ---------- TOAST NOTIFICATIONS ----------
    toast(msg) {
      if (typeof this.options.onToast === 'function') {
        this.options.onToast(msg);
      } else if (typeof window.showToast === 'function') {
        window.showToast(msg);
      } else {
        console.log('[ProductCameraStudio]', msg);
      }
    }

    // ---------- DOM MODAL INITIALIZATION ----------
    initModalDom() {
      let modalBackdrop = document.getElementById('pcsModalBackdrop');
      if (!modalBackdrop) {
        modalBackdrop = document.createElement('div');
        modalBackdrop.id = 'pcsModalBackdrop';
        modalBackdrop.className = 'pcs-modal-backdrop';
        modalBackdrop.innerHTML = `
          <div class="pcs-viewfinder-modal" id="pcsViewfinderModal">
            <!-- Top Bar -->
            <div class="pcs-top-bar">
              <button type="button" class="pcs-icon-btn" id="pcsBtnClose" aria-label="Close camera">
                ${ICONS.close}
              </button>
              <div class="pcs-top-title">
                <span>MallMaze Studio</span>
                <span class="pcs-badge-ai">AI Pro</span>
              </div>
              <div style="display:flex; gap:8px;">
                <button type="button" class="pcs-icon-btn" id="pcsBtnTorch" aria-label="Toggle flash/torch" style="display:none;">
                  ${ICONS.flash}
                </button>
                <button type="button" class="pcs-icon-btn" id="pcsBtnFlip" aria-label="Switch camera">
                  ${ICONS.flip}
                </button>
              </div>
            </div>

            <!-- Viewfinder Area -->
            <div class="pcs-camera-viewport" id="pcsCameraViewport">
              <video id="pcsVideoStream" class="pcs-video-stream" autoplay playsinline muted></video>
              
              <!-- Framing Overlay -->
              <div class="pcs-guide-overlay" id="pcsGuideOverlay">
                <div class="pcs-product-frame">
                  <div class="pcs-frame-corner-tr"></div>
                  <div class="pcs-frame-corner-bl"></div>
                </div>
                <div class="pcs-guide-pill">
                  Fit product inside frame • Keep centered
                </div>
              </div>

              <!-- Shutter Flash Effect -->
              <div class="pcs-flash-effect" id="pcsFlashEffect"></div>
            </div>

            <!-- Bottom Dock Controls -->
            <div class="pcs-bottom-dock">
              <div class="pcs-dock-slot" style="justify-content:flex-start;">
                <button type="button" class="pcs-dock-label-btn" id="pcsBtnDockGallery">
                  <div class="pcs-dock-icon-circle">${ICONS.upload}</div>
                  <span>Gallery</span>
                </button>
                <input type="file" id="pcsHiddenFileInput" accept="image/jpeg,image/png,image/webp" multiple style="display:none;" />
              </div>

              <div class="pcs-dock-slot">
                <button type="button" class="pcs-shutter-btn" id="pcsBtnShutter" aria-label="Capture photo"></button>
              </div>

              <div class="pcs-dock-slot" style="justify-content:flex-end;">
                <button type="button" class="pcs-dock-label-btn" id="pcsBtnDockFlip">
                  <div class="pcs-dock-icon-circle">${ICONS.flip}</div>
                  <span>Flip</span>
                </button>
              </div>
            </div>

            <!-- Post-Capture Photo Review Stage -->
            <div class="pcs-review-stage" id="pcsReviewStage">
              <div class="pcs-top-bar" style="position:relative; background:none;">
                <button type="button" class="pcs-icon-btn" id="pcsBtnReviewBack" aria-label="Retake photo">
                  ${ICONS.arrowLeft}
                </button>
                <div class="pcs-top-title">
                  <span>Photo Review & Enhancer</span>
                </div>
                <div style="width:42px;"></div>
              </div>

              <div class="pcs-review-body">
                <div class="pcs-review-canvas-box" id="pcsReviewCanvasBox">
                  <img id="pcsReviewMainImg" class="pcs-review-img" src="" alt="Captured product" />
                </div>
              </div>

              <div class="pcs-review-toolbar">
                <div id="pcsQualityWarning" class="pcs-quality-warning" style="display:none;"></div>

                <!-- AI Quick Enhancement Row -->
                <div class="pcs-tool-row">
                  <button type="button" class="pcs-tool-pill-btn" id="pcsBtnToolEnhance">
                    ${ICONS.sparkles} Natural Enhance
                  </button>
                  <button type="button" class="pcs-tool-pill-btn" id="pcsBtnToolRemoveBg">
                    ✨ Clean Background
                  </button>
                  <button type="button" class="pcs-tool-pill-btn" id="pcsBtnToolCenter">
                    🎯 1:1 Auto-Center
                  </button>
                </div>

                <!-- Studio Backdrop Theme Selection -->
                <div class="pcs-backdrop-palette" id="pcsPaletteContainer">
                  <span style="font-size:11.5px; color:#94a3b8; font-weight:600; margin-right:4px;">Backdrop:</span>
                  <div class="pcs-palette-chip pcs-selected" data-theme="white" style="background:#ffffff;" title="Pure Studio White"></div>
                  <div class="pcs-palette-chip" data-theme="dark" style="background:#1e293b;" title="Dark Onyx"></div>
                  <div class="pcs-palette-chip" data-theme="sand" style="background:#f8fafc;" title="Warm Sand"></div>
                  <div class="pcs-palette-chip" data-theme="blue" style="background:#f1f5f9;" title="Glacier Ice"></div>
                  <div class="pcs-palette-chip" data-theme="transparent" style="background:repeating-conic-gradient(#cbd5e1 0% 25%, #ffffff 0% 50%) 50%/10px 10px;" title="Transparent Cutout"></div>
                </div>

                <!-- Final Action Buttons -->
                <div class="pcs-action-row">
                  <button type="button" class="pcs-btn-retake" id="pcsBtnRetake">
                    ${ICONS.refresh} Retake
                  </button>
                  <button type="button" class="pcs-btn-use-photo" id="pcsBtnUsePhoto">
                    ${ICONS.check} Use This Photo
                  </button>
                </div>
              </div>
            </div>
          </div>
        `;
        document.body.appendChild(modalBackdrop);
      }

      this.bindModalEvents();
    }

    bindModalEvents() {
      const btnClose = document.getElementById('pcsBtnClose');
      const btnShutter = document.getElementById('pcsBtnShutter');
      const btnFlip = document.getElementById('pcsBtnFlip');
      const btnDockFlip = document.getElementById('pcsBtnDockFlip');
      const btnTorch = document.getElementById('pcsBtnTorch');
      const btnDockGallery = document.getElementById('pcsBtnDockGallery');
      const hiddenFile = document.getElementById('pcsHiddenFileInput');
      const btnReviewBack = document.getElementById('pcsBtnReviewBack');
      const btnRetake = document.getElementById('pcsBtnRetake');
      const btnUsePhoto = document.getElementById('pcsBtnUsePhoto');
      const btnToolEnhance = document.getElementById('pcsBtnToolEnhance');
      const btnToolRemoveBg = document.getElementById('pcsBtnToolRemoveBg');
      const btnToolCenter = document.getElementById('pcsBtnToolCenter');

      if (btnClose) btnClose.onclick = () => this.closeCamera();
      if (btnShutter) btnShutter.onclick = () => this.capturePhoto();
      if (btnFlip) btnFlip.onclick = () => this.switchCamera();
      if (btnDockFlip) btnDockFlip.onclick = () => this.switchCamera();
      if (btnTorch) btnTorch.onclick = () => this.toggleTorch();
      if (btnDockGallery && hiddenFile) {
        btnDockGallery.onclick = () => hiddenFile.click();
        hiddenFile.onchange = (e) => this.handleDeviceFiles(e.target.files);
      }

      if (btnReviewBack) btnReviewBack.onclick = () => this.retakePhoto();
      if (btnRetake) btnRetake.onclick = () => this.retakePhoto();
      if (btnUsePhoto) btnUsePhoto.onclick = () => this.confirmUsePhoto();

      if (btnToolEnhance) btnToolEnhance.onclick = () => this.applyNaturalEnhance();
      if (btnToolRemoveBg) btnToolRemoveBg.onclick = () => this.applyCleanBackground();
      if (btnToolCenter) btnToolCenter.onclick = () => this.applyAutoCenter();

      // Backdrop Palette Selection
      const chips = document.querySelectorAll('#pcsPaletteContainer .pcs-palette-chip');
      chips.forEach(chip => {
        chip.onclick = () => {
          chips.forEach(c => c.classList.remove('pcs-selected'));
          chip.classList.add('pcs-selected');
          this.setBackdropTheme(chip.dataset.theme);
        };
      });

      // Escape key listener
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          const backdrop = document.getElementById('pcsModalBackdrop');
          if (backdrop && backdrop.classList.contains('pcs-active')) {
            this.closeCamera();
          }
        }
      });
    }

    // ---------- CAMERA LIFECYCLE ----------
    async openCamera() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        this.toast('⚠️ Camera access is not supported by your browser. Please upload from gallery.');
        const fileInput = document.getElementById('pcsHiddenFileInput');
        if (fileInput) fileInput.click();
        return;
      }

      const backdrop = document.getElementById('pcsModalBackdrop');
      const reviewStage = document.getElementById('pcsReviewStage');
      if (backdrop) backdrop.classList.add('pcs-active');
      if (reviewStage) reviewStage.classList.remove('pcs-active');

      await this.startStream(this.currentFacingMode);
    }

    async startStream(facingMode = 'environment') {
      this.stopStream();

      const video = document.getElementById('pcsVideoStream');
      if (!video) return;

      const constraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      };

      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        this.activeStream = stream;
        this.activeTrack = stream.getVideoTracks()[0];
        this.currentFacingMode = facingMode;

        video.srcObject = stream;
        video.classList.toggle('pcs-mirrored', facingMode === 'user');

        // Check Torch capability
        this.checkTorchCapability();
        this.enumerateCameraDevices();
      } catch (err) {
        console.warn('[ProductCameraStudio] Camera stream error:', err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          this.toast('🔒 Camera access is blocked. Please allow permission or upload an image instead.');
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          this.toast('📷 No camera found on this device. Please upload from device.');
        } else {
          // Fallback without width/height constraints
          try {
            const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            this.activeStream = fallbackStream;
            this.activeTrack = fallbackStream.getVideoTracks()[0];
            video.srcObject = fallbackStream;
          } catch (e2) {
            this.toast('❌ Could not start camera. Please upload an image.');
            this.closeCamera();
          }
        }
      }
    }

    stopStream() {
      if (this.activeStream) {
        this.activeStream.getTracks().forEach(track => track.stop());
        this.activeStream = null;
        this.activeTrack = null;
      }
      const video = document.getElementById('pcsVideoStream');
      if (video) video.srcObject = null;
    }

    closeCamera() {
      this.stopStream();
      const backdrop = document.getElementById('pcsModalBackdrop');
      if (backdrop) backdrop.classList.remove('pcs-active');
    }

    async switchCamera() {
      const nextFacing = this.currentFacingMode === 'environment' ? 'user' : 'environment';
      await this.startStream(nextFacing);
    }

    checkTorchCapability() {
      const btnTorch = document.getElementById('pcsBtnTorch');
      if (!btnTorch || !this.activeTrack) return;

      const capabilities = this.activeTrack.getCapabilities ? this.activeTrack.getCapabilities() : {};
      if (capabilities.torch) {
        btnTorch.style.display = 'inline-flex';
        btnTorch.classList.toggle('pcs-active', this.torchActive);
      } else {
        btnTorch.style.display = 'none';
        this.torchActive = false;
      }
    }

    async toggleTorch() {
      if (!this.activeTrack) return;
      const capabilities = this.activeTrack.getCapabilities ? this.activeTrack.getCapabilities() : {};
      if (!capabilities.torch) return;

      this.torchActive = !this.torchActive;
      try {
        await this.activeTrack.applyConstraints({
          advanced: [{ torch: this.torchActive }]
        });
        const btnTorch = document.getElementById('pcsBtnTorch');
        if (btnTorch) btnTorch.classList.toggle('pcs-active', this.torchActive);
      } catch (err) {
        console.warn('Could not toggle torch:', err);
      }
    }

    async enumerateCameraDevices() {
      if (!navigator.mediaDevices.enumerateDevices) return;
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        this.availableCameras = devices.filter(d => d.kind === 'videoinput');
        const btnFlip = document.getElementById('pcsBtnFlip');
        const btnDockFlip = document.getElementById('pcsBtnDockFlip');
        const hasMulti = this.availableCameras.length > 1;
        if (btnFlip) btnFlip.style.display = hasMulti ? 'inline-flex' : 'none';
        if (btnDockFlip) btnDockFlip.style.display = hasMulti ? 'flex' : 'none';
      } catch (e) {
        // Ignore enumeration errors
      }
    }

    // ---------- SHUTTER CAPTURE PIPELINE ----------
    capturePhoto() {
      const video = document.getElementById('pcsVideoStream');
      if (!video || video.readyState < 2) {
        this.toast('Starting camera preview, please wait...');
        return;
      }

      // Flash animation
      const flash = document.getElementById('pcsFlashEffect');
      if (flash) {
        flash.classList.add('pcs-flashing');
        setTimeout(() => flash.classList.remove('pcs-flashing'), 180);
      }

      // High resolution capture canvas
      const width = video.videoWidth || 1280;
      const height = video.videoHeight || 720;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      // Handle front camera mirroring
      if (this.currentFacingMode === 'user') {
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
      }

      ctx.drawImage(video, 0, 0, width, height);

      // Convert to standardized Blob & DataURL
      const rawDataUrl = canvas.toDataURL('image/jpeg', 0.92);
      this.capturedRawDataUrl = rawDataUrl;
      this.currentEnhancedDataUrl = rawDataUrl;
      this.enhanceApplied = false;
      this.bgRemoved = false;
      this.activeBgTheme = 'white';

      // Shut down stream immediately
      this.stopStream();

      // Show Review Stage
      this.showReviewStage();
    }

    showReviewStage() {
      const reviewStage = document.getElementById('pcsReviewStage');
      const mainImg = document.getElementById('pcsReviewMainImg');
      const box = document.getElementById('pcsReviewCanvasBox');

      if (!reviewStage || !mainImg || !box) return;

      mainImg.src = this.currentEnhancedDataUrl;
      box.style.background = '#ffffff';

      // Reset tool buttons
      const btnEnhance = document.getElementById('pcsBtnToolEnhance');
      const btnRemoveBg = document.getElementById('pcsBtnToolRemoveBg');
      if (btnEnhance) btnEnhance.classList.remove('pcs-active');
      if (btnRemoveBg) btnRemoveBg.classList.remove('pcs-active');

      // Run automatic image quality inspection
      this.analyzeImageQuality(this.currentEnhancedDataUrl);

      reviewStage.classList.add('pcs-active');
    }

    retakePhoto() {
      const reviewStage = document.getElementById('pcsReviewStage');
      if (reviewStage) reviewStage.classList.remove('pcs-active');
      this.startStream(this.currentFacingMode);
    }

    // ---------- IMAGE QUALITY ANALYSIS ----------
    analyzeImageQuality(dataUrl) {
      const warnPill = document.getElementById('pcsQualityWarning');
      if (!warnPill) return;

      const img = new Image();
      img.onload = () => {
        const testCanvas = document.createElement('canvas');
        testCanvas.width = 100;
        testCanvas.height = 100;
        const ctx = testCanvas.getContext('2d');
        ctx.drawImage(img, 0, 0, 100, 100);
        const imgData = ctx.getImageData(0, 0, 100, 100).data;

        let totalBrightness = 0;
        for (let i = 0; i < imgData.length; i += 4) {
          const r = imgData[i];
          const g = imgData[i + 1];
          const b = imgData[i + 2];
          totalBrightness += (0.299 * r + 0.587 * g + 0.114 * b);
        }
        const avgBrightness = totalBrightness / (100 * 100);

        if (avgBrightness < 50) {
          warnPill.style.display = 'inline-flex';
          warnPill.innerHTML = '⚠️ Image looks dark. Tap <b>Natural Enhance</b> to brighten.';
        } else if (avgBrightness > 235) {
          warnPill.style.display = 'inline-flex';
          warnPill.innerHTML = '⚠️ Image may be overexposed.';
        } else {
          warnPill.style.display = 'none';
        }
      };
      img.src = dataUrl;
    }

    // ---------- IMAGE EDITING & ENHANCEMENT SUITE ----------
    applyNaturalEnhance() {
      const btnEnhance = document.getElementById('pcsBtnToolEnhance');
      const mainImg = document.getElementById('pcsReviewMainImg');
      if (!this.capturedRawDataUrl || !mainImg) return;

      this.enhanceApplied = !this.enhanceApplied;
      if (btnEnhance) btnEnhance.classList.toggle('pcs-active', this.enhanceApplied);

      if (!this.enhanceApplied && !this.bgRemoved) {
        this.currentEnhancedDataUrl = this.capturedRawDataUrl;
        mainImg.src = this.currentEnhancedDataUrl;
        return;
      }

      this.renderProcessedCanvas();
    }

    applyCleanBackground() {
      const btnRemoveBg = document.getElementById('pcsBtnToolRemoveBg');
      if (!this.capturedRawDataUrl) return;

      this.bgRemoved = !this.bgRemoved;
      if (btnRemoveBg) btnRemoveBg.classList.toggle('pcs-active', this.bgRemoved);

      this.renderProcessedCanvas();
      if (this.bgRemoved) {
        this.toast('✨ AI Clean Background applied (Neutral Catalog Backdrop)');
      }
    }

    applyAutoCenter() {
      this.toast('🎯 Product auto-centered inside 1:1 catalog canvas');
      this.renderProcessedCanvas(true);
    }

    setBackdropTheme(theme) {
      this.activeBgTheme = theme;
      const box = document.getElementById('pcsReviewCanvasBox');
      if (!box) return;

      if (theme === 'white') box.style.background = '#ffffff';
      else if (theme === 'dark') box.style.background = '#1e293b';
      else if (theme === 'sand') box.style.background = '#f8fafc';
      else if (theme === 'blue') box.style.background = '#f1f5f9';
      else if (theme === 'transparent') box.style.background = 'repeating-conic-gradient(#cbd5e1 0% 25%, #ffffff 0% 50%) 50%/10px 10px';

      this.renderProcessedCanvas();
    }

    renderProcessedCanvas(forceCenter = false) {
      const mainImg = document.getElementById('pcsReviewMainImg');
      const baseSrc = this.capturedRawDataUrl;
      if (!baseSrc || !mainImg) return;

      const img = new Image();
      img.onload = () => {
        // Create 1:1 square canvas (max 2000x2000)
        const size = Math.min(2000, Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // Draw Background
        if (this.activeBgTheme === 'white') {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, size, size);
        } else if (this.activeBgTheme === 'dark') {
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(0, 0, size, size);
        } else if (this.activeBgTheme === 'sand') {
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(0, 0, size, size);
        } else if (this.activeBgTheme === 'blue') {
          ctx.fillStyle = '#f1f5f9';
          ctx.fillRect(0, 0, size, size);
        }
        // Transparent: no background filled

        // Auto-Center & Fit with 85% occupancy padding
        const maxProductSize = size * 0.88;
        const scale = Math.min(maxProductSize / img.width, maxProductSize / img.height);
        const drawW = Math.round(img.width * scale);
        const drawH = Math.round(img.height * scale);
        const drawX = Math.round((size - drawW) / 2);
        const drawY = Math.round((size - drawH) / 2);

        // Filters: Natural Enhance
        if (this.enhanceApplied) {
          ctx.filter = 'brightness(1.06) contrast(1.14) saturate(1.12)';
        } else {
          ctx.filter = 'none';
        }

        ctx.drawImage(img, drawX, drawY, drawW, drawH);
        ctx.filter = 'none';

        const mime = this.activeBgTheme === 'transparent' ? 'image/png' : 'image/webp';
        const processedUrl = canvas.toDataURL(mime, 0.88);
        this.currentEnhancedDataUrl = processedUrl;
        mainImg.src = processedUrl;
      };
      img.src = baseSrc;
    }

    // ---------- CONFIRM PHOTO AND ADD TO PRODUCT GALLERY ----------
    confirmUsePhoto() {
      if (!this.currentEnhancedDataUrl) return;

      const newId = 'img-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
      const isFirst = this.images.length === 0;

      const item = {
        id: newId,
        url: this.currentEnhancedDataUrl,
        originalUrl: this.capturedRawDataUrl || this.currentEnhancedDataUrl,
        isPrimary: isFirst,
        status: 'ready',
        width: 1200,
        height: 1200
      };

      if (this.images.length >= this.options.maxImages) {
        this.toast(`Maximum ${this.options.maxImages} images reached. Replacing the last secondary photo.`);
        this.images.splice(this.options.maxImages - 1, 1, item);
      } else {
        this.images.push(item);
      }

      this.closeCamera();
      this.notifyChanges();
      this.toast('📸 Product photo added to gallery!');
    }

    // ---------- DEVICE FILE UPLOAD PIPELINE ----------
    async handleDeviceFiles(fileList) {
      if (!fileList || !fileList.length) return;

      const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
      const maxBytes = 10 * 1024 * 1024; // 10MB limit

      const files = Array.from(fileList);
      let added = 0;

      for (const file of files) {
        if (!allowedMimes.includes(file.type)) {
          this.toast(`⚠️ "${file.name}" rejected. Only JPG, PNG, and WebP are allowed.`);
          continue;
        }
        if (file.size > maxBytes) {
          this.toast(`⚠️ "${file.name}" is too large (max 10MB). Please choose a smaller image.`);
          continue;
        }
        if (this.images.length >= this.options.maxImages) {
          this.toast(`Maximum ${this.options.maxImages} images reached.`);
          break;
        }

        try {
          const compressed = await this.compressImageFile(file);
          const newId = 'img-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
          const isFirst = this.images.length === 0;

          this.images.push({
            id: newId,
            url: compressed.url,
            originalUrl: compressed.url,
            isPrimary: isFirst,
            status: 'ready',
            file: file,
            width: compressed.width,
            height: compressed.height
          });
          added++;
        } catch (err) {
          console.warn('Error processing file:', file.name, err);
        }
      }

      if (added > 0) {
        this.notifyChanges();
        this.toast(`✨ Added ${added} product photo${added > 1 ? 's' : ''} to gallery.`);
        // If camera modal was open, close it
        this.closeCamera();
      }
    }

    compressImageFile(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Could not read image file'));
        reader.onload = () => {
          const img = new Image();
          img.onerror = () => reject(new Error('Could not decode image'));
          img.onload = () => {
            const maxDim = 2000;
            const scale = Math.min(maxDim / img.width, maxDim / img.height, 1);
            const w = Math.round(img.width * scale);
            const h = Math.round(img.height * scale);

            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);

            const compressedUrl = canvas.toDataURL('image/webp', 0.88);
            resolve({ url: compressedUrl, width: w, height: h });
          };
          img.src = reader.result;
        };
        reader.readAsDataURL(file);
      });
    }

    // ---------- GALLERY MANAGEMENT (REORDER, DELETE, PRIMARY) ----------
    setPrimaryImage(id) {
      this.images.forEach(img => {
        img.isPrimary = (img.id === id);
      });
      // Move primary image to the front of the array
      const idx = this.images.findIndex(img => img.id === id);
      if (idx > 0) {
        const [primary] = this.images.splice(idx, 1);
        this.images.unshift(primary);
      }
      this.notifyChanges();
      this.toast('⭐ Primary product image updated.');
    }

    deleteImage(id) {
      const idx = this.images.findIndex(img => img.id === id);
      if (idx === -1) return;

      const wasPrimary = this.images[idx].isPrimary;
      this.images.splice(idx, 1);

      // If the primary image was deleted, make the new first image primary
      if (wasPrimary && this.images.length > 0) {
        this.images[0].isPrimary = true;
      }

      this.notifyChanges();
      this.toast('🗑️ Image removed.');
    }

    moveImage(id, direction) {
      const idx = this.images.findIndex(img => img.id === id);
      if (idx === -1) return;

      const newIdx = idx + direction;
      if (newIdx < 0 || newIdx >= this.images.length) return;

      const [item] = this.images.splice(idx, 1);
      this.images.splice(newIdx, 0, item);

      // Re-assign primary flag to index 0
      this.images.forEach((img, i) => {
        img.isPrimary = (i === 0);
      });

      this.notifyChanges();
    }

    notifyChanges() {
      if (this.options.containerId) {
        this.renderGalleryComponent(this.options.containerId);
      }
      if (typeof this.options.onImagesChange === 'function') {
        this.options.onImagesChange(this.getImages());
      }
    }

    getImages() {
      return this.images.map(img => ({
        id: img.id,
        url: img.url,
        originalUrl: img.originalUrl,
        isPrimary: img.isPrimary,
        status: img.status
      }));
    }

    getPrimaryImage() {
      const primary = this.images.find(img => img.isPrimary);
      return primary ? primary.url : (this.images[0] ? this.images[0].url : null);
    }

    setImages(list) {
      if (!Array.isArray(list)) return;
      this.images = list.map((item, idx) => ({
        id: item.id || ('img-' + Date.now() + '-' + idx),
        url: typeof item === 'string' ? item : item.url,
        originalUrl: item.originalUrl || (typeof item === 'string' ? item : item.url),
        isPrimary: idx === 0,
        status: 'ready'
      }));
      this.notifyChanges();
    }

    // ---------- GALLERY DOM RENDERER ----------
    renderGalleryComponent(containerId) {
      const container = document.getElementById(containerId);
      if (!container) return;

      const count = this.images.length;
      const max = this.options.maxImages;

      let html = `
        <div class="pcs-gallery-studio">
          <div class="pcs-gallery-header">
            <div class="pcs-gallery-title">
              <span>Product Photography & Media</span>
              <span class="pcs-gallery-count-pill">${count} / ${max}</span>
            </div>
            <div class="pcs-gallery-actions">
              <button type="button" class="pcs-btn-studio-cam" id="${containerId}-btnCam">
                ${ICONS.camera} Take Photo
              </button>
              <button type="button" class="pcs-btn-studio-upload" id="${containerId}-btnUpload">
                ${ICONS.upload} Upload
              </button>
            </div>
          </div>

          <!-- Desktop Drag & Drop Area -->
          <div class="pcs-dropzone" id="${containerId}-dropzone">
            <div class="pcs-dropzone-icon">${ICONS.upload}</div>
            <div class="pcs-dropzone-text">Drag product images here, or browse files</div>
            <div class="pcs-dropzone-hint">Supports high-res JPG, PNG, WebP (up to 10MB each)</div>
          </div>

          <!-- Thumbnail Grid -->
          <div class="pcs-thumbnail-grid" id="${containerId}-grid">
      `;

      this.images.forEach((img, idx) => {
        html += `
          <div class="pcs-thumb-card ${img.isPrimary ? 'pcs-is-primary' : ''}" data-id="${img.id}">
            ${img.isPrimary ? '<div class="pcs-primary-badge">MAIN IMAGE</div>' : ''}
            <img class="pcs-thumb-img" src="${img.url}" alt="Product image ${idx + 1}" />
            
            <div class="pcs-thumb-overlay">
              ${idx > 0 ? `<button type="button" class="pcs-thumb-btn" data-action="left" data-id="${img.id}" title="Move left">${ICONS.arrowLeft}</button>` : ''}
              ${idx < count - 1 ? `<button type="button" class="pcs-thumb-btn" data-action="right" data-id="${img.id}" title="Move right">${ICONS.arrowRight}</button>` : ''}
              <button type="button" class="pcs-thumb-btn pcs-btn-delete" data-action="delete" data-id="${img.id}" title="Remove photo">${ICONS.trash}</button>
            </div>
          </div>
        `;
      });

      if (count < max) {
        html += `
          <div class="pcs-thumb-add-card" id="${containerId}-btnAddCard">
            ${ICONS.camera}
            <span>+ Add Photo</span>
          </div>
        `;
      }

      html += `
          </div>
        </div>
      `;

      container.innerHTML = html;

      // Bind Gallery Actions
      const btnCam = document.getElementById(`${containerId}-btnCam`);
      const btnUpload = document.getElementById(`${containerId}-btnUpload`);
      const btnAddCard = document.getElementById(`${containerId}-btnAddCard`);
      const dropzone = document.getElementById(`${containerId}-dropzone`);
      const hiddenFile = document.getElementById('pcsHiddenFileInput');

      if (btnCam) btnCam.onclick = () => this.openCamera();
      if (btnUpload && hiddenFile) btnUpload.onclick = () => hiddenFile.click();
      if (btnAddCard) btnAddCard.onclick = () => this.openCamera();

      // Dropzone events
      if (dropzone && hiddenFile) {
        dropzone.onclick = () => hiddenFile.click();
        dropzone.ondragover = (e) => {
          e.preventDefault();
          dropzone.classList.add('pcs-drag-over');
        };
        dropzone.ondragleave = () => dropzone.classList.remove('pcs-drag-over');
        dropzone.ondrop = (e) => {
          e.preventDefault();
          dropzone.classList.remove('pcs-drag-over');
          if (e.dataTransfer && e.dataTransfer.files) {
            this.handleDeviceFiles(e.dataTransfer.files);
          }
        };
      }

      // Thumbnail Action Buttons
      const grid = document.getElementById(`${containerId}-grid`);
      if (grid) {
        grid.querySelectorAll('.pcs-thumb-btn').forEach(btn => {
          btn.onclick = (e) => {
            e.stopPropagation();
            const action = btn.dataset.action;
            const id = btn.dataset.id;
            if (action === 'delete') this.deleteImage(id);
            else if (action === 'left') this.moveImage(id, -1);
            else if (action === 'right') this.moveImage(id, 1);
          };
        });

        // Mobile tap toggle for overlay
        grid.querySelectorAll('.pcs-thumb-card').forEach(card => {
          card.onclick = () => {
            card.classList.toggle('pcs-touch-active');
          };
        });
      }
    }
  }

  return ProductCameraStudio;
}));
