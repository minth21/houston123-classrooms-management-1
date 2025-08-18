"use client";

import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { companyService, Company, Branch } from "@/lib/api/company";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CompanySelectProps {
  onBranchSelect: (branchCode: string) => void;
}

export default function CompanySelect({ onBranchSelect }: CompanySelectProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(
    companyService.getSelectedCompany()
  );
  const [selectedBranch, setSelectedBranch] = useState<string | null>(
    companyService.getSelectedBranch()
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch companies on mount
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        setIsLoading(true);
        const data = await companyService.getCompanies();
        setCompanies(data);

        // If there's a selectedCompany, load its branches
        if (selectedCompany) {
          loadBranches(selectedCompany);
        } else if (data.length > 0) {
          // Auto-select the first company if none is selected
          handleCompanySelect(data[0]._id);
        }
      } catch (err) {
        setError("Failed to load companies");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompanies();
  }, []);

  // Load branches for a selected company
  const loadBranches = async (companyId: string) => {
    try {
      const data = await companyService.getBranches(companyId);
      setBranches(data);

      // If there's a stored selected branch and it belongs to this company, keep it selected
      const storedBranch = companyService.getSelectedBranch();
      const branchExists = data.some((branch) => branch.code === storedBranch);

      if (storedBranch && branchExists) {
        setSelectedBranch(storedBranch);
        onBranchSelect(storedBranch);
      } else if (data.length > 0) {
        // Auto-select the first branch if none is selected or current one doesn't belong to this company
        handleBranchSelect(data[0].code);
      } else {
        setSelectedBranch(null);
      }
    } catch (err) {
      setError("Failed to load branches");
    }
  };

  // Handle company selection
  const handleCompanySelect = (companyId: string) => {
    setSelectedCompany(companyId);
    companyService.setSelectedCompany(companyId);
    loadBranches(companyId);
  };

  // Handle branch selection
  const handleBranchSelect = (branchCode: string) => {
    setSelectedBranch(branchCode);
    companyService.setSelectedBranch(branchCode);
    try {
      const branch = branches.find(b => b.code === branchCode);
      if (branch?._id) {
        localStorage.setItem('selectedBranchId', branch._id);
      }
    } catch {}
    onBranchSelect(branchCode);
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Select Location</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="company-select" className="text-sm font-medium">
            Company
          </label>
          <Select
            disabled={isLoading || companies.length === 0}
            value={selectedCompany || ""}
            onValueChange={handleCompanySelect}
          >
            <SelectTrigger id="company-select" className="w-full">
              <SelectValue placeholder="Select a company" />
            </SelectTrigger>
            <SelectContent>
              {companies.map((company) => (
                <SelectItem key={company._id} value={company._id}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label htmlFor="branch-select" className="text-sm font-medium">
            Branch
          </label>
          <Select
            disabled={isLoading || !selectedCompany || branches.length === 0}
            value={selectedBranch || ""}
            onValueChange={handleBranchSelect}
          >
            <SelectTrigger id="branch-select" className="w-full">
              <SelectValue placeholder="Select a branch" />
            </SelectTrigger>
            <SelectContent>
              {branches.map((branch) => (
                <SelectItem key={branch._id} value={branch.code}>
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
