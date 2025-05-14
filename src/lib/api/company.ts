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

export const companyService = {
  getSelectedCompany(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('selectedCompany');
  },

  getSelectedBranch(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('selectedBranch');
  },

  setSelectedCompany(companyId: string) {
    localStorage.setItem('selectedCompany', companyId);
  },

  setSelectedBranch(branchCode: string) {
    localStorage.setItem('selectedBranch', branchCode);
  },

  async getCompanies(): Promise<Company[]> {
    try {
      // Check if we have a token first
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Unauthorized access. Please log in first.");
      }

      const response = await api.get("/company"); // Changed back to /company

      // Handle string responses (like "Unauthorized")
      if (typeof response.data === 'string') {
        throw new Error(response.data);
      }

      // Check if we got HTML instead of JSON
      if (typeof response.data === 'string' && response.data.includes('<!DOCTYPE html>')) {
        console.error('Received HTML instead of JSON. API endpoint might be incorrect.');
        throw new Error('Invalid API response format');
      }

      // Handle different response formats
      let companies: any[] | null = null;
      
      if (response.data && typeof response.data === 'object') {
        if (Array.isArray(response.data)) {
          companies = response.data;
        } else if (Array.isArray(response.data.data)) {
          companies = response.data.data;
        } else if (Array.isArray(response.data.companies)) {
          companies = response.data.companies;
        } else if (Array.isArray(response.data.items)) {
          companies = response.data.items;
        } else if (response.data.result && Array.isArray(response.data.result)) {
          companies = response.data.result;
        }
      }
      
      if (!companies) {
        console.error('Invalid company data format:', response.data);
        throw new Error("Unexpected company data format");
      }

      // Make the validation more lenient
      const validCompanies = companies
        .filter((company: any) => company && typeof company === 'object')
        .map((company: any) => ({
          _id: company._id || company.id || '',
          name: company.name || company.companyName || '',
          shortName: company.shortName || company.short_name || '',
          isActive: typeof company.isActive === 'boolean' ? company.isActive : true,
          branchList: company.branchList || company.branches || []
        }))
        .filter(company => company._id && company.name) as Company[];

      if (validCompanies.length === 0) {
        console.error('No valid companies found in:', companies);
        throw new Error("No valid companies found in response");
      }

      return validCompanies;
    } catch (error: any) {
      // Handle different error types
      if (error.response?.status === 401 || error.message === 'Unauthorized') {
        window.location.href = '/login';
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
      const response = await api.get(`/company/${companyId}/branch`);

      // Handle potential response formats
      if (response.data) {
        // If data is in a nested property
        const branches = response.data.data || response.data.branches || response.data;
        
        if (Array.isArray(branches)) {
          return branches;
        }
      }
      throw new Error("Unexpected branch data format");
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new Error("Unauthorized access. Please log in again.");
      }
      throw new Error(`Failed to load branches: ${error.message}`);
    }
  },
};
