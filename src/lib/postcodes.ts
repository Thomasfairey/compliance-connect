/**
 * UK Postcode utilities using postcodes.io API (free, no API key needed)
 */

export type PostcodeResult = {
  postcode: string;
  latitude: number;
  longitude: number;
  region?: string;
  admin_district?: string;
};

export type PostcodeLookupResult = {
  success: boolean;
  result?: PostcodeResult;
  error?: string;
};

export type BulkPostcodeLookupResult = {
  success: boolean;
  results: Map<string, PostcodeResult>;
  errors: string[];
};

/**
 * Lookup a single UK postcode to get lat/long coordinates
 */
export async function lookupPostcode(postcode: string): Promise<PostcodeLookupResult> {
  try {
    const cleanPostcode = postcode.replace(/\s/g, "").toUpperCase();
    const response = await fetch(
      `https://api.postcodes.io/postcodes/${encodeURIComponent(cleanPostcode)}`,
      { next: { revalidate: 86400 } } // Cache for 24 hours
    );

    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, error: "Postcode not found" };
      }
      return { success: false, error: `API error: ${response.status}` };
    }

    const data = await response.json();

    if (data.status !== 200 || !data.result) {
      return { success: false, error: "Invalid response from API" };
    }

    return {
      success: true,
      result: {
        postcode: data.result.postcode,
        latitude: data.result.latitude,
        longitude: data.result.longitude,
        region: data.result.region,
        admin_district: data.result.admin_district,
      },
    };
  } catch (error) {
    console.error("Postcode lookup error:", error);
    return { success: false, error: "Failed to lookup postcode" };
  }
}

/**
 * Bulk lookup multiple postcodes (max 100 per request)
 */
export async function lookupPostcodes(postcodes: string[]): Promise<BulkPostcodeLookupResult> {
  const results = new Map<string, PostcodeResult>();
  const errors: string[] = [];

  if (postcodes.length === 0) {
    return { success: true, results, errors };
  }

  // Clean postcodes
  const cleanPostcodes = postcodes.map((p) => p.replace(/\s/g, "").toUpperCase());

  // Split into chunks of 100 (API limit)
  const chunks: string[][] = [];
  for (let i = 0; i < cleanPostcodes.length; i += 100) {
    chunks.push(cleanPostcodes.slice(i, i + 100));
  }

  try {
    for (const chunk of chunks) {
      const response = await fetch("https://api.postcodes.io/postcodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postcodes: chunk }),
      });

      if (!response.ok) {
        errors.push(`API error: ${response.status}`);
        continue;
      }

      const data = await response.json();

      if (data.status === 200 && data.result) {
        for (const item of data.result) {
          if (item.result) {
            results.set(item.query.replace(/\s/g, "").toUpperCase(), {
              postcode: item.result.postcode,
              latitude: item.result.latitude,
              longitude: item.result.longitude,
              region: item.result.region,
              admin_district: item.result.admin_district,
            });
          } else {
            errors.push(`Postcode not found: ${item.query}`);
          }
        }
      }
    }

    return { success: errors.length === 0, results, errors };
  } catch (error) {
    console.error("Bulk postcode lookup error:", error);
    return { success: false, results, errors: ["Failed to lookup postcodes"] };
  }
}

/**
 * Calculate straight-line distance between two points (Haversine formula)
 * Returns distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Estimate driving time from distance (rough UK average)
 * Assumes average speed of 30km/h in urban areas, 50km/h otherwise
 */
export function estimateDrivingTimeMinutes(distanceKm: number): number {
  if (distanceKm <= 10) {
    // Urban driving - slower
    return Math.round((distanceKm / 30) * 60);
  } else if (distanceKm <= 50) {
    // Mixed driving
    return Math.round((distanceKm / 40) * 60);
  } else {
    // Longer distances - motorway likely
    return Math.round((distanceKm / 50) * 60);
  }
}

/**
 * Calculate distance between two UK postcodes
 */
export async function calculatePostcodeDistance(
  postcode1: string,
  postcode2: string
): Promise<{
  success: boolean;
  distanceKm?: number;
  drivingTimeMinutes?: number;
  error?: string;
}> {
  const [result1, result2] = await Promise.all([
    lookupPostcode(postcode1),
    lookupPostcode(postcode2),
  ]);

  if (!result1.success || !result1.result) {
    return { success: false, error: `Could not lookup ${postcode1}` };
  }

  if (!result2.success || !result2.result) {
    return { success: false, error: `Could not lookup ${postcode2}` };
  }

  const distanceKm = calculateDistance(
    result1.result.latitude,
    result1.result.longitude,
    result2.result.latitude,
    result2.result.longitude
  );

  return {
    success: true,
    distanceKm: Math.round(distanceKm * 10) / 10,
    drivingTimeMinutes: estimateDrivingTimeMinutes(distanceKm),
  };
}

/**
 * Get the postcode area prefix (letters only)
 * e.g., "SW1A 1AA" -> "SW"
 */
export function getPostcodeArea(postcode: string): string {
  return postcode.replace(/\s/g, "").replace(/[0-9]/g, "").toUpperCase().substring(0, 2);
}

/**
 * Get the postcode district (letters + first numbers)
 * e.g., "SW1A 1AA" -> "SW1A"
 */
export function getPostcodeDistrict(postcode: string): string {
  const cleaned = postcode.replace(/\s/g, "").toUpperCase();
  // UK postcode format: outward code (2-4 chars) + inward code (3 chars)
  // Return the outward code
  if (cleaned.length >= 5) {
    return cleaned.slice(0, -3);
  }
  return cleaned;
}
