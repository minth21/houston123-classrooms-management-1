import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

const ERP_API_URL = "https://erp.houston123.edu.vn";

export async function GET(request: NextRequest) {  try {
    // Get the token from cookies
    const token = request.cookies.get("token")?.value;
    
    console.log("Staff me API - Token from cookies:", token ? "Present" : "Missing");
    console.log("Staff me API - All cookies:", request.cookies.getAll().map(c => c.name));
    
    if (!token) {
      return NextResponse.json(
        { error: "No authentication token found" },
        { status: 401 }
      );
    }    console.log("Fetching staff info from ERP API...");
    console.log("Token being sent:", token ? `${token.substring(0, 20)}...` : "No token");    // Get additional headers from the request
    const xCompany = request.headers.get("x-company");
    const xBranch = request.headers.get("x-branch");
    
    // Forward the request to the ERP API with multiple auth approaches
    const authHeaders = {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      // Try additional headers that might be required
      "X-Auth-Token": token,
      "x-access-token": token,
      ...(xCompany && { "x-company": xCompany }),
      ...(xBranch && { "x-branch": xBranch }),
    };
    
    console.log("Auth headers:", Object.keys(authHeaders));
    console.log("x-company:", xCompany);
    console.log("x-branch:", xBranch);
    
    const response = await axios.get(`${ERP_API_URL}/api/user/staff/me`, {
      headers: authHeaders,
      validateStatus: (status) => status >= 200 && status < 500,
    });

    console.log("ERP API Response:", {
      status: response.status,
      hasData: !!response.data,
      responseData: response.data // Log the actual response for debugging
    });

    if (response.status === 200) {
      return NextResponse.json(response.data, { status: 200 });
    } else {
      return NextResponse.json(
        { error: "Failed to fetch staff info", details: response.data },
        { status: response.status }
      );
    }
  } catch (error: any) {
    console.error("Staff info fetch error:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    
    return NextResponse.json(
      { 
        error: "Failed to fetch staff info",
        details: error.response?.data || error.message 
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
