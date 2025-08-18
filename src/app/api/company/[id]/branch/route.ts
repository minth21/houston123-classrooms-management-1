import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

const ERP_API_URL = "https://erp.houston123.edu.vn";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params in Next.js 15+
    const { id } = await params;

    // Get the token from cookies
    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "No authentication token found" },
        { status: 401 }
      );
    } // Get additional headers from the request
    const xCompany = request.headers.get("x-company");
    const xBranch = request.headers.get("x-branch");

    console.log(`Fetching branches for company ${id} from ERP API...`);

    // Forward the request to the ERP API
    const response = await axios.get(
      `${ERP_API_URL}/api/company/${id}/branch`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          ...(xCompany && { "x-company": xCompany }),
          ...(xBranch && { "x-branch": xBranch }),
        },
        validateStatus: (status) => status >= 200 && status < 500,
      }
    );

    if (response.status === 200) {
      return NextResponse.json(response.data, { status: 200 });
    } else {
      return NextResponse.json(
        { error: "Failed to fetch company branches", details: response.data },
        { status: response.status }
      );
    }
  } catch (error: any) {
    console.error("Company branches fetch error:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });

    return NextResponse.json(
      {
        error: "Failed to fetch company branches",
        details: error.response?.data || error.message,
      },
      { status: error.response?.status || 500 }
    );
  }
}

// Handle OPTIONS request for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}
