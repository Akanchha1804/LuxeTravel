/**
 * Single place for talking to the Django API.
 *
 * In development Create React App proxies /api to http://localhost:8000
 * (see "proxy" in package.json). In production Django serves the build, so
 * a relative /api path works on any hostname.
 */

export const API_BASE = (process.env.REACT_APP_API_URL || "/api").replace(/\/+$/, "");

export class ApiError extends Error {
  constructor(message, status = 0, data = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export function getToken() {
  return localStorage.getItem("token");
}

export function getStoredUsername() {
  return localStorage.getItem("username") || localStorage.getItem("chat_username") || "";
}

const AUTH_EVENT = "luxetravel:auth-change";

function notifyAuthChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_EVENT));
  }
}

/** Re-render auth-aware UI when the token is saved or cleared. */
export function subscribeAuth(callback) {
  window.addEventListener(AUTH_EVENT, callback);
  return () => window.removeEventListener(AUTH_EVENT, callback);
}

export function saveAuth(token, username, email) {
  if (token) localStorage.setItem("token", token);
  if (username) localStorage.setItem("username", username);
  if (email) localStorage.setItem("email", email);
  notifyAuthChange();
}

export function clearAuth() {
  localStorage.removeItem("token");
  localStorage.removeItem("username");
  localStorage.removeItem("email");
  notifyAuthChange();
}

export function isLoggedIn() {
  return Boolean(getToken());
}

function extractError(data, fallback) {
  if (!data) return fallback;
  if (typeof data === "string") return data;
  if (data.error) return data.error;
  if (data.detail) return data.detail;
  const firstKey = Object.keys(data)[0];
  if (firstKey) {
    const value = data[firstKey];
    if (Array.isArray(value) && value.length) return String(value[0]);
    if (typeof value === "string") return value;
  }
  return fallback;
}

export async function apiFetch(path, options = {}) {
  const {
    method = "GET",
    body,
    headers = {},
    auth = true,
    signal,
  } = options;

  const requestHeaders = {
    Accept: "application/json",
    ...headers,
  };

  const token = getToken();
  if (auth && token && !requestHeaders.Authorization) {
    requestHeaders.Authorization = `Token ${token}`;
  }

  let payload = body;
  if (body !== undefined && body !== null && !(body instanceof FormData)) {
    requestHeaders["Content-Type"] = "application/json";
    payload = typeof body === "string" ? body : JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(`${API_BASE}${path.startsWith("/") ? path : `/${path}`}`, {
      method,
      headers: requestHeaders,
      body: payload,
      signal,
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new ApiError(
      "Cannot reach the server. Check your connection and try again.",
      0,
    );
  }

  if (response.status === 204) return null;

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : await response.text().catch(() => null);

  if (response.status === 401 && auth && getToken()) {
    // The stored token is no longer valid, so drop it and update the UI.
    clearAuth();
  }

  if (!response.ok) {
    throw new ApiError(
      extractError(data, `Request failed (${response.status}).`),
      response.status,
      data,
    );
  }

  return data;
}

let healthPromise = null;

/** Health information is cached for the lifetime of the page. */
export function getHealth() {
  if (!healthPromise) {
    healthPromise = apiFetch("/health/", { auth: false }).catch(() => ({
      status: "unknown",
      ai_provider: null,
      travel_api: "unknown",
    }));
  }
  return healthPromise;
}

const BUDGET_PRESETS = {
  budget: 35000,
  moderate: 100000,
  luxury: 250000,
};

/** Turn a planner label/range into the number the API expects. */
export function budgetToNumber(value) {
  if (value === null || value === undefined || value === "") return 50000;
  if (typeof value === "number") return Math.max(value, 0);

  const text = String(value).trim().toLowerCase();
  if (BUDGET_PRESETS[text]) return BUDGET_PRESETS[text];

  const compact = text.replace(/,/g, "").replace(/₹/g, "").replace(/inr/g, "");
  const match = compact.match(/(\d+(?:\.\d+)?)\s*(k|l|lakh|crore|cr)?/);
  if (!match) return 50000;
  let amount = Number(match[1]);
  const unit = match[2];
  if (unit === "k") amount *= 1000;
  else if (unit === "l" || unit === "lakh") amount *= 100000;
  else if (unit === "crore" || unit === "cr") amount *= 10000000;
  return Math.round(amount);
}

export function formatBudget(value) {
  const amount = budgetToNumber(value);
  if (!Number.isFinite(amount) || amount <= 0) return "Flexible";
  return `₹${amount.toLocaleString("en-IN")}`;
}

/**
 * Normalise the many itinerary shapes the app has used over time.
 * Returns { days, packing_list, local_transportation } or null.
 */
export function parseItinerary(value) {
  if (!value) return null;
  let parsed = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch (error) {
      return null;
    }
  }
  if (Array.isArray(parsed)) {
    return { days: parsed, packing_list: [], local_transportation: [] };
  }
  if (parsed && Array.isArray(parsed.days)) {
    return {
      days: parsed.days,
      packing_list: Array.isArray(parsed.packing_list) ? parsed.packing_list : [],
      local_transportation: Array.isArray(parsed.local_transportation)
        ? parsed.local_transportation
        : [],
      mood_board_keywords: Array.isArray(parsed.mood_board_keywords)
        ? parsed.mood_board_keywords
        : [],
    };
  }
  return null;
}

export function daysBetween(startDate, endDate) {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  return Math.max(Math.round((end - start) / 86400000) + 1, 1);
}
