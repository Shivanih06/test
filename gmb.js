/* =============================================
   HaulPro — Google My Business Auto-Posting
   
   Uses Google Business Profile API v4.9
   OAuth handled via token stored in settings.
   
   Future enhancement: move OAuth flow to
   Netlify serverless function for security.
   ============================================= */

const GMB = {
  // gmb_* keys sync org-wide via collectBusinessSettings()/applyBusinessSettings() (see
  // app.js) — NOT via the profile object — so authorizing on one device makes GMB
  // posting work on every device the org logs into, including a tech's phone.
  get accessToken() { return DS.get('gmb_access_token',''); },
  get locationName(){ const v=DS.get('gmb_location_name',''); return v.includes('/')?v:('locations/'+v); },
  get enabled()     { return !!(this.accessToken && this.locationName); },
};

// ─── AI CAPTION GENERATION ───────────────────
async function generateGMBCaption(job, customer) {
  const p    = DS.getProfile();
  const city = (job.address || '').split(',').slice(1,2).join('').trim() || 'the area';
  // A dedicated AI-caption backend isn't built yet (this used to call a Netlify function
  // that doesn't exist on GitHub Pages) — the rotating templates below already read fine,
  // so this just uses those directly instead of a call that was guaranteed to fail.
  return fallbackCaption(job, p.company, city);
}

function fallbackCaption(job, company, city) {
  const templates = [
    `Another successful ${job.service} completed in ${city}! ${company} is your local junk removal expert. #JunkRemoval #${city.replace(/\s/g,'')} #CleanHome`,
    `Cleared out another property in ${city} today! ${company} making spaces clean and clutter-free. #JunkGenius #JunkRemoval #${city.replace(/\s/g,'')}`,
    `Fresh start for a ${city} home — ${job.service} done right by ${company}! #JunkRemoval #LocalBusiness #${city.replace(/\s/g,'')}`,
  ];
  return templates[Math.floor(Math.random() * templates.length)];
}

