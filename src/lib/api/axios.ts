import axios from "axios";

// Create an Axios instance with default configs
const api = axios.create({
  baseURL:
    typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:3000",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Add a request interceptor to add the authorization token to requests
api.interceptors.request.use(
  (config) => {
    console.log("Axios interceptor - Processing request:", config.url);

    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = token.startsWith("Bearer ")
        ? token
        : `Bearer ${token}`;
    }

    const selectedCompany = localStorage.getItem("selectedCompany");
    const selectedBranch = localStorage.getItem("selectedBranch");
    const cachedBranch = JSON.parse(
      localStorage.getItem("cached_branches") || "[]"
    );

    console.log("Axios interceptor - localStorage values:", {
      selectedCompany,
      selectedBranch,
    });

    if (selectedCompany) {
      config.headers["x-company"] = selectedCompany;
    }    if (selectedBranch && config.url?.includes("diary/post")) {
      config.headers["x-branch"] = cachedBranch?.find(
        (b: { code: string }) => b.code === selectedBranch
      )?._id;
    }

    console.log("Axios interceptor - Headers being sent:", {
      "x-company": config.headers["x-company"],
      "x-branch": config.headers["x-branch"],
    });

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Helper function to safely log error details
const getSafeErrorDetails = (error: any) => {
  const sensitiveHeaders = ["authorization", "x-auth-token", "x-api-key"];

  // Create a safe copy of headers with sensitive data redacted
  const safeHeaders = error.config?.headers ? { ...error.config.headers } : {};
  Object.keys(safeHeaders).forEach((key) => {
    if (sensitiveHeaders.includes(key.toLowerCase())) {
      safeHeaders[key] = "[REDACTED]";
    }
  });

  return {
    status: error.response?.status,
    data: error.response?.data,
    config: {
      url: error.config?.url,
      method: error.config?.method,
      params: error.config?.params,
      headers: safeHeaders,
    },
  };
};

// Add a response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API Error:", getSafeErrorDetails(error));
    return Promise.reject(error);
  }
);

export default api;
