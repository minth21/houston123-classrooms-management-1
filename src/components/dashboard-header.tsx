"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { companyService, Company, Branch } from "@/lib/api/company";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface DashboardHeaderProps {
  title: string;
  description?: string;
  onBranchSelect?: (branchCode: string) => void;
  showCompanySelect?: boolean;
  className?: string;
}

export default function DashboardHeader({
  title,
  description,
  onBranchSelect,
  showCompanySelect = true,
  className = "",
}: DashboardHeaderProps) {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(
    companyService.getSelectedCompany()
  );
  const [selectedBranch, setSelectedBranch] = useState<string | null>(
    companyService.getSelectedBranch()
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check authentication on mount
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
  }, [router]);

  // Fetch companies on mount
  useEffect(() => {
    if (!showCompanySelect) return;

    const fetchCompanies = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await companyService.getCompanies();
        setCompanies(data);

        // If there's a selectedCompany, load its branches
        if (selectedCompany && data.some(company => company._id === selectedCompany)) {
          loadBranches(selectedCompany);
        } else if (data.length > 0) {
          // Auto-select the first company if none is selected
          handleCompanySelect(data[0]._id);
        }
      } catch (err: any) {
        console.error('Failed to load companies:', err);
        setError(err.message || 'Failed to load companies');
        if (err.message.includes('Unauthorized')) {
          router.push('/login');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompanies();
  }, [showCompanySelect, selectedCompany, router]);

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
        onBranchSelect && onBranchSelect(storedBranch);
      } else if (data.length > 0) {
        // Auto-select the first branch if none is selected or current one doesn't belong to this company
        handleBranchSelect(data[0].code);
      } else {
        setSelectedBranch(null);
      }    } catch (err) {
      console.error('Failed to load branches:', err);
      // Show error toast or notification here if you have a toast component
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
    onBranchSelect && onBranchSelect(branchCode);
  };
  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          {description && <p className="text-gray-500 mt-1">{description}</p>}
        </div>

        {showCompanySelect && (
          <div className="flex flex-col sm:flex-row gap-4 min-w-[350px]">
            <div className="w-full">
              <Label htmlFor="company" className="mb-2 block font-semibold">
                Công ty
              </Label>
              <Select
                value={selectedCompany || ""}
                onValueChange={handleCompanySelect}
                disabled={isLoading || companies.length === 0}
              >
                <SelectTrigger id="company" className="w-full">
                  <SelectValue placeholder="Chọn công ty" />
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

            <div className="w-full">
              <Label htmlFor="branch" className="mb-2 block font-semibold">
                Chi nhánh
              </Label>
              <Select
                value={selectedBranch || ""}
                onValueChange={handleBranchSelect}
                disabled={
                  isLoading || branches.length === 0 || !selectedCompany
                }
              >
                <SelectTrigger id="branch" className="w-full">
                  <SelectValue placeholder="Chọn chi nhánh" />
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
          </div>
        )}
      </div>
    </div>
  );
}
