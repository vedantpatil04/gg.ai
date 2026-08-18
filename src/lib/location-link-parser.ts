/**
 * location-link-parser.ts
 *
 * Safe location URL and coordinate parser for GreenGuard AI Citizen Hub.
 *
 * Supports:
 * - Google Maps (web URLs, place URLs, search URLs, query coordinates)
 * - OpenStreetMap (web URLs, permalinks)
 * - Apple Maps (query, ll, sll)
 * - geo: URIs
 * - Raw coordinate strings (decimal or DMS)
 *
 * Adheres strictly to the rule: Never fabricate coordinates or reverse-geocoding results.
 */

export interface ParsedLocationResult {
  isValid: boolean;
  lat?: number;
  lng?: number;
  address?: string;
  ward?: string;
  sourceType?: "google_maps" | "osm" | "apple_maps" | "geo_uri" | "coordinates" | "named_place";
  originalInput: string;
  error?: string;
}

/** Reverse geocode coordinates using OpenStreetMap Nominatim */
export async function reverseGeocodeCoords(
  lat: number,
  lng: number,
): Promise<{ address: string; ward?: string }> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    const res = await fetch(url, { headers: { "Accept-Language": "en" } });
    if (!res.ok) throw new Error("Geocoding service unavailable");
    const data = (await res.json()) as {
      display_name?: string;
      address?: {
        suburb?: string;
        neighbourhood?: string;
        city_district?: string;
        ward?: string;
        road?: string;
        county?: string;
        city?: string;
        town?: string;
        village?: string;
        state?: string;
        country?: string;
      };
    };
    const a = data.address ?? {};
    const line1 = [a.road, a.suburb ?? a.neighbourhood].filter(Boolean).join(", ");
    const line2 = [a.city ?? a.town ?? a.village, a.county, a.state].filter(Boolean).join(", ");
    const address = line1
      ? `${line1}, ${line2}`
      : (data.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    const ward = a.city_district ?? a.ward ?? a.suburb;
    return { address, ward };
  } catch {
    return { address: `${lat.toFixed(5)}, ${lng.toFixed(5)}` };
  }
}

