import api from "./axios";
import axios from "axios";

export interface LoginCredentials {
  txtusername: string;
  txtpassword: string;
}

export interface AuthResponse {
  token: string;
  user?: any;
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      // First try using the direct proxy route to avoid CORS issues
      const response = await axios.post("/auth/token", credentials);

      // Check for an authentication token in the response headers or data
      const token =
        response.headers["authorization"] ||
        response.headers["x-auth-token"] ||
        (response.data && (response.data.token || response.data.accessToken));

      // For 204 responses, we might need to extract token from headers
      if (response.status === 204) {
        if (token) {
          localStorage.setItem("token", token.replace("Bearer ", ""));
          return { token: token.replace("Bearer ", "") };
        }
      } else if (response.data && response.data.token) {
        localStorage.setItem("token", response.data.token);
        return response.data;
      }

      // If we reach here, try the second method
      throw new Error("No token found in response");
    } catch (error: any) {
      try {
        // Then try using the server-side API route
        const response = await axios.post("/api/auth/token", credentials, {
          validateStatus: (status) => status >= 200 && status < 500,
        });

        // Check for an authentication token in the response headers for 204 response
        const token =
          response.headers["authorization"] ||
          response.headers["x-auth-token"] ||
          (response.data && response.data.token);

        if (response.status === 204) {
          if (token) {
            localStorage.setItem("token", token.replace("Bearer ", ""));
            return { token: token.replace("Bearer ", "") };
          }
        } else if (response.data && response.data.token) {
          localStorage.setItem("token", response.data.token);
          return response.data;
        } else {
          throw new Error("Invalid response format - token not found");
        }
      } catch (innerError: any) {
        // Fallback to the proxied API endpoint if the server-side route fails
        const response = await api.post(
          "/authorization/getToken",
          credentials,
          {
            validateStatus: (status) => status >= 200 && status < 500,
          }
        );

        // Check for token in response or headers
        const token =
          response.headers["authorization"] ||
          response.headers["x-auth-token"] ||
          (response.data && response.data.token);

        if (response.status === 204) {
          if (token) {
            localStorage.setItem("token", token.replace("Bearer ", ""));
            return { token: token.replace("Bearer ", "") };
          }
        } else if (response.data && response.data.token) {
          localStorage.setItem("token", response.data.token);
          return response.data;
        } else {
          // If we still don't have a token, this is an error
          throw new Error("Authentication failed - could not acquire token");
        }
      }
    }
    throw new Error("Authentication failed");
  },

  isAuthenticated(): boolean {
    const token = localStorage.getItem("token");
    if (!token) return false;

    try {
      // Check if token has expired
      const payload = JSON.parse(atob(token.split(".")[1]));
      const expiry = payload.exp * 1000; // Convert to milliseconds
      if (Date.now() >= expiry) {
        localStorage.removeItem("token");
        return false;
      }
      return true;
    } catch (e) {
      localStorage.removeItem("token");
      return false;
    }
  },

  getToken(): string | null {
    return localStorage.getItem("token");
  },

  logout(): void {
    localStorage.removeItem("token");
    localStorage.removeItem("selectedCompany");
    localStorage.removeItem("selectedBranch");
  },
};
