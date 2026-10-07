const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

// Helper to make API requests with fallback to local mock storage
export async function apiRequest(endpoint, options = {}) {
  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message || 'Network request failed');
    }

    return await res.json();
  } catch (error) {
    console.warn(`API request to ${endpoint} failed, falling back to local simulation:`, error.message);
    throw error;
  }
}
