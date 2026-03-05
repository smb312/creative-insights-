import { decrypt } from "./encryption";

const META_API_BASE = "https://graph.facebook.com/v21.0";
const META_OAUTH_BASE = "https://www.facebook.com/v21.0/dialog/oauth";
const META_TOKEN_URL = "https://graph.facebook.com/v21.0/oauth/access_token";

export interface MetaAdAccount {
  id: string;
  name: string;
  account_id: string;
  account_status: number;
  currency: string;
}

export interface MetaCampaign {
  id: string;
  name: string;
  status: string;
  objective: string;
}

export interface MetaAdSet {
  id: string;
  name: string;
  status: string;
  campaign_id: string;
}

export interface MetaAd {
  id: string;
  name: string;
  status: string;
  adset_id: string;
  creative: { id: string };
}

export interface MetaCreative {
  id: string;
  name: string;
  title: string;
  body: string;
  call_to_action_type: string;
  image_url: string;
  video_id: string;
  thumbnail_url: string;
  object_story_spec: {
    link_data?: {
      link: string;
      image_hash: string;
      call_to_action: { type: string };
    };
    video_data?: {
      video_id: string;
      image_url: string;
      call_to_action: { type: string };
    };
  };
}

export interface MetaInsight {
  date_start: string;
  date_stop: string;
  spend: string;
  impressions: string;
  clicks: string;
  ctr: string;
  cpm: string;
  cost_per_action_type?: Array<{ action_type: string; value: string }>;
  actions?: Array<{ action_type: string; value: string }>;
  reach: string;
  frequency: string;
  purchase_roas?: Array<{ action_type: string; value: string }>;
}

export function getMetaOAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID || "",
    redirect_uri: redirectUri,
    state,
    scope: "ads_read",
    response_type: "code",
  });

  return `${META_OAUTH_BASE}?${params.toString()}`;
}

export async function exchangeCodeForToken(
  code: string,
  redirectUri: string
): Promise<{ access_token: string; expires_in: number }> {
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID || "",
    client_secret: process.env.META_APP_SECRET || "",
    redirect_uri: redirectUri,
    code,
  });

  const response = await fetch(`${META_TOKEN_URL}?${params.toString()}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `Meta token exchange failed: ${error.error?.message || "Unknown error"}`
    );
  }

  return response.json();
}

export async function getLongLivedToken(
  shortLivedToken: string
): Promise<{ access_token: string; expires_in: number }> {
  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: process.env.META_APP_ID || "",
    client_secret: process.env.META_APP_SECRET || "",
    fb_exchange_token: shortLivedToken,
  });

  const response = await fetch(`${META_TOKEN_URL}?${params.toString()}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `Long-lived token exchange failed: ${error.error?.message || "Unknown error"}`
    );
  }

  return response.json();
}

async function metaFetch(
  endpoint: string,
  accessToken: string,
  params: Record<string, string> = {}
) {
  const searchParams = new URLSearchParams({
    access_token: accessToken,
    ...params,
  });

  const url = `${META_API_BASE}${endpoint}?${searchParams.toString()}`;
  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.json();
    if (error.error?.code === 4 || error.error?.code === 17) {
      // Rate limit hit — throw specific error for backoff handling
      throw new RateLimitError(
        `Meta API rate limit reached: ${error.error.message}`
      );
    }
    throw new Error(
      `Meta API error: ${error.error?.message || response.statusText}`
    );
  }

  return response.json();
}

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RateLimitError";
  }
}

export async function fetchWithRetry(
  fn: () => Promise<unknown>,
  maxRetries = 3
): Promise<unknown> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof RateLimitError && attempt < maxRetries) {
        const backoff = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, backoff));
        continue;
      }
      throw error;
    }
  }
  throw new Error("Max retries exceeded");
}

export async function fetchAdAccounts(
  accessToken: string
): Promise<MetaAdAccount[]> {
  const result = await metaFetch("/me/adaccounts", accessToken, {
    fields: "id,name,account_id,account_status,currency",
    limit: "100",
  });
  return (result as { data: MetaAdAccount[] }).data;
}

export async function fetchCampaigns(
  adAccountId: string,
  accessToken: string
): Promise<MetaCampaign[]> {
  const result = await metaFetch(
    `/${adAccountId}/campaigns`,
    accessToken,
    {
      fields: "id,name,status,objective",
      limit: "500",
    }
  );
  return (result as { data: MetaCampaign[] }).data;
}

export async function fetchAdSets(
  campaignId: string,
  accessToken: string
): Promise<MetaAdSet[]> {
  const result = await metaFetch(`/${campaignId}/adsets`, accessToken, {
    fields: "id,name,status",
    limit: "500",
  });
  return (result as { data: MetaAdSet[] }).data;
}

export async function fetchAds(
  adSetId: string,
  accessToken: string
): Promise<MetaAd[]> {
  const result = await metaFetch(`/${adSetId}/ads`, accessToken, {
    fields: "id,name,status,creative{id}",
    limit: "500",
  });
  return (result as { data: MetaAd[] }).data;
}

export async function fetchCreative(
  creativeId: string,
  accessToken: string
): Promise<MetaCreative> {
  return (await metaFetch(`/${creativeId}`, accessToken, {
    fields:
      "id,name,title,body,call_to_action_type,image_url,video_id,thumbnail_url,object_story_spec",
  })) as MetaCreative;
}

export async function fetchAdInsights(
  adId: string,
  accessToken: string,
  dateStart: string,
  dateEnd: string
): Promise<MetaInsight[]> {
  const result = await metaFetch(`/${adId}/insights`, accessToken, {
    fields:
      "spend,impressions,clicks,ctr,cpm,cost_per_action_type,actions,reach,frequency,purchase_roas",
    time_range: JSON.stringify({
      since: dateStart,
      until: dateEnd,
    }),
    time_increment: "1",
    limit: "500",
  });
  return (result as { data: MetaInsight[] }).data || [];
}

export async function fetchAdInsightsWithBreakdowns(
  adId: string,
  accessToken: string,
  dateStart: string,
  dateEnd: string,
  breakdown: "age" | "gender" | "publisher_platform" | "platform_position"
): Promise<(MetaInsight & Record<string, string>)[]> {
  const result = await metaFetch(`/${adId}/insights`, accessToken, {
    fields:
      "spend,impressions,clicks,ctr,cpm,cost_per_action_type,actions,reach,frequency,purchase_roas",
    time_range: JSON.stringify({
      since: dateStart,
      until: dateEnd,
    }),
    breakdowns: breakdown,
    time_increment: "1",
    limit: "500",
  });
  return (result as { data: (MetaInsight & Record<string, string>)[] }).data || [];
}

export function decryptAccessToken(encryptedToken: string): string {
  return decrypt(encryptedToken);
}