// ─── CREATE GMB POST ─────────────────────────
async function createGMBPost(job, customer, photoUrl, captionOverride) {
  if (!GMB.enabled) {
    console.log('GMB not configured — skipping post');
    return false;
  }

  const caption = captionOverride || await generateGMBCaption(job, customer);
  console.log('GMB caption:', caption);

  const doPostRequest = async () => {
    const cachedAccountId = DS.get('gmb_account_id', '');
    return fetch(`${SUPABASE_URL}/functions/v1/gmb-post`, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${(window.Auth && Auth.token) ? Auth.token : ''}`,
        'apikey':        SUPABASE_KEY,
        'Content-Type':  'application/json',
      },
      body:    JSON.stringify({
        accessToken:     GMB.accessToken, // read fresh each call — reflects any just-refreshed token
        locationName:    GMB.locationName,
        caption,
        photoUrl:        (photoUrl && /^https:\/\//i.test(photoUrl)) ? photoUrl : null,
        cachedAccountId: cachedAccountId || null,
      }),
    });
  };

  try {
    let resp = await doPostRequest();
    let data = await resp.json();
    console.log('GMB post response:', data);

    // Access token expired mid-session (they last ~1hr) — silently renew and retry once
    // before giving up, instead of making the person manually re-authorize every time.
    if (resp.status === 401 && DS.get('gmb_refresh_token','')) {
      console.log('GMB post got 401 — attempting silent token refresh + retry');
      const refreshed = await refreshGMBToken();
      if (refreshed) {
        resp = await doPostRequest();
        data = await resp.json();
        console.log('GMB post response (after refresh):', data);
      }
    }

    if (data.success) {
      if (data.accountId) { DS.set('gmb_account_id', data.accountId); if (typeof pushBusinessToCloud==='function') { try{ pushBusinessToCloud(); }catch(e){} } }
      DS.set('gmb_last_post_date', new Date().toISOString().slice(0,10));
      DS.set('gmb_last_post_job',  job.id);
      return true;
    } else if (resp.status === 429) {
      toast('⚠️ Google rate limit — wait 1 minute and try again');
      return false;
    } else {
      console.error('GMB post failed:', data);
      toast('⚠️ GMB post failed: ' + (data.error || 'Unknown error'));
      return false;
    }
  } catch(e) {
    console.error('GMB error:', e);
    toast('⚠️ GMB error: ' + e.message);
    return false;
  }
}

// ─── BEFORE/AFTER COMPOSITE IMAGE ────────────
// Google only allows ONE photo per post (no carousels) — so a real before/after post
// means combining both into a single side-by-side image rather than picking just one.
async function buildBeforeAfterComposite(beforePhoto, afterPhoto) {
  const W = 1200, H = 900;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, W, H);

  const loadImg = src => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
  const drawCover = (img, x, y, w, h) => {
    const ir = img.width / img.height, tr = w / h;
    let sx=0, sy=0, sw=img.width, sh=img.height;
    if (ir > tr) { sw = img.height * tr; sx = (img.width - sw) / 2; }
    else { sh = img.width / tr; sy = (img.height - sh) / 2; }
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  };
  const label = (text, x, y) => {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x, y, 118, 36);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(text, x+14, y+25);
  };

  if (beforePhoto && afterPhoto) {
    const [bImg, aImg] = await Promise.all([loadImg(beforePhoto.dataUrl), loadImg(afterPhoto.dataUrl)]);
    drawCover(bImg, 0, 0, W/2 - 3, H);
    drawCover(aImg, W/2 + 3, 0, W/2 - 3, H);
    label('BEFORE', 16, 16);
    label('AFTER', W/2 + 19, 16);
  } else {
    const only = afterPhoto || beforePhoto;
    const img = await loadImg(only.dataUrl);
    drawCover(img, 0, 0, W, H);
  }
  return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.88));
}

// Uploads the composite to a public Supabase Storage bucket and returns its real https://
// URL — Google's post API requires an actual public image address, not base64.
// ONE-TIME SETUP (not yet done): create a PUBLIC bucket named "gmb-photos" in
// Supabase → Storage.
async function uploadGMBPhoto(blob) {
  const filename = `post_${Date.now()}.jpg`;
  try {
    const resp = await fetch(`${SUPABASE_URL}/storage/v1/object/gmb-photos/${filename}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${(window.Auth && Auth.token) ? Auth.token : ''}`,
        'apikey': SUPABASE_KEY,
        'Content-Type': 'image/jpeg',
      },
      body: blob,
    });
    if (!resp.ok) { console.warn('GMB photo upload failed:', await resp.text().catch(()=>'')); return null; }
    return `${SUPABASE_URL}/storage/v1/object/public/gmb-photos/${filename}`;
  } catch(e) { console.warn('GMB photo upload error:', e); return null; }
}

function stripDataUrlPrefix(dataUrl) {
  const idx = (dataUrl||'').indexOf(',');
  return idx >= 0 ? dataUrl.slice(idx+1) : dataUrl;
}

// Real caption from the real photos — Claude actually looks at the before/after images
// and describes the transformation, rather than picking from a rotating template.
async function generateVisionCaption(beforePhoto, afterPhoto, job) {
  const p = DS.getProfile();
  const city = (job.address || '').split(',').slice(1,2).join('').trim() || 'the area';
  try {
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/gmb-vision-caption`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${(window.Auth && Auth.token) ? Auth.token : ''}`,
        'apikey': SUPABASE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        beforeBase64: beforePhoto ? stripDataUrlPrefix(beforePhoto.dataUrl) : null,
        afterBase64:  afterPhoto  ? stripDataUrlPrefix(afterPhoto.dataUrl)  : null,
        service: job.service, city, company: p.company,
      }),
    });
    const data = await resp.json();
    if (data.caption) return data.caption;
    console.warn('Vision caption failed:', data.error);
  } catch(e) { console.warn('Vision caption error:', e); }
  return null; // caller falls back to the template generator
}

// ─── TOKEN AUTO-RENEWAL ──────────────────────
// Silently gets a fresh access token via the saved refresh token — no consent screen,
// no manual re-Authorize. Returns true if it worked (new token already saved to DS).
async function refreshGMBToken() {
  const refreshToken = DS.get('gmb_refresh_token', '');
  if (!refreshToken) return false;
  try {
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/gmb-oauth-exchange`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${(window.Auth && Auth.token) ? Auth.token : ''}`,
        'apikey': SUPABASE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });
    const data = await resp.json();
    if (data.access_token) {
      DS.set('gmb_access_token', data.access_token);
      console.log('GMB token silently renewed');
      if (typeof pushBusinessToCloud==='function') { try{ pushBusinessToCloud(); }catch(e){} } // other devices pick this up too, instead of each needing their own refresh
      return true;
    }
    console.warn('GMB token refresh failed:', data.error);
  } catch(e) { console.warn('GMB token refresh error:', e); }
  return false;
}

// Called when a job is marked complete. Posts about THAT job specifically (not a
// once-a-day "pick the best one") — skips only if it's already been posted about, or
// has no price set (a $0 job usually means a placeholder/incomplete price, not a real
// finished job worth posting about).
async function handleJobCompletedGMBPost(completedJobId) {
  console.log('GMB: handleJobCompletedGMBPost called for job', completedJobId);
  if (!GMB.enabled) { console.log('GMB: not enabled (missing access token or location ID) — skipping post', {hasToken: !!GMB.accessToken, hasLocation: !!GMB.locationName}); return; }

  const postedIds = DS.get('gmb_posted_job_ids', []);
  if (postedIds.includes(completedJobId)) {
    console.log('GMB: already posted about this job, skipping');
    return;
  }

  const job = DS.getJob ? DS.getJob(completedJobId) : DS.getJobs().find(j => j.id === completedJobId);
  if (!job) { console.log('GMB: job not found, skipping'); return; }
  if (!job.price || job.price <= 0) {
    console.log('GMB: job has no price set, skipping post (set a price on it to have it post)');
    return;
  }

  const customer = DS.getCustomer(job.customerId);

  // Build the real before/after post: composite the actual photos, upload the composite
  // somewhere Google can actually see it, and have Claude write a caption based on what's
  // genuinely in them. Falls back gracefully at each step if a photo/upload/caption isn't
  // available, rather than failing the whole post.
  let photoUrl = null;
  let caption  = null;
  try {
    const { before, after } = await getBeforeAfterPhotosForJob(job.id);
    if (before || after) {
      const composite = await buildBeforeAfterComposite(before, after);
      photoUrl = await uploadGMBPhoto(composite);
      caption  = await generateVisionCaption(before, after, job); // real caption from the real photos
    }
  } catch(e) { console.warn('Before/after post build failed, falling back to text-only:', e); }

  const posted = await createGMBPost(job, customer, photoUrl, caption);
  if (posted) {
    DS.set('gmb_posted_job_ids', [...postedIds, job.id].slice(-500)); // cap so this never grows unbounded
    toast('<i class="ti ti-brand-google" style="color:#4ade80"></i> Google My Business post published!', 4000);
    console.log('GMB: posted for job', job.id);
  }
}

// ─── GMB OAUTH SETUP ─────────────────────────
// Opens Google OAuth flow — user approves, pastes token back
function startGMBAuth() {
  const clientId = DS.get('gmb_client_id','');
  if (!clientId) {
    toast('⚠️ Enter your Google Client ID in Settings first');
    return;
  }
  const scopes = encodeURIComponent('https://www.googleapis.com/auth/business.manage');
  // Authorization code flow (not the old implicit "response_type=token" flow, which Google
  // appears to hand back a token that this specific API rejects — a real, working token via
  // the OAuth Playground's code-exchange flow confirmed this). Google redirects back here
  // with ?code=..., which handleGMBOAuth() exchanges server-side (gmb-oauth-exchange edge
  // function, since the exchange needs the Client Secret, which never touches the browser).
  // access_type=offline + prompt=consent also gets us a refresh_token, so re-authorizing by
  // hand every ~hour won't be necessary once this is wired up. Register this exact
  // redirect URL in your Google OAuth client.
  const redirectUri = location.origin + location.pathname.replace(/[^/]*$/, '');
  const redirect    = encodeURIComponent(redirectUri);
  console.log('GMB OAuth → redirect URI:', redirectUri);
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirect}&response_type=code&access_type=offline&scope=${scopes}&prompt=consent`;
  // Redirect in same window so token lands back on our page
  window.location.href = url;
}

// ─── FETCH GMB LOCATIONS ─────────────────────
async function fetchGMBLocations() {
  const token = GMB.accessToken;
  if (!token) { toast('⚠️ Add your access token first'); return; }
  try {
    const resp = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await resp.json();
    if (data.accounts?.length) {
      const accountName = data.accounts[0].name;
      const locResp = await fetch(`https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=name,title`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const locData = await locResp.json();
      if (locData.locations?.length) {
        const locs = locData.locations;
        document.getElementById('gmb-locations').innerHTML = `
          <label class="form-label">Select Your Business Location</label>
          <select class="form-input" id="gmb-loc-select">
            ${locs.map(l => `<option value="${l.name}">${l.title}</option>`).join('')}
          </select>
          <button class="btn btn-primary btn-full" style="margin-top:8px" onclick="selectGMBLocation()">
            <i class="ti ti-check"></i> Use This Location
          </button>`;
      }
    }
  } catch(e) {
    toast('⚠️ Could not fetch locations — check token');
    console.error(e);
  }
}

function selectGMBLocation() {
  const sel = document.getElementById('gmb-loc-select');
  if (!sel) return;
  DS.set('gmb_location_name', sel.value);
  toast('<i class="ti ti-check" style="color:#4ade80"></i> GMB location saved!');
}

// Test GMB post — creates a real post using current settings
async function testGMBPost() {
  const token    = GMB.accessToken;
  const location = GMB.locationName;
  if (!token)    { toast('⚠️ Add your access token in Settings first'); return; }
  if (!location) { toast('⚠️ Add your GMB Location ID in Settings first'); return; }

  toast('<i class="ti ti-loader"></i> Generating test post…', 6000);

  // Create a sample job for testing
  const testJob = {
    id:       'test',
    service:  'Full Truck Load',
    address:  'Lakeland, FL',
    notes:    'Furniture, appliances, and misc household items',
    price:    299,
    date:     new Date().toISOString().slice(0,10),
  };

  const caption = await generateGMBCaption(testJob, null);
  console.log('Test GMB caption:', caption);

  const posted = await createGMBPost(testJob, null, null);
  if (posted) {
    toast('<i class="ti ti-check" style="color:#4ade80"></i> Test post published to GMB!', 5000);
  }
}
