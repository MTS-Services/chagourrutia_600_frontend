/**
 * Derive IANA timezone string from city name by searching supported timezones
 * @param {string} region - Region name (e.g., "Asia")
 * @param {string} city - City name (e.g., "Dhaka")
 * @returns {string|null} IANA timezone string or null if not found
 */
export function deriveIANATimezone(region, city) {
  try {
    const allTimezones = Intl.supportedValuesOf("timeZone");
    const normalizedCity = city?.replace(/\s+/g, "_");
    const normalizedRegion = region?.replace(/\s+/g, "_");

    // Try exact match with region/city
    if (normalizedRegion && normalizedCity) {
      const exactMatch = allTimezones.find(
        (tz) =>
          tz.toLowerCase() ===
          `${normalizedRegion}/${normalizedCity}`.toLowerCase(),
      );
      if (exactMatch) return exactMatch;
    }

    // Try to find by city name only
    if (normalizedCity) {
      const cityMatch = allTimezones.find((tz) =>
        tz.toLowerCase().endsWith(`/${normalizedCity.toLowerCase()}`),
      );
      if (cityMatch) return cityMatch;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Check if error is an authentication error (401/403) and handle auto-logout
 * @param {Error} error - The error object
 * @param {Function} signOut - The signOut function from auth context
 * @returns {boolean} - True if auth error was handled
 */
export function handleAuthError(error, signOut) {
  const errorMsg = error?.message || "";
  const statusCode = error?.status;

  const isAuthError =
    statusCode === 401 ||
    statusCode === 403 ||
    errorMsg.toLowerCase().includes("401") ||
    errorMsg.toLowerCase().includes("403") ||
    errorMsg.toLowerCase().includes("unauthorized") ||
    errorMsg.toLowerCase().includes("invalid or expired access token") ||
    errorMsg.toLowerCase().includes("invalid token") ||
    errorMsg.toLowerCase().includes("token expired");

  if (isAuthError) {
    console.warn("Authentication error detected - logging out", error);
    signOut();
    return true;
  }
  return false;
}

/**
 * Transform grouped backend timezone data to flat array
 * @param {Array} groupedData - Grouped timezone data from backend
 * @returns {Array} Flat array of timezones with derived IANA strings
 */
export function transformBackendTimezones(groupedData) {
  return groupedData.flatMap((group) =>
    (group.item || []).map((item) => {
      const derivedTimezone = deriveIANATimezone(item.region, item.city);
      return {
        id: item.id,
        name: item.name,
        city: item.city,
        region: item.region,
        abbreviation: item.abbreviation,
        offset: item.offset,
        timezone: derivedTimezone,
        workingHoursStart: item.workingHoursStart ?? 9,
        workingHoursEnd: item.workingHoursEnd ?? 17,
        label: item.label,
        groupId: item.groupId,
        groupName:
          group.name && group.name !== "Ungrouped" ? group.name : "General",
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      };
    }),
  );
}

/**
 * Group timezones by groupName
 * @param {Array} timezones - Array of timezone objects
 * @returns {Object} Grouped timezones by groupName
 */
export function groupTimezonesByGroupName(timezones) {
  const grouped = {};

  timezones.forEach((timezone) => {
    const group = timezone.groupName || "General";
    if (!grouped[group]) {
      grouped[group] = [];
    }
    grouped[group].push(timezone);
  });

  return grouped;
}
