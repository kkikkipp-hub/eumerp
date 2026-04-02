const API_BASE = "/api";

interface ApiOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

class ApiClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  setTokens(access: string, refresh: string) {
    this.accessToken = access;
    this.refreshToken = refresh;
    localStorage.setItem("accessToken", access);
    localStorage.setItem("refreshToken", refresh);
  }

  loadTokens() {
    this.accessToken = localStorage.getItem("accessToken");
    this.refreshToken = localStorage.getItem("refreshToken");
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  }

  getAccessToken() {
    return this.accessToken;
  }

  isAuthenticated() {
    return !!this.accessToken;
  }

  private async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) return false;
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });
      if (!res.ok) return false;
      const data = (await res.json()) as { accessToken: string };
      this.accessToken = data.accessToken;
      localStorage.setItem("accessToken", data.accessToken);
      return true;
    } catch {
      return false;
    }
  }

  async fetch<T = any>(path: string, options: ApiOptions = {}): Promise<T> {
    this.loadTokens();
    const { method = "GET", body, headers = {} } = options;

    const fetchOptions: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(this.accessToken ? { Authorization: `Bearer ${this.accessToken}` } : {}),
        ...headers,
      },
    };

    if (body) fetchOptions.body = JSON.stringify(body);

    let res = await fetch(`${API_BASE}${path}`, fetchOptions);

    // Auto-refresh on 401
    if (res.status === 401 && this.refreshToken) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        (fetchOptions.headers as any).Authorization = `Bearer ${this.accessToken}`;
        res = await fetch(`${API_BASE}${path}`, fetchOptions);
      }
    }

    if (!res.ok) {
      const errorData = (await res.json().catch(() => ({ error: "Request failed" }))) as { error?: string };
      throw new Error(errorData.error || `HTTP ${res.status}`);
    }

    return res.json();
  }
}

export const api = new ApiClient();