/** Check if numbers are within valid global latitude / longitude bounds */
function isValidLatLng(lat: number, lng: number): boolean {
  return (
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/** Parse degrees-minutes-seconds formatted string into decimal degrees */
function parseDMS(str: string): { lat: number; lng: number } | null {
  const dmsRegex =
    /([0-9]+(?:\.[0-9]+)?)[°\s]+([0-9]+(?:\.[0-9]+)?)[′'\s]+([0-9]+(?:\.[0-9]+)?)[″"\s]*([NSns])[\s,]+([0-9]+(?:\.[0-9]+)?)[°\s]+([0-9]+(?:\.[0-9]+)?)[′'\s]+([0-9]+(?:\.[0-9]+)?)[″"\s]*([EWew])/;
  const match = str.match(dmsRegex);
  if (!match) return null;

  const latDeg = parseFloat(match[1]) + parseFloat(match[2]) / 60 + parseFloat(match[3]) / 3600;
  const latSign = match[4].toUpperCase() === "S" ? -1 : 1;
  const lat = latDeg * latSign;

  const lngDeg = parseFloat(match[5]) + parseFloat(match[6]) / 60 + parseFloat(match[7]) / 3600;
  const lngSign = match[8].toUpperCase() === "W" ? -1 : 1;
  const lng = lngDeg * lngSign;

  if (isValidLatLng(lat, lng)) {
    return { lat, lng };
  }
  return null;
}

/**
 * Main parser function to interpret location links or coordinate strings.
 */
export async function parseLocationLinkOrCoords(
  input: string,
): Promise<ParsedLocationResult> {
  const trimmed = input.trim();
  if (!trimmed) {
    return { isValid: false, originalInput: input, error: "Please enter a link or coordinate." };
  }

  // 1. Raw Coordinates: "15.8497, 74.4977" or "15.8497,74.4977"
  const rawCoordMatch = trimmed.match(/^([-+]?\d{1,2}(?:\.\d+)?)\s*,\s*([-+]?\d{1,3}(?:\.\d+)?)$/);
  if (rawCoordMatch) {
    const lat = parseFloat(rawCoordMatch[1]);
    const lng = parseFloat(rawCoordMatch[2]);
    if (isValidLatLng(lat, lng)) {
      const geo = await reverseGeocodeCoords(lat, lng);
      return {
        isValid: true,
        lat,
        lng,
        address: geo.address,
        ward: geo.ward,
        sourceType: "coordinates",
        originalInput: input,
      };
    }
  }

  // 2. DMS coordinates: "15°50'58.9"N 74°29'51.7"E"
  const dms = parseDMS(trimmed);
  if (dms) {
    const geo = await reverseGeocodeCoords(dms.lat, dms.lng);
    return {
      isValid: true,
      lat: dms.lat,
      lng: dms.lng,
      address: geo.address,
      ward: geo.ward,
      sourceType: "coordinates",
      originalInput: input,
    };
  }

  // 3. geo: URI — "geo:15.8497,74.4977"
  if (trimmed.toLowerCase().startsWith("geo:")) {
    const geoMatch = trimmed.match(/^geo:([-+]?\d{1,2}(?:\.\d+)?),([-+]?\d{1,3}(?:\.\d+)?)/i);
    if (geoMatch) {
      const lat = parseFloat(geoMatch[1]);
      const lng = parseFloat(geoMatch[2]);
      if (isValidLatLng(lat, lng)) {
        const geo = await reverseGeocodeCoords(lat, lng);
        return {
          isValid: true,
          lat,
          lng,
          address: geo.address,
          ward: geo.ward,
          sourceType: "geo_uri",
          originalInput: input,
        };
      }
    }
  }

  // 4. Check if it's a URL
  try {
    let urlString = trimmed;
    if (!urlString.startsWith("http://") && !urlString.startsWith("https://")) {
      if (
        urlString.includes("maps.google") ||
        urlString.includes("google.com/maps") ||
        urlString.includes("openstreetmap.org") ||
        urlString.includes("maps.apple.com") ||
        urlString.includes("maps.app.goo.gl") ||
        urlString.includes("goo.gl/maps")
      ) {
        urlString = "https://" + urlString;
      } else {
        return {
          isValid: false,
          originalInput: input,
          error: "Unrecognized format. Please provide a supported map link (Google Maps, OpenStreetMap, Apple Maps) or coordinates.",
        };
      }
    }

    const url = new URL(urlString);
    const host = url.hostname.toLowerCase();
    const path = url.pathname;
    const searchParams = url.searchParams;

    // --- Google Maps URLs ---
    if (
      (host.includes("google.") && path.includes("/maps")) ||
      host === "maps.google.com" ||
      host === "maps.app.goo.gl" ||
      host === "goo.gl"
    ) {
      // Look for coordinates pattern in path: /@15.8497,74.4977
      const atMatch = (path + url.search).match(/@([-+]?\d{1,2}(?:\.\d+)?),([-+]?\d{1,3}(?:\.\d+)?)/);
      if (atMatch) {
        const lat = parseFloat(atMatch[1]);
        const lng = parseFloat(atMatch[2]);
        if (isValidLatLng(lat, lng)) {
          const geo = await reverseGeocodeCoords(lat, lng);
          return {
            isValid: true,
            lat,
            lng,
            address: geo.address,
            ward: geo.ward,
            sourceType: "google_maps",
            originalInput: input,
          };
        }
      }

      // Look for query params: ?q=15.8497,74.4977 or ?query=15.8497,74.4977
      const q = searchParams.get("q") || searchParams.get("query") || searchParams.get("ll");
      if (q) {
        const qMatch = q.match(/^([-+]?\d{1,2}(?:\.\d+)?),([-+]?\d{1,3}(?:\.\d+)?)$/);
        if (qMatch) {
          const lat = parseFloat(qMatch[1]);
          const lng = parseFloat(qMatch[2]);
          if (isValidLatLng(lat, lng)) {
            const geo = await reverseGeocodeCoords(lat, lng);
            return {
              isValid: true,
              lat,
              lng,
              address: geo.address,
              ward: geo.ward,
              sourceType: "google_maps",
              originalInput: input,
            };
          }
        }
      }

      // Look for place name in URL: /place/Tilakwadi,+Belagavi,+Karnataka/...
      const placeMatch = path.match(/\/place\/([^/@]+)/);
      if (placeMatch) {
        const decodedPlace = decodeURIComponent(placeMatch[1].replace(/\+/g, " "));
        return {
          isValid: true,
          address: decodedPlace,
          sourceType: "google_maps",
          originalInput: input,
        };
      }

      // If it's a shortened link like maps.app.goo.gl, explain that direct browser links work best
      if (host === "maps.app.goo.gl" || host === "goo.gl") {
        return {
          isValid: false,
          originalInput: input,
          error: "Shortened links cannot be expanded directly in-browser. Please copy the full link from the browser address bar, search by address, or use your current location.",
        };
      }
    }

    // --- OpenStreetMap URLs ---
    if (host.includes("openstreetmap.org")) {
      // Permalinks: #map=16/15.8497/74.4977
      const hash = url.hash;
      const hashMatch = hash.match(/#map=\d+\/([-+]?\d{1,2}(?:\.\d+)?)\/([-+]?\d{1,3}(?:\.\d+)?)/);
      if (hashMatch) {
        const lat = parseFloat(hashMatch[1]);
        const lng = parseFloat(hashMatch[2]);
        if (isValidLatLng(lat, lng)) {
          const geo = await reverseGeocodeCoords(lat, lng);
          return {
            isValid: true,
            lat,
            lng,
            address: geo.address,
            ward: geo.ward,
            sourceType: "osm",
            originalInput: input,
          };
        }
      }

      const latParam = searchParams.get("lat") || searchParams.get("mlat");
      const lonParam = searchParams.get("lon") || searchParams.get("mlon");
      if (latParam && lonParam) {
        const lat = parseFloat(latParam);
        const lng = parseFloat(lonParam);
        if (isValidLatLng(lat, lng)) {
          const geo = await reverseGeocodeCoords(lat, lng);
          return {
            isValid: true,
            lat,
            lng,
            address: geo.address,
            ward: geo.ward,
            sourceType: "osm",
            originalInput: input,
          };
        }
      }
    }

    // --- Apple Maps URLs ---
    if (host.includes("maps.apple.com")) {
      const ll = searchParams.get("ll") || searchParams.get("sll");
      if (ll) {
        const llMatch = ll.match(/^([-+]?\d{1,2}(?:\.\d+)?),([-+]?\d{1,3}(?:\.\d+)?)$/);
        if (llMatch) {
          const lat = parseFloat(llMatch[1]);
          const lng = parseFloat(llMatch[2]);
          if (isValidLatLng(lat, lng)) {
            const geo = await reverseGeocodeCoords(lat, lng);
            return {
              isValid: true,
              lat,
              lng,
              address: geo.address,
              ward: geo.ward,
              sourceType: "apple_maps",
              originalInput: input,
            };
          }
        }
      }
      const q = searchParams.get("q");
      if (q) {
        return {
          isValid: true,
          address: decodeURIComponent(q.replace(/\+/g, " ")),
          sourceType: "apple_maps",
          originalInput: input,
        };
      }
    }

    return {
      isValid: false,
      originalInput: input,
      error: "Could not extract a precise location from this link. Try searching for the address directly or use your current location.",
    };
  } catch {
    return {
      isValid: false,
      originalInput: input,
      error: "Invalid link format. Please check the URL and try again.",
    };
  }
}
