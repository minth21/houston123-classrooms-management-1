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

interface TokenResponse {
  token: string;
  data?: any;
}

const extractAndStoreToken = (response: any): TokenResponse | null => {
  const token =
    response.headers["authorization"] ||
    response.headers["x-auth-token"] ||
    (response.data && (response.data.token || response.data.accessToken));

  if (!token) return null;

  const cleanToken = token.replace("Bearer ", "");
  localStorage.setItem("token", cleanToken);

  if (response.status === 204) {
    return { token: cleanToken };
  }

  return {
    token: cleanToken,
    data: response.data,
  };
};

const attemptLogin = async (
  credentials: LoginCredentials,
  endpoint: string,
  axiosInstance: typeof axios | typeof api = axios
): Promise<TokenResponse> => {
  try {
    const response = await axiosInstance.post(endpoint, credentials, {
      validateStatus: (status) => status >= 200 && status < 500,
    });

    const result = extractAndStoreToken(response);
    if (!result) {
      throw new Error(`No token found in response from ${endpoint}`);
    }

    return result;
  } catch (error: any) {
    console.error(`Login attempt failed for ${endpoint}:`, error.message);
    throw error;
  }
};

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      console.log("Attempting login through Next.js API route...");
      
      const response = await api.post("/api/auth/token", credentials, {
        validateStatus: (status) => status >= 200 && status < 500,
      });

      console.log("Login response:", {
        status: response.status,
        hasData: !!response.data,
        hasToken: !!(response.data?.token)
      });

      // Check if the response indicates success
      if (response.status === 200 && response.data?.token) {
        const token = response.data.token;
        localStorage.setItem("token", token);
        
        return {
          token,
          ...(response.data.data && { user: response.data.data }),
        };
      } else {
        // Handle error responses (401, etc.)
        const errorMessage = response.data?.error || 
                           response.data?.message || 
                           `Authentication failed with status ${response.status}`;
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      console.error("Login failed:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      throw new Error(
        error.response?.data?.error || 
        error.response?.data?.message || 
        error.message ||
        "Authentication failed"
      );
    }
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
