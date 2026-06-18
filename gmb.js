/* =============================================
   HaulPro — Google My Business Auto-Posting
   
   Uses Google Business Profile API v4.9
   OAuth handled via token stored in settings.
   
   Future enhancement: move OAuth flow to
   Netlify serverless function for security.
   ============================================= */

const GMB = {
  get accessToken() { return DS.get('gmb_access_token',''); },
  get locationName(){ const v=DS.get('gmb_location_name',''); return v.includes('/')?v:('locations/'+v); },
  get enabled()     { return !!(this.accessToken && this.locationName); },
};

// ─── AI CAPTION GENERATION ───────────────────
async function generateGMBCaption(job, customer) {
  const p        = DS.getProfile();
  const service  = job.service || 'Junk Removal';
  const city     = (job.address || '').split(',').slice(1,2).join('').trim() || 'the area';
  const price    = job.price ? `$${job.price}` : '';
  const custName = customer ? customer.firstName : '';

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: `Write a Google My Business post for a junk removal company called "${p.company}".
Job details:
- Service: ${service}
- Location: ${city}
- Items removed: ${job.notes || 'household items and furniture'}
${price ? `- Job value: ${price}` : ''}

Requirements:
- 2-3 sentences max
- Local SEO focused — mention the city naturally
- Sound human and enthusiastic, not robotic
- End with 3-5 relevant hashtags
- Do NOT use quotation marks around the whole post
- Do NOT include a call to action like "call us" — just describe the job
- Keep it under 200 characters before hashtags`
        }]
      })
    });
    const data = await resp.json();
    return data.content?.[0]?.text?.trim() || fallbackCaption(job, p.company, city);
  } catch(e) {
    console.warn('AI caption failed:', e);
    return fallbackCaption(job, p.company, city);
  }
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
async function createGMBPost(job, customer, photoDataUrl) {
  if (!GMB.enabled) {
    console.log('GMB not configured — skipping post');
    return false;
  }

  const caption = await generateGMBCaption(job, customer);
  console.log('GMB caption:', caption);

  const postBody = {
    languageCode: 'en-US',
    summary:      caption,
    callToAction: {
      actionType: 'CALL',
      url: `tel:${DS.getProfile().phone}`,
    },
    topicType: 'STANDARD',
  };

  // Add photo if available
  if (photoDataUrl && photoDataUrl.startsWith('data:image')) {
    postBody.media = [{
      mediaFormat: 'PHOTO',
      sourceUrl:   photoDataUrl, // GMB accepts base64 data URLs
    }];
  }

  try {
    // GMB API endpoint — location name formatted as locations/ID
    const locationPath = GMB.locationName;
    const resp = await fetch(
      `https://mybusiness.googleapis.com/v4/${locationPath}/localPosts`,
      {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${GMB.accessToken}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify(postBody),
      }
    );
    const data = await resp.json();
    console.log('GMB post response:', data);

    if (resp.ok && data.name) {
      DS.set('gmb_last_post_date', new Date().toISOString().slice(0,10));
      DS.set('gmb_last_post_job',  job.id);
      return true;
    } else {
      console.error('GMB post failed:', data);
      toast('⚠️ GMB post failed: ' + (data.error?.message || 'Unknown error'));
      return false;
    }
  } catch(e) {
    console.error('GMB error:', e);
    return false;
  }
}

// ─── DAILY POST LOGIC ────────────────────────
// Called when any job is marked complete.
// Only posts once per day — picks the highest value job.
async function handleDailyGMBPost(completedJobId) {
  if (!GMB.enabled) return;

  const today         = new Date().toISOString().slice(0,10);
  const lastPostDate  = DS.get('gmb_last_post_date','');

  // Already posted today
  if (lastPostDate === today) {
    console.log('GMB: already posted today, skipping');
    return;
  }

  // Find best job to post about (highest price among today's completed jobs)
  const todayJobs = DS.getJobsForDate(today).filter(j => j.status === 'done' && j.price > 0);
  if (!todayJobs.length) return;

  const bestJob  = todayJobs.sort((a,b) => (b.price||0) - (a.price||0))[0];
  const customer = DS.getCustomer(bestJob.customerId);

  // Get best photo from the job
  let photoDataUrl = null;
  try {
    const bestPhoto = await getBestPhotoForJob(bestJob.id);
    if (bestPhoto) photoDataUrl = bestPhoto.dataUrl;
  } catch(e) { console.warn('Could not get photo:', e); }

  const posted = await createGMBPost(bestJob, customer, photoDataUrl);
  if (posted) {
    toast('<i class="ti ti-brand-google" style="color:#4ade80"></i> Google My Business post published!', 4000);
    console.log('GMB: posted for job', bestJob.id);
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
  const redirectUri = 'https://junkgeniestest.netlify.app';
  const redirect    = encodeURIComponent(redirectUri);
  console.log('GMB OAuth → redirect URI:', redirectUri);
  const state = Math.random().toString(36).slice(2);
  DS.set('gmb_oauth_state', state);
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirect}&response_type=code&scope=${scopes}&access_type=offline&prompt=consent&state=${state}`;
  window.open(url, '_blank', 'width=500,height=600');
  toast('Complete Google sign-in — you will be redirected back automatically', 5000);
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
