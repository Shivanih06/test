/* =============================================
   HaulPro — Photos & Videos
   
   Uses IndexedDB for photo storage (survives
   page refresh, handles large files).
   
   Future Supabase swap:
   - uploadPhoto() calls supabase.storage.upload()
   - getPhotos() calls supabase.from('job_photos').select()
   ============================================= */

// ─── INDEXEDDB SETUP ─────────────────────────
const PhotoDB = {
  db: null,

  async init() {
    if (this.db) return this.db;
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('haulpro_photos', 1);
      req.onupgradeneeded = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('photos')) {
          const store = db.createObjectStore('photos', { keyPath: 'id' });
          store.createIndex('jobId', 'jobId', { unique: false });
        }
      };
      req.onsuccess = e => { this.db = e.target.result; resolve(this.db); };
      req.onerror   = e => reject(e.target.error);
    });
  },

  async save(photo) {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('photos', 'readwrite');
      tx.objectStore('photos').put(photo);
      tx.oncomplete = () => resolve(photo);
      tx.onerror    = e => reject(e.target.error);
    });
  },

  async getForJob(jobId) {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx    = db.transaction('photos', 'readonly');
      const index = tx.objectStore('photos').index('jobId');
      const req   = index.getAll(jobId);
      req.onsuccess = e => resolve(e.target.result || []);
      req.onerror   = e => reject(e.target.error);
    });
  },

  async delete(id) {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('photos', 'readwrite');
      tx.objectStore('photos').delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror    = e => reject(e.target.error);
    });
  },

  async getAll() {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx  = db.transaction('photos', 'readonly');
      const req = tx.objectStore('photos').getAll();
      req.onsuccess = e => resolve(e.target.result || []);
      req.onerror   = e => reject(e.target.error);
    });
  },
};

// ─── COMPRESS IMAGE ──────────────────────────
function compressImage(file, maxWidth=1200, quality=0.75) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const ratio  = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement('canvas');
      canvas.width  = img.width  * ratio;
      canvas.height = img.height * ratio;
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = url;
  });
}

// ─── CAPTURE PHOTO ───────────────────────────
async function capturePhoto(jobId, folder) {
  // Create hidden file input
  const input = document.createElement('input');
  input.type   = 'file';
  input.accept = 'image/*,video/*';
  // No "capture" attribute here on purpose — that forces straight to the camera on phones,
  // skipping the photo library entirely. Leaving it off gives the normal system picker
  // (Take Photo / Photo Library / Browse), so existing photos can be used too.
  input.style.display = 'none';
  document.body.appendChild(input);

  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;
    document.body.removeChild(input);

    toast('<i class="ti ti-loader"></i> Processing…', 4000);

    try {
      let dataUrl;
      const isVideo = file.type.startsWith('video/');

      if (isVideo) {
        // Check video size — limit to 50MB
        if (file.size > 50 * 1024 * 1024) {
          toast('⚠️ Video too large — max 50MB');
          return;
        }
        // Store video as blob URL for session
        dataUrl = URL.createObjectURL(file);
      } else {
        // Compress image
        dataUrl = await compressImage(file);
      }

      const photo = {
        id:        DS.newId('photo'),
        jobId,
        folder,    // 'before' or 'after'
        type:      isVideo ? 'video' : 'image',
        mimeType:  file.type,
        dataUrl,
        fileName:  file.name,
        takenAt:   new Date().toISOString(),
        size:      file.size,
      };

      await PhotoDB.save(photo);
      toast('<i class="ti ti-check" style="color:#4ade80"></i> Photo saved');

      // Refresh job detail photos section
      await renderJobPhotos(jobId);

    } catch(e) {
      console.error('Photo capture error:', e);
      toast('⚠️ Could not save photo — try again');
    }
  };

  input.click();
}

// ─── RENDER PHOTOS IN JOB DETAIL ─────────────
async function renderJobPhotos(jobId) {
  const container = document.getElementById('job-photos-section');
  if (!container) return;

  const photos = await PhotoDB.getForJob(jobId);
  const before  = photos.filter(p => p.folder === 'before');
  const after   = photos.filter(p => p.folder === 'after');

  container.innerHTML = `
    <div style="margin-top:12px">
      <div style="font-size:12px;font-weight:700;color:var(--hint);letter-spacing:0.5px;margin-bottom:10px">JOB PHOTOS & VIDEOS</div>

      <!-- Before folder -->
      <div style="margin-bottom:14px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <div style="font-size:13px;font-weight:700;color:var(--muted)">
            <i class="ti ti-camera" style="margin-right:4px"></i> Before (${before.length})
          </div>
          <button class="btn btn-outline btn-sm" onclick="capturePhoto('${jobId}','before')">
            <i class="ti ti-plus"></i> Add
          </button>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">
          ${before.map(p => renderPhotoThumb(p)).join('')}
          ${before.length === 0 ? `<div style="grid-column:1/-1;text-align:center;padding:20px;background:#f7f8fa;border-radius:8px;border:1.5px dashed var(--border-md)">
            <i class="ti ti-camera-off" style="color:var(--hint);font-size:24px;display:block;margin-bottom:4px"></i>
            <span style="font-size:11px;color:var(--hint)">No before photos</span>
          </div>` : ''}
        </div>
      </div>

      <!-- After folder -->
      <div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <div style="font-size:13px;font-weight:700;color:var(--muted)">
            <i class="ti ti-camera-check" style="margin-right:4px"></i> After (${after.length})
          </div>
          <button class="btn btn-outline btn-sm" onclick="capturePhoto('${jobId}','after')">
            <i class="ti ti-plus"></i> Add
          </button>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">
          ${after.map(p => renderPhotoThumb(p)).join('')}
          ${after.length === 0 ? `<div style="grid-column:1/-1;text-align:center;padding:20px;background:#f7f8fa;border-radius:8px;border:1.5px dashed var(--border-md)">
            <i class="ti ti-camera-off" style="color:var(--hint);font-size:24px;display:block;margin-bottom:4px"></i>
            <span style="font-size:11px;color:var(--hint)">No after photos</span>
          </div>` : ''}
        </div>
      </div>
    </div>`;
}

