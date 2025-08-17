import api from "./axios";

export interface Company {
  _id: string;
  name: string;
  shortName?: string;
  taxCode?: string;
  address?: string;
  regCode?: string;
  isActive?: boolean;
  branchList?: Branch[];
}

export interface Branch {
  _id: string;
  name: string;
  code: string;
  address?: string;
  isActive?: boolean;
  company?: string;
}

interface RawCompany {
  _id?: string;
  id?: string;
  name?: string;
  companyName?: string;
  shortName?: string;
  short_name?: string;
  isActive?: boolean;
  branchList?: Branch[];
  branches?: Branch[];
}

interface RawBranch {
  _id?: string;
  id?: string;
  name?: string;
  code?: string;
  address?: string;
  isActive?: boolean;
  company?: string;
}

interface ApiResponse<T> {
  data?: T;
  companies?: T[];
  items?: T[];
  result?: T[];
}

const extractArrayFromResponse = <T>(response: any): T[] | null => {
  if (!response || typeof response !== 'object') return null;

  if (Array.isArray(response)) return response;
  if (Array.isArray(response.data)) return response.data;
  if (Array.isArray(response.companies)) return response.companies;
  if (Array.isArray(response.items)) return response.items;
  if (Array.isArray(response.result)) return response.result;

  return null;
};

const validateCompany = (rawCompany: RawCompany): Company | null => {
  if (!rawCompany || typeof rawCompany !== 'object') {
    console.warn('Invalid company object:', rawCompany);
    return null;
  }

  const id = rawCompany._id || rawCompany.id;
  const name = rawCompany.name || rawCompany.companyName;

  if (!id || !name) {
    console.warn('Company missing required fields:', rawCompany);
    return null;
  }

  return {
    _id: id,
    name: name,
    shortName: rawCompany.shortName || rawCompany.short_name,
    isActive: typeof rawCompany.isActive === 'boolean' ? rawCompany.isActive : true,
    branchList: rawCompany.branchList || rawCompany.branches || [],
  };
};

const validateBranch = (rawBranch: RawBranch): Branch | null => {
  if (!rawBranch || typeof rawBranch !== 'object') {
    console.warn('Invalid branch object:', rawBranch);
    return null;
  }

  const id = rawBranch._id || rawBranch.id;
  const name = rawBranch.name;
  const code = rawBranch.code;

  if (!id || !name || !code) {
    console.warn('Branch missing required fields:', rawBranch);
    return null;
  }

  return {
    _id: id,
    name: name,
    code: code,
    address: rawBranch.address,
    isActive: typeof rawBranch.isActive === 'boolean' ? rawBranch.isActive : true,
    company: rawBranch.company,
  };
};

export const companyService = {
  getSelectedCompany(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("selectedCompany");
  },

  getSelectedBranch(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("selectedBranch");
  },

  getCachedBranches(): Branch[] {
    const branches = localStorage.getItem("cached_branches");
    if (branches) {
      try {
        return JSON.parse(branches);
      } catch (error) {
        console.error("Error parsing cached branches:", error);
        return [];
      }
    }
    return [];
  },

  setSelectedCompany(companyId: string) {
    localStorage.setItem("selectedCompany", companyId);
  },

  setSelectedBranch(branchCode: string) {
    localStorage.setItem("selectedBranch", branchCode);
  },

  async getCompanies(): Promise<Company[]> {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Unauthorized access. Please log in first.");
      }

      const response = await api.get("/api/company");

      // Handle string responses
      if (typeof response.data === "string") {
        if (response.data.includes("<!DOCTYPE html>")) {
          console.error("Received HTML instead of JSON. API endpoint might be incorrect.");
          throw new Error("Invalid API response format");
        }
        throw new Error(response.data);
      }

      const rawCompanies = extractArrayFromResponse<RawCompany>(response.data);
      if (!rawCompanies) {
        console.error("Invalid company data format:", response.data);
        throw new Error("Unexpected company data format");
      }

      const validCompanies = rawCompanies
        .map(validateCompany)
        .filter((company): company is Company => company !== null);

      if (validCompanies.length === 0) {
        console.error("No valid companies found in:", rawCompanies);
        throw new Error("No valid companies found in response");
      }

      return validCompanies;
    } catch (error: any) {
      if (error.response?.status === 401 || error.message === "Unauthorized") {
        window.location.href = "/login";
        throw new Error("Unauthorized access. Please log in again.");
      }

      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }

      throw error;
    }
  },

  async getBranches(companyId: string): Promise<Branch[]> {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Unauthorized access. Please log in first.");
      }

      const response = await api.get(`/api/company/${companyId}/branch`);

      // Handle string responses
      if (typeof response.data === "string") {
        if (response.data.includes("<!DOCTYPE html>")) {
          console.error("Received HTML instead of JSON. API endpoint might be incorrect.");
          throw new Error("Invalid API response format");
        }
        throw new Error(response.data);
      }

      const rawBranches = extractArrayFromResponse<RawBranch>(response.data);
      if (!rawBranches) {
        console.error("Invalid branch data format:", response.data);
        throw new Error("Unexpected branch data format");
      }

      const validBranches = rawBranches
        .map(validateBranch)
        .filter((branch): branch is Branch => branch !== null);

      if (validBranches.length === 0) {
        console.error("No valid branches found in:", rawBranches);
        throw new Error("No valid branches found in response");
      }

      try {
        const cachePayload = validBranches.map(b => ({ _id: b._id, id: b._id, code: b.code, name: b.name }));
        localStorage.setItem("cached_branches", JSON.stringify(cachePayload));
      } catch (e) {
        console.warn("Failed to cache branches", e);
      }

      return validBranches;
    } catch (error: any) {
      if (error.response?.status === 401 || error.message === "Unauthorized") {
        window.location.href = "/login";
        throw new Error("Unauthorized access. Please log in again.");
      }

      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }

      throw error;
    }
  },
};
