// Supabase Edge Function: gmb-post
// Posts a "What's new" local post to a Google Business Profile location.
// The browser can't call the Business Profile API directly (CORS), so this runs it
// server-side. The caller passes the Google OAuth access token (business.manage scope).
//
// Deploy in Supabase → Edge Functions → new function "gmb-post" → paste this.
// Keep "Verify JWT" ON (only signed-in app users can call it).

import { serve } from "https://deno.land/std@0.192.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { accessToken, locationName, caption, photoUrl, cachedAccountId } = await req.json();

    if (!accessToken) return json({ success: false, error: "Missing Google access token. Connect/paste a token in Settings." }, 400);
    if (!locationName) return json({ success: false, error: "Missing Business Profile location." }, 400);
    if (!caption)      return json({ success: false, error: "Missing post text." }, 400);

    // 1) Resolve the account name (accounts/NNN) unless the app already cached it.
    let accountName = "";
    if (cachedAccountId) {
      accountName = String(cachedAccountId).startsWith("accounts/") ? cachedAccountId : `accounts/${cachedAccountId}`;
    } else {
      const aResp = await fetch("https://mybusinessaccountmanagement.googleapis.com/v1/accounts", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const aData = await aResp.json().catch(() => ({}));
      if (!aResp.ok) {
        return json({ success: false, status: aResp.status, error: aData?.error?.message || "Google account lookup failed. Your token may be expired." }, aResp.status);
      }
      if (!aData.accounts || !aData.accounts.length) {
        return json({ success: false, error: "No Google Business Profile accounts found for this Google login." }, 400);
      }
      accountName = aData.accounts[0].name; // "accounts/NNN"
    }

    // 2) Build the v4 localPosts endpoint. Location comes in as "locations/NNN" (or just the number).
    const loc = String(locationName).startsWith("locations/") ? locationName : `locations/${locationName}`;
    const url = `https://mybusiness.googleapis.com/v4/${accountName}/${loc}/localPosts`;

    const body: Record<string, unknown> = {
      languageCode: "en-US",
      summary: caption,
      topicType: "STANDARD",
    };
    // Google requires a PUBLIC https image URL — base64/data URLs are rejected, so only attach a real URL.
    if (photoUrl && /^https:\/\//i.test(String(photoUrl))) {
      body.media = [{ mediaFormat: "PHOTO", sourceUrl: photoUrl }];
    }

    const pResp = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const pData = await pResp.json().catch(() => ({}));

    if (!pResp.ok) {
      return json({ success: false, status: pResp.status, error: pData?.error?.message || "Post failed", details: pData }, pResp.status);
    }

    return json({ success: true, accountId: accountName, post: pData });
  } catch (e) {
    return json({ success: false, error: String((e as Error)?.message || e) }, 500);
  }
});
