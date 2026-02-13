import { prisma } from "@/lib/prisma";

// ── Helpers ──────────────────────────────────────────────

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randInt(min: number, max: number): number {
  return Math.round(rand(min, max));
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function jitter(base: number, pct: number): number {
  return base * (1 + (Math.random() - 0.5) * 2 * pct);
}

// ── Ad Definitions ───────────────────────────────────────

interface AdDef {
  adName: string;
  campaignName: string;
  adSetName: string;
  creativeType: "VIDEO" | "IMAGE" | "CAROUSEL";
  primaryText: string;
  headline: string;
  callToAction: string;
  isPartnershipAd: boolean;
  creatorName?: string;
  tier: "great" | "good" | "mediocre" | "poor";
  fatigueSignal?: boolean;
  // baseline daily spend
  dailySpend: number;
  // baseline ROAS
  baseRoas: number;
  // baseline CTR
  baseCtr: number;
}

const CAMPAIGN_NAMES = [
  "Prospecting - TOF Broad",
  "Prospecting - TOF Lookalike",
  "Retargeting - MOF Engaged",
  "Retargeting - BOF Cart Abandon",
  "Partnership Whitelisting",
  "Scaling Winners - TOF",
  "Dynamic Product - BOF",
  "Seasonal Push - Valentine's",
];

const AD_SET_NAMES_TOF = [
  "Broad 18-45 Female US",
  "LAL 1% Purchasers",
  "LAL 2% ATC Last 90d",
  "Interest - Skincare & Beauty",
  "Interest - Self Care Routine",
  "Broad 25-54 All Genders US",
];

const AD_SET_NAMES_MOF = [
  "Engaged Visitors 7d",
  "Video Viewers 50%+ 14d",
  "IG Engagers 30d",
];

const AD_SET_NAMES_BOF = [
  "ATC Abandoners 7d",
  "Checkout Abandoners 3d",
  "Past Purchasers 90-180d",
];

const CTAS = [
  "SHOP_NOW",
  "LEARN_MORE",
  "ORDER_NOW",
  "GET_OFFER",
  "SHOP_NOW",
  "SHOP_NOW",
];

const CREATOR_NAMES = [
  "Alyssa Chen",
  "Jordan Rivera",
  "Mika Patel",
  "Bella Thompson",
  "Naomi Sato",
  "Tess Harrington",
  "Priya Mehta",
  "Chloe Beaumont",
  "Sienna Morales",
  "Zara Kim",
];

// Primary text and headline combos for brand ads
const BRAND_AD_COPY: {
  primaryText: string;
  headline: string;
  type: "VIDEO" | "IMAGE" | "CAROUSEL";
}[] = [
  {
    primaryText:
      "Your skin barrier is working overtime. Our Ceramide Recovery Serum locks in moisture for 72 hours — no sticky residue, just calm, bouncy skin. Dermatologist-tested. 30-day money-back guarantee.",
    headline: "Repair Your Skin Barrier Overnight",
    type: "VIDEO",
  },
  {
    primaryText:
      "We spent 14 months formulating the perfect vitamin C serum. 15% L-ascorbic acid, ferulic acid, and vitamin E in an airless pump that stays potent for 6 months. Your dark spots don't stand a chance.",
    headline: "Clinical-Grade Vitamin C for Real Results",
    type: "IMAGE",
  },
  {
    primaryText:
      "Tired of 10-step routines? Our 3-Piece Essentials Kit gives you everything your skin needs — cleanser, serum, moisturizer. Simplified skincare that actually works. Free shipping over $50.",
    headline: "The Only 3 Products You Need",
    type: "CAROUSEL",
  },
  {
    primaryText:
      "Meet your new PM routine. Our Retinol Night Cream uses encapsulated retinol so you get all the benefits with zero irritation. Wake up glowing. Over 4,200 five-star reviews.",
    headline: "Retinol Without the Redness",
    type: "VIDEO",
  },
  {
    primaryText:
      "POV: You finally found a sunscreen that doesn't leave a white cast. SPF 50, lightweight, sits beautifully under makeup. Available in 3 tints for every skin tone.",
    headline: "SPF That Actually Disappears",
    type: "VIDEO",
  },
  {
    primaryText:
      "Our best-selling Hyaluronic Acid Serum is back in stock — and it's selling fast. 3 molecular weights for deep hydration that lasts. No parabens. No fragrance. Just results.",
    headline: "Back in Stock: HA Serum",
    type: "IMAGE",
  },
  {
    primaryText:
      "Your Valentine's Day gift guide is here. Save 25% on our curated skincare sets — each one wrapped and ready to gift. Because everyone deserves glowing skin.",
    headline: "25% Off Gift Sets — Limited Time",
    type: "CAROUSEL",
  },
  {
    primaryText:
      "Stop guessing. Start glowing. Take our 60-second skin quiz and get a personalized routine built by dermatologists. Over 500,000 routines created and counting.",
    headline: "Your Custom Routine Awaits",
    type: "IMAGE",
  },
  {
    primaryText:
      "The secret ingredient? Niacinamide. Our Pore Refining Toner minimizes pores, controls oil, and preps your skin for maximum serum absorption. Use morning and night.",
    headline: "Shrink Pores in 2 Weeks",
    type: "VIDEO",
  },
  {
    primaryText:
      "New drop alert: Our Peptide Eye Cream is finally here. Targets fine lines, dark circles, and puffiness with 5 bio-active peptides. The eye area ages first — protect it now.",
    headline: "New: Peptide Eye Cream",
    type: "IMAGE",
  },
  {
    primaryText:
      "Sensitive skin? We made this for you. Our Gentle Gel Cleanser uses oat extract and centella to cleanse without stripping. pH-balanced at 5.5. Even eczema-prone skin loves it.",
    headline: "Cleansing That Calms",
    type: "IMAGE",
  },
  {
    primaryText:
      "Customers are obsessed: 'I've tried everything and this is the ONLY moisturizer that doesn't break me out.' Our Oil-Free Gel Cream — lightweight hydration for acne-prone skin.",
    headline: "The Moisturizer That Won't Break You Out",
    type: "VIDEO",
  },
  {
    primaryText:
      "Why do 50,000+ women trust us with their skincare? Because we publish every ingredient, every clinical trial, and every review — good or bad. Radical transparency in beauty.",
    headline: "Skincare You Can Actually Trust",
    type: "IMAGE",
  },
  {
    primaryText:
      "Before & after: 8 weeks with our Dark Spot Corrector. Tranexamic acid + kojic acid fade hyperpigmentation without irritation. See the results for yourself.",
    headline: "Fade Dark Spots in 8 Weeks",
    type: "CAROUSEL",
  },
  {
    primaryText:
      "Bundle & save: Get our complete AM + PM routine for $89 (valued at $135). Cleanser, vitamin C, SPF, retinol, and moisturizer. Everything your skin needs, nothing it doesn't.",
    headline: "Complete Routine — Save $46",
    type: "CAROUSEL",
  },
  {
    primaryText:
      "Winter skin SOS: When the heater is on, your moisture barrier pays the price. Our Overnight Repair Mask floods your skin with ceramides and squalane while you sleep.",
    headline: "Wake Up to Hydrated Skin",
    type: "VIDEO",
  },
  {
    primaryText:
      "We asked a panel of 200 women to try our new AHA Exfoliant for 4 weeks. 94% saw smoother texture. 87% noticed brighter skin tone. Zero reported irritation. Numbers don't lie.",
    headline: "94% Saw Smoother Skin",
    type: "IMAGE",
  },
  {
    primaryText:
      "Your body deserves the same care as your face. Introducing our Body Renewal Lotion — 10% urea + shea butter for silky, bump-free skin from neck to toe.",
    headline: "Upgrade Your Body Care",
    type: "VIDEO",
  },
  {
    primaryText:
      "Just launched: The Mini Discovery Set. Try 5 of our best-sellers in travel sizes for just $29. Perfect for finding your holy grails — or gifting to a skincare newbie.",
    headline: "Try Before You Commit — $29",
    type: "CAROUSEL",
  },
  {
    primaryText:
      "Real talk: Most lip balms are just wax. Our Peptide Lip Treatment actually repairs and plumps with hyaluronic acid microspheres. Apply before bed, wake up with pillowy lips.",
    headline: "Lips That Feel Brand New",
    type: "IMAGE",
  },
  {
    primaryText:
      "Our founder struggled with hormonal acne for a decade. She built this brand because nothing else worked. The Blemish Control Serum is her personal formula — and it's changing lives.",
    headline: "Built by Someone Who Gets It",
    type: "VIDEO",
  },
  {
    primaryText:
      "Free express shipping this weekend only. Stock up on your favorites or try something new. No code needed — just add to cart and go. Your skin will thank you Monday morning.",
    headline: "Free Express Shipping — This Weekend",
    type: "IMAGE",
  },
  {
    primaryText:
      "You asked, we delivered: Our Vitamin C serum now comes in a 60mL size. Same powerhouse formula, double the glow. Subscribe and save an extra 15% every month.",
    headline: "Double the Glow — New 60mL Size",
    type: "IMAGE",
  },
  {
    primaryText:
      "Swipe to see the full routine — morning and night. Each product is designed to layer perfectly with the next. No pilling. No irritation. Just beautiful, healthy skin.",
    headline: "AM to PM: The Perfect Routine",
    type: "CAROUSEL",
  },
  {
    primaryText:
      "Not all retinol is created equal. Ours is encapsulated in a slow-release system that delivers steady benefits over 8 hours. That means real results without the peeling and redness.",
    headline: "Smart Retinol Technology",
    type: "VIDEO",
  },
  {
    primaryText:
      "Our customers have spoken: The Hydra-Glow Moisturizer is the #1 rated moisturizer on our site for 3 years running. Lightweight. Glass-skin finish. Works on every skin type.",
    headline: "#1 Rated 3 Years Running",
    type: "IMAGE",
  },
  {
    primaryText:
      "What's in your toner? If the answer is alcohol — it's time for an upgrade. Our Probiotic Toner balances your microbiome and preps skin for maximum absorption. Clean beauty, real science.",
    headline: "Ditch the Alcohol Toner",
    type: "IMAGE",
  },
  {
    primaryText:
      "The data is in: customers who use our 3-step system see 2x the improvement vs. single products. It's not magic — it's formulation synergy. Start your system today.",
    headline: "2x Better Results With Our System",
    type: "CAROUSEL",
  },
  {
    primaryText:
      "Acne scars fading in real time. Our newest before & after series shows what 12 weeks of consistent use can do. Featuring the Brightening Serum + Dark Spot Corrector combo.",
    headline: "Real Results, Real People",
    type: "VIDEO",
  },
  {
    primaryText:
      "Don't just moisturize — protect. Our day cream combines SPF 40 with antioxidant defense so your skin stays shielded from UV, pollution, and blue light. One product, total protection.",
    headline: "Moisturizer + SPF in One Step",
    type: "IMAGE",
  },
  {
    primaryText:
      "Subscribe today and never run out of your favorites. Get 15% off every delivery + free shipping + early access to new launches. Skincare on autopilot.",
    headline: "Subscribe & Save 15% Every Time",
    type: "IMAGE",
  },
  {
    primaryText:
      "Think clean beauty can't be effective? Our clinical trials say otherwise. Every product is EWG verified, cruelty-free, and outperforms leading department store brands in independent testing.",
    headline: "Clean Beauty That Outperforms",
    type: "VIDEO",
  },
  {
    primaryText:
      "Breakout after breakout? Your cleanser might be the problem. Our pH-balanced Micellar Gel removes makeup, sunscreen, and grime without disrupting your acid mantle. Reset your skin in one wash.",
    headline: "The Cleanser Your Skin Is Begging For",
    type: "VIDEO",
  },
  {
    primaryText:
      "We're giving away a year's supply of skincare to one lucky customer. Enter now: follow us, tag a friend, and share your glow-up story. Winner announced Valentine's Day.",
    headline: "Win a Year of Free Skincare",
    type: "IMAGE",
  },
  {
    primaryText:
      "Pregnancy-safe skincare is hard to find. Our Mama Glow collection is OB/GYN approved — no retinol, no salicylic acid, no compromises. Because glowing shouldn't stop at the bump.",
    headline: "Safe Skincare for Expecting Mamas",
    type: "CAROUSEL",
  },
];

// Creator/partnership ad copy
const CREATOR_AD_COPY: {
  primaryText: string;
  headline: string;
  type: "VIDEO" | "IMAGE" | "CAROUSEL";
}[] = [
  {
    primaryText:
      "I've been using the Ceramide Recovery Serum for 3 months now and my eczema patches are GONE. I'm not exaggerating — this is the only product that's ever worked for me. Link in bio to shop.",
    headline: "Finally — Something That Works",
    type: "VIDEO",
  },
  {
    primaryText:
      "Okay so I was skeptical about another vitamin C serum but this one hits different. No oxidation after 2 months, my skin is visibly brighter, and it layers perfectly under my SPF. 10/10.",
    headline: "The Vitamin C That Actually Lasts",
    type: "VIDEO",
  },
  {
    primaryText:
      "Get ready with me using my entire morning routine. Cleanser, vitamin C, moisturizer, SPF — all from the same brand and they actually work together. My skin has never been this good.",
    headline: "GRWM: My Morning Skincare",
    type: "VIDEO",
  },
  {
    primaryText:
      "POV: Your dermatologist best friend recommends a brand. I've been recommending these products to my patients for a year. Clean, effective, and the price point makes sense. Use my code PRIYA20 for 20% off.",
    headline: "Derm-Approved Skincare",
    type: "VIDEO",
  },
  {
    primaryText:
      "This retinol night cream changed my skin in 6 weeks — and I have the photos to prove it. Fine lines around my eyes? Smoothed. Texture on my cheeks? Gone. This is the real deal.",
    headline: "6-Week Retinol Transformation",
    type: "IMAGE",
  },
  {
    primaryText:
      "I tested every SPF under $40 and this one won by a mile. Zero white cast on my brown skin, no pilling under makeup, and it actually makes my skin look BETTER. Sorry to my old sunscreen.",
    headline: "Best SPF Under $40 — Not Close",
    type: "VIDEO",
  },
  {
    primaryText:
      "Unboxing the Valentine's Day gift set and honestly I'm keeping it for myself. The packaging is gorgeous, every product is full-size, and the total value is insane. This sells out every year so don't wait.",
    headline: "Valentine's Unboxing (Keeping This One)",
    type: "VIDEO",
  },
  {
    primaryText:
      "Real review after 90 days: I swapped my entire routine for this brand. My acne scars have faded, my skin barrier feels stronger, and I've actually spent LESS money. Full review on my page.",
    headline: "90-Day Honest Review",
    type: "CAROUSEL",
  },
  {
    primaryText:
      "Nighttime routine check! The peptide eye cream is my new holy grail. I've tried La Mer, Drunk Elephant, and SK-II — this outperforms all of them at a fraction of the price. Trust me on this one.",
    headline: "Better Than Luxury — For Less",
    type: "VIDEO",
  },
  {
    primaryText:
      "Before you buy another random serum, watch this. I'm breaking down exactly what your skin needs based on your concerns — and which products to pair together. Spoiler: less is more.",
    headline: "What Your Skin Actually Needs",
    type: "VIDEO",
  },
];

function buildAdDefinitions(): AdDef[] {
  const ads: AdDef[] = [];

  // 10 partnership/creator ads
  for (let i = 0; i < 10; i++) {
    const copy = CREATOR_AD_COPY[i];
    const creatorName = CREATOR_NAMES[i];
    const isGreat = i < 4; // 4 great creators
    const isGood = i >= 4 && i < 7;
    const isMediocre = i >= 7 && i < 9;

    let tier: AdDef["tier"];
    let baseRoas: number;
    let baseCtr: number;
    let dailySpend: number;

    if (isGreat) {
      tier = "great";
      baseRoas = rand(3.2, 4.5);
      baseCtr = rand(2.4, 3.5);
      dailySpend = rand(600, 1200);
    } else if (isGood) {
      tier = "good";
      baseRoas = rand(2.3, 3.1);
      baseCtr = rand(1.8, 2.5);
      dailySpend = rand(400, 800);
    } else if (isMediocre) {
      tier = "mediocre";
      baseRoas = rand(1.4, 2.0);
      baseCtr = rand(1.0, 1.6);
      dailySpend = rand(200, 500);
    } else {
      tier = "poor";
      baseRoas = rand(0.6, 1.1);
      baseCtr = rand(0.5, 0.9);
      dailySpend = rand(150, 350);
    }

    const campaign = i < 5 ? "Partnership Whitelisting" : "Prospecting - TOF Broad";
    const adSet = i < 5 ? `${creatorName} Whitelisted` : pick(AD_SET_NAMES_TOF);

    ads.push({
      adName: `${creatorName} - ${copy.headline}`,
      campaignName: campaign,
      adSetName: adSet,
      creativeType: copy.type,
      primaryText: copy.primaryText,
      headline: copy.headline,
      callToAction: pick(CTAS),
      isPartnershipAd: true,
      creatorName,
      tier,
      dailySpend,
      baseRoas,
      baseCtr,
    });
  }

  // 35 brand ads
  const brandCopies = [...BRAND_AD_COPY];
  // Shuffle
  for (let i = brandCopies.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [brandCopies[i], brandCopies[j]] = [brandCopies[j], brandCopies[i]];
  }

  // tier distribution: 5 great, 10 good, 12 mediocre, 8 poor
  const brandTiers: AdDef["tier"][] = [
    ...Array(5).fill("great"),
    ...Array(10).fill("good"),
    ...Array(12).fill("mediocre"),
    ...Array(8).fill("poor"),
  ] as AdDef["tier"][];

  // Pick 2-3 fatigue candidates from good/mediocre brand ads (indices 5-26)
  const fatigueIndices = new Set<number>();
  fatigueIndices.add(randInt(5, 14));
  fatigueIndices.add(randInt(15, 26));
  if (Math.random() > 0.5) fatigueIndices.add(randInt(5, 14));

  for (let i = 0; i < 35; i++) {
    const copy = brandCopies[i % brandCopies.length];
    const tier = brandTiers[i];

    let baseRoas: number;
    let baseCtr: number;
    let dailySpend: number;

    switch (tier) {
      case "great":
        baseRoas = rand(3.0, 4.0);
        baseCtr = rand(2.0, 3.0);
        dailySpend = rand(500, 1000);
        break;
      case "good":
        baseRoas = rand(2.0, 2.9);
        baseCtr = rand(1.5, 2.2);
        dailySpend = rand(300, 700);
        break;
      case "mediocre":
        baseRoas = rand(1.2, 1.9);
        baseCtr = rand(0.8, 1.4);
        dailySpend = rand(150, 400);
        break;
      case "poor":
        baseRoas = rand(0.4, 1.0);
        baseCtr = rand(0.3, 0.8);
        dailySpend = rand(100, 300);
        break;
    }

    const campaignPool =
      tier === "great"
        ? ["Scaling Winners - TOF", "Prospecting - TOF Lookalike"]
        : tier === "poor"
          ? ["Retargeting - BOF Cart Abandon", "Dynamic Product - BOF"]
          : CAMPAIGN_NAMES;

    const campaign = pick(campaignPool);
    const adSetPool = campaign.includes("TOF")
      ? AD_SET_NAMES_TOF
      : campaign.includes("MOF")
        ? AD_SET_NAMES_MOF
        : campaign.includes("BOF")
          ? AD_SET_NAMES_BOF
          : [...AD_SET_NAMES_TOF, ...AD_SET_NAMES_MOF];

    ads.push({
      adName: `Brand - ${copy.headline}`,
      campaignName: campaign,
      adSetName: pick(adSetPool),
      creativeType: copy.type,
      primaryText: copy.primaryText,
      headline: copy.headline,
      callToAction: pick(CTAS),
      isPartnershipAd: false,
      tier,
      fatigueSignal: fatigueIndices.has(i),
      dailySpend,
      baseRoas,
      baseCtr,
    });
  }

  return ads;
}

// ── Performance data generation ──────────────────────────

function generateDailyPerformance(ad: AdDef, dayIndex: number, totalDays: number) {
  const dayOfWeek = new Date(
    Date.now() - (totalDays - 1 - dayIndex) * 86400000
  ).getDay();

  // Weekend dip / weekday bump
  const dowMultiplier =
    dayOfWeek === 0 || dayOfWeek === 6 ? rand(0.82, 0.95) : rand(0.98, 1.12);

  // Gradual trend: good ads improve slightly, poor ads decay
  const trendMultiplier =
    ad.tier === "great"
      ? 1 + (dayIndex / totalDays) * rand(0.02, 0.08)
      : ad.tier === "poor"
        ? 1 - (dayIndex / totalDays) * rand(0.05, 0.15)
        : 1 + (dayIndex / totalDays) * rand(-0.03, 0.03);

  // Fatigue: rising frequency and declining CTR in the last 14 days
  let fatigueCtrlMult = 1;
  let fatigueFreqMult = 1;
  if (ad.fatigueSignal && dayIndex >= totalDays - 14) {
    const fatigueProgress = (dayIndex - (totalDays - 14)) / 14; // 0→1
    fatigueCtrlMult = 1 - fatigueProgress * rand(0.3, 0.5); // CTR drops 30-50%
    fatigueFreqMult = 1 + fatigueProgress * rand(0.8, 1.5); // frequency rises 80-150%
  }

  const spend = Math.max(
    10,
    jitter(ad.dailySpend, 0.25) * dowMultiplier * trendMultiplier
  );

  // CPM varies by tier and day
  const baseCpm =
    ad.tier === "great"
      ? rand(12, 20)
      : ad.tier === "good"
        ? rand(15, 25)
        : ad.tier === "mediocre"
          ? rand(18, 30)
          : rand(22, 38);

  const cpm = jitter(baseCpm, 0.15) * dowMultiplier;
  const impressions = Math.round((spend / cpm) * 1000);

  const baseFrequency = ad.tier === "poor" ? rand(2.5, 4.0) : rand(1.2, 2.2);
  const frequency = jitter(baseFrequency, 0.1) * fatigueFreqMult;
  const reach = Math.round(impressions / Math.max(1.0, frequency));

  const ctr =
    Math.max(0.15, jitter(ad.baseCtr, 0.2) * trendMultiplier * fatigueCtrlMult) /
    100;
  const clicks = Math.max(1, Math.round(impressions * ctr));
  const cpc = spend / clicks;

  // Conversion rate based on tier
  const baseCvr =
    ad.tier === "great"
      ? rand(0.04, 0.07)
      : ad.tier === "good"
        ? rand(0.025, 0.045)
        : ad.tier === "mediocre"
          ? rand(0.012, 0.025)
          : rand(0.005, 0.015);

  const cvr = baseCvr * trendMultiplier * (ad.fatigueSignal && dayIndex >= totalDays - 14 ? fatigueCtrlMult : 1);
  const conversions = Math.max(0, Math.round(clicks * cvr));

  // AOV for a DTC skincare brand
  const aov = rand(55, 95);
  const conversionValue = conversions * aov;
  const roas = spend > 0 ? conversionValue / spend : 0;
  const cpa = conversions > 0 ? spend / conversions : null;

  // Video metrics (only for video ads)
  let videoViews: number | null = null;
  let video3sViews: number | null = null;
  let videoThruplay: number | null = null;
  let hookRate: number | null = null;
  let holdRate: number | null = null;

  if (ad.creativeType === "VIDEO") {
    videoViews = Math.round(impressions * rand(0.6, 0.85));
    const hookBase =
      ad.tier === "great"
        ? rand(0.35, 0.50)
        : ad.tier === "good"
          ? rand(0.25, 0.38)
          : ad.tier === "mediocre"
            ? rand(0.18, 0.28)
            : rand(0.10, 0.20);
    hookRate = hookBase * (ad.fatigueSignal && dayIndex >= totalDays - 14 ? fatigueCtrlMult : 1);
    video3sViews = Math.round(videoViews * hookRate);

    const holdBase =
      ad.tier === "great"
        ? rand(0.20, 0.35)
        : ad.tier === "good"
          ? rand(0.14, 0.24)
          : ad.tier === "mediocre"
            ? rand(0.08, 0.15)
            : rand(0.04, 0.10);
    holdRate = holdBase;
    videoThruplay = Math.round(video3sViews * (holdRate / hookRate));
  }

  return {
    spend: Math.round(spend * 100) / 100,
    impressions,
    reach,
    clicks,
    cpc: Math.round(cpc * 100) / 100,
    cpm: Math.round(cpm * 100) / 100,
    ctr: Math.round(ctr * 10000) / 100, // stored as percentage
    conversions,
    conversionValue: Math.round(conversionValue * 100) / 100,
    cpa: cpa !== null ? Math.round(cpa * 100) / 100 : null,
    roas: Math.round(roas * 100) / 100,
    frequency: Math.round(frequency * 100) / 100,
    videoViews,
    video3sViews,
    videoThruplay,
    hookRate: hookRate !== null ? Math.round(hookRate * 10000) / 100 : null,
    holdRate: holdRate !== null ? Math.round(holdRate * 10000) / 100 : null,
  };
}

// ── Main seed function ───────────────────────────────────

export async function seedDemoData(userId: string) {
  const TOTAL_DAYS = 30;
  const now = new Date();

  // 1. Ensure an AdAccount exists for the user
  const adAccountId = `demo_act_${userId.slice(0, 8)}`;
  let adAccount = await prisma.adAccount.findUnique({
    where: { metaAccountId: adAccountId },
  });

  if (!adAccount) {
    adAccount = await prisma.adAccount.create({
      data: {
        userId,
        metaAccountId: adAccountId,
        metaAccountName: "Luminary Skin Co — Demo Account",
        encryptedAccessToken: "demo_token_not_real",
        status: "ACTIVE",
        lastSyncAt: now,
      },
    });
  } else {
    await prisma.adAccount.update({
      where: { id: adAccount.id },
      data: { lastSyncAt: now },
    });
  }

  // 2. Delete existing MetaAds (cascades to performance) for this user
  await prisma.metaAd.deleteMany({ where: { userId } });

  // 3. Delete existing monthly targets and marketing events for this user
  await prisma.monthlyTarget.deleteMany({ where: { userId } });
  await prisma.marketingEvent.deleteMany({ where: { userId } });

  // 4. Upsert brand profile for demo context
  await prisma.brandProfile.upsert({
    where: { userId },
    create: {
      userId,
      brandName: "Luminary Skin Co",
      websiteUrl: "https://luminaryskin.co",
      industry: "skincare",
      monthlyRevenueRange: "$250k-$500k",
      businessAge: "2-5 years",
      targetCustomer: "Women 25-45 interested in clean, science-backed skincare",
      averageOrderValue: 72,
      acquisitionFocus: "new_customers",
      uniqueDifferentiator:
        "Clinical-grade formulations at DTC prices with radical ingredient transparency",
      monthlyAdSpendRange: "$75k-$150k",
      activeAdPlatforms: ["meta", "tiktok"],
      usesCreatorContent: "yes_regularly",
      usesPartnershipAds: "yes",
      biggestChallenges: ["scaling_profitably", "creative_fatigue", "rising_cpms"],
      competitor1: "The Ordinary",
      competitor2: "Drunk Elephant",
      competitor3: "CeraVe",
      briefValuePreferences: [
        "creative_insights",
        "performance_trends",
        "competitor_analysis",
      ],
      onboardingCompleted: true,
      onboardingStep: 6,
    },
    update: {
      brandName: "Luminary Skin Co",
      industry: "skincare",
      onboardingCompleted: true,
    },
  });

  // 5. Create monthly target for current month
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  await prisma.monthlyTarget.create({
    data: {
      userId,
      month: currentMonthStart,
      revenueGoal: 500000,
      adSpendBudget: 125000,
      targetRoas: 3.0,
      targetCpa: 35,
      targetOrders: 2000,
      targetNewCac: 42,
    },
  });

  // Also add last month for comparison
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  await prisma.monthlyTarget.create({
    data: {
      userId,
      month: lastMonthStart,
      revenueGoal: 450000,
      adSpendBudget: 110000,
      targetRoas: 2.8,
      targetCpa: 38,
      targetOrders: 1800,
      targetNewCac: 45,
    },
  });

  // 6. Create demo marketing events spread across next 3 months
  const demoEvents = [
    {
      title: "Valentine's Day Sale",
      eventType: "promotion",
      startDate: new Date(2026, 1, 14),
      endDate: new Date(2026, 1, 16),
      description: "Valentine's Day promo — 25% off gift sets, couples bundles, and limited-edition packaging",
      adSpendBoost: 800,
      revenueTarget: 75000,
      notes: "20% off sitewide, plus free gift wrap. Push gift guide creative hard.",
    },
    {
      title: "Spring Collection Launch",
      eventType: "product_launch",
      startDate: new Date(2026, 2, 1),
      description: "Launching 4 new products: Brightening Toner, Peptide Mist, SPF Lip Balm, and the reformulated Gel Cream",
      adSpendBoost: 600,
      revenueTarget: 120000,
      notes: "Embargo lifts Feb 25. Creator shipments going out Feb 20.",
    },
    {
      title: "Influencer Campaign Push with @SkinByAlyssa",
      eventType: "influencer_campaign",
      startDate: new Date(2026, 2, 10),
      endDate: new Date(2026, 2, 17),
      description: "Major creator push with Alyssa Chen — 5 whitelisted creatives going live, plus IG stories series",
      adSpendBoost: 1200,
      revenueTarget: 90000,
      notes: "Partnership ads whitelisted through her page. Expecting 3 UGC videos + 2 static posts.",
    },
    {
      title: "St. Patrick's Day Flash Sale",
      eventType: "promotion",
      startDate: new Date(2026, 2, 17),
      description: "17% off everything for 24 hours. Quick flash sale to keep momentum from influencer push.",
      adSpendBoost: 400,
      revenueTarget: 35000,
    },
    {
      title: "Content Production Week",
      eventType: "content_shoot",
      startDate: new Date(2026, 2, 24),
      endDate: new Date(2026, 2, 28),
      description: "Full week shoot: 20 new ad creatives (12 video, 8 static), product flatlays, and lifestyle content",
      notes: "Studio booked in LA. 3 models confirmed. Shooting spring + summer campaigns.",
    },
    {
      title: "Easter Promotion",
      eventType: "seasonal",
      startDate: new Date(2026, 3, 5),
      endDate: new Date(2026, 3, 7),
      description: "Easter weekend sale — Buy 2 Get 1 Free on all serums. Limited-edition spring packaging.",
      adSpendBoost: 500,
      revenueTarget: 55000,
    },
    {
      title: "Earth Day Clean Beauty Campaign",
      eventType: "pr_press",
      startDate: new Date(2026, 3, 22),
      description: "PR push around clean beauty + sustainability story. Press kits going to 50 editors and influencers.",
      revenueTarget: 40000,
      notes: "Partnering with 1% for the Planet. Launching refillable packaging for top 3 SKUs.",
    },
    {
      title: "Mother's Day Gift Guide Launch",
      eventType: "email_campaign",
      startDate: new Date(2026, 4, 1),
      description: "Email campaign: Mother's Day gift guide featuring curated sets at 3 price points ($49, $89, $149)",
      adSpendBoost: 300,
    },
    {
      title: "Mother's Day Sale",
      eventType: "promotion",
      startDate: new Date(2026, 4, 8),
      endDate: new Date(2026, 4, 11),
      description: "Mother's Day sale week — 20% off all gift sets plus free express shipping",
      adSpendBoost: 700,
      revenueTarget: 95000,
      notes: "Expecting high AOV from gift sets. Run UGC testimonial ads from real moms.",
    },
  ];

  for (const evt of demoEvents) {
    await prisma.marketingEvent.create({
      data: {
        userId,
        title: evt.title,
        eventType: evt.eventType,
        startDate: evt.startDate,
        endDate: evt.endDate || null,
        description: evt.description || null,
        adSpendBoost: evt.adSpendBoost || null,
        revenueTarget: evt.revenueTarget || null,
        notes: evt.notes || null,
      },
    });
  }

  // 7. Build and insert ads with performance data
  const adDefs = buildAdDefinitions();

  // Use a counter for unique meta IDs
  let adCounter = 0;
  for (const adDef of adDefs) {
    adCounter++;
    const metaAdId = `demo_${adCounter.toString().padStart(3, "0")}_${Date.now()}`;
    const campaignId = `demo_camp_${adDef.campaignName.replace(/\s+/g, "_").toLowerCase().slice(0, 20)}`;
    const adSetId = `demo_adset_${adDef.adSetName.replace(/\s+/g, "_").toLowerCase().slice(0, 20)}_${adCounter}`;

    const adData = {
      userId,
      adAccountId: adAccount.id,
      metaCampaignId: campaignId,
      campaignName: adDef.campaignName,
      metaAdSetId: adSetId,
      adSetName: adDef.adSetName,
      metaAdId,
      adName: adDef.adName,
      status: "ACTIVE",
      creativeType: adDef.creativeType,
      primaryText: adDef.primaryText,
      headline: adDef.headline,
      callToAction: adDef.callToAction,
      isPartnershipAd: adDef.isPartnershipAd,
      creatorName: adDef.creatorName ?? null,
      creatorPageId: adDef.creatorName
        ? `creator_${adDef.creatorName.replace(/\s+/g, "_").toLowerCase()}`
        : null,
    };

    // Use upsert (matches proven sync route pattern)
    const createdAd = await prisma.metaAd.upsert({
      where: { userId_metaAdId: { userId, metaAdId } },
      create: adData,
      update: adData,
    });

    // Generate and insert 30 days of performance using individual upserts
    // (matches the sync route pattern — createMany is untested with PrismaPg adapter)
    for (let day = 0; day < TOTAL_DAYS; day++) {
      const date = new Date(now);
      date.setDate(date.getDate() - (TOTAL_DAYS - 1 - day));
      date.setHours(0, 0, 0, 0);

      const perf = generateDailyPerformance(adDef, day, TOTAL_DAYS);

      await prisma.metaAdPerformance.upsert({
        where: {
          metaAdId_date: {
            metaAdId: createdAd.id,
            date,
          },
        },
        create: {
          metaAdId: createdAd.id,
          date,
          ...perf,
        },
        update: {
          ...perf,
        },
      });
    }
  }

  return {
    adsCreated: adDefs.length,
    daysPerAd: TOTAL_DAYS,
    totalPerformanceRows: adDefs.length * TOTAL_DAYS,
  };
}
