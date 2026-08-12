import { getPlayerPortraitProfile,savePlayerPortraitProfile } from "./db";
import { playerIndexPortraitUrl } from "./player-index";

type SportsDbPlayer = {
  strPlayer?: string;
  strSport?: string;
  strThumb?: string | null;
  strCutout?: string | null;
  strRender?: string | null;
};

type SportsDbResponse = { player?:SportsDbPlayer[] | null };

const SPORTS_DB_BASE = "https://www.thesportsdb.com/api/v1/json";
const FAILED_LOOKUP_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SPORTS_DB_NAME_ALIASES = new Map([
  ["patrick mahomes ii","patrick mahomes"],
]);

function normalized(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .toLocaleLowerCase().replace(/[^a-z0-9]+/g," ").trim();
}

function pulseSport(value: string) {
  const sport = normalized(value);
  if (sport === "american football") return "Football";
  if (sport === "ice hockey") return "Hockey";
  if (sport === "baseball") return "Baseball";
  if (sport === "basketball") return "Basketball";
  if (sport === "soccer") return "Soccer";
  return value;
}

function validImage(value: string | null | undefined) {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function acceptedPlayerName(requested: string,candidate: string) {
  const requestedName = normalized(requested);
  const candidateName = normalized(candidate);
  return candidateName === requestedName || candidateName === SPORTS_DB_NAME_ALIASES.get(requestedName);
}

/**
 * Returns a cached portrait first, then resolves an exact player/sport match
 * through TheSportsDB's documented player search. Its public v1 key is 123;
 * SPORTSDB_API_KEY can override it with a dedicated production key.
 */
export async function resolvePlayerPortrait(player: string,sport: string) {
  const seeded = playerIndexPortraitUrl(player);
  if (seeded) return { imageUrl:seeded,source:"curated" };

  const cached = await getPlayerPortraitProfile(player,sport);
  if (cached?.available && cached.imageUrl) return { imageUrl:cached.imageUrl,source:cached.source };
  const checkedAt = cached?.checkedAt ? Date.parse(cached.checkedAt) : 0;
  if (cached && !cached.available && Number.isFinite(checkedAt) && Date.now() - checkedAt < FAILED_LOOKUP_TTL_MS) {
    return null;
  }

  const key = process.env.SPORTSDB_API_KEY?.trim() || "123";
  const url = `${SPORTS_DB_BASE}/${encodeURIComponent(key)}/searchplayers.php?p=${encodeURIComponent(player)}`;
  const response = await fetch(url,{ cache:"no-store",signal:AbortSignal.timeout(12_000) });
  if (!response.ok) throw new Error(`Player portrait search returned ${response.status}`);
  const payload = await response.json() as SportsDbResponse;
  const match = (payload.player ?? []).find((candidate) =>
    acceptedPlayerName(player,candidate.strPlayer ?? "")
      && normalized(pulseSport(candidate.strSport ?? "")) === normalized(sport),
  );
  const imageUrl = validImage(match?.strThumb) ?? validImage(match?.strCutout) ?? validImage(match?.strRender);
  await savePlayerPortraitProfile({
    player,sport,imageUrl,source:imageUrl ? "TheSportsDB" : "unavailable",available:Boolean(imageUrl),
  });
  return imageUrl ? { imageUrl,source:"TheSportsDB" } : null;
}
