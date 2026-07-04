export const REST_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

export async function restRequest(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${REST_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    if (response.status === 401) {
      // Don't auto-logout here, let the calling code handle the error.
      // E.g. loadUser will catch it and call logout.
    }
    
    let errorMsg = result.message || 'API Request Failed';
    if (result.errors) {
      errorMsg += ': ' + result.errors.map(e => `${e.field}: ${e.message}`).join(', ');
    }
    throw new Error(errorMsg);
  }

  return result.data;
}