function renderPhotoThumb(photo) {
  if (photo.type === 'video') {
    return `<div style="position:relative;border-radius:8px;overflow:hidden;aspect-ratio:1;background:#000;cursor:pointer" onclick="viewPhoto('${photo.id}')">
      <video src="${photo.dataUrl}" style="width:100%;height:100%;object-fit:cover"></video>
      <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">
        <i class="ti ti-player-play" style="font-size:28px;color:white;text-shadow:0 2px 8px rgba(0,0,0,0.5)"></i>
      </div>
      <button onclick="event.stopPropagation();deletePhoto('${photo.id}','${photo.jobId}')" 
        style="position:absolute;top:4px;right:4px;background:rgba(0,0,0,0.6);border:none;border-radius:50%;width:22px;height:22px;color:white;cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center">
        <i class="ti ti-x"></i>
      </button>
    </div>`;
  }
  return `<div style="position:relative;border-radius:8px;overflow:hidden;aspect-ratio:1;cursor:pointer" onclick="viewPhoto('${photo.id}')">
    <img src="${photo.dataUrl}" style="width:100%;height:100%;object-fit:cover" loading="lazy">
    <button onclick="event.stopPropagation();deletePhoto('${photo.id}','${photo.jobId}')"
      style="position:absolute;top:4px;right:4px;background:rgba(0,0,0,0.6);border:none;border-radius:50%;width:22px;height:22px;color:white;cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center">
      <i class="ti ti-x"></i>
    </button>
  </div>`;
}

// ─── VIEW FULL PHOTO ─────────────────────────
let _allPhotosForViewer = [];
async function viewPhoto(photoId) {
  const db    = await PhotoDB.init();
  const tx    = db.transaction('photos','readonly');
  const req   = tx.objectStore('photos').get(photoId);
  req.onsuccess = e => {
    const photo = e.target.result;
    if (!photo) return;
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.95);z-index:500;display:flex;align-items:center;justify-content:center;flex-direction:column';
    overlay.innerHTML = `
      <button onclick="this.parentElement.remove()" style="position:absolute;top:16px;right:16px;background:rgba(255,255,255,0.15);border:none;border-radius:50%;width:36px;height:36px;color:white;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center">
        <i class="ti ti-x"></i>
      </button>
      <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-bottom:10px;text-transform:uppercase;letter-spacing:1px">${photo.folder} · ${new Date(photo.takenAt).toLocaleString()}</div>
      ${photo.type==='video'
        ? `<video src="${photo.dataUrl}" controls autoplay style="max-width:100%;max-height:80vh;border-radius:8px"></video>`
        : `<img src="${photo.dataUrl}" style="max-width:100%;max-height:80vh;object-fit:contain;border-radius:8px">`}`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if(e.target===overlay) overlay.remove(); });
  };
}

// ─── DELETE PHOTO ────────────────────────────
async function deletePhoto(photoId, jobId) {
  if (!confirm('Delete this photo?')) return;
  await PhotoDB.delete(photoId);
  await renderJobPhotos(jobId);
  toast('Photo deleted');
}

// ─── GET BEST PHOTO FOR GMB POST ─────────────
async function getBestPhotoForJob(jobId) {
  const photos = await PhotoDB.getForJob(jobId);
  // Prefer after photos, then before photos
  const after  = photos.filter(p => p.folder==='after'  && p.type==='image');
  const before = photos.filter(p => p.folder==='before' && p.type==='image');
  return after[0] || before[0] || null;
}

// Gets one "before" and one "after" photo for a job (each may be null if that folder
// has nothing in it) — used for the real before/after GMB post.
async function getBeforeAfterPhotosForJob(jobId) {
  const photos = await PhotoDB.getForJob(jobId);
  const images = photos.filter(p => p.type==='image');
  return {
    before: images.find(p => p.folder==='before') || null,
    after:  images.find(p => p.folder==='after')  || null,
  };
}
