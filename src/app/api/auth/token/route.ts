import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

const ERP_API_URL = "https://erp.houston123.edu.vn";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("Forwarding auth request to ERP API...");
    console.log("Request body:", body); // Forward the request to the ERP API
    const response = await axios.post(
      `${ERP_API_URL}/api/authorization/getToken`,
      body,
      {
        headers: {
          "Content-Type": "application/json",
        },
        validateStatus: (status) => status >= 200 && status < 500,
      }
    );

    console.log("ERP API Response:", {
      status: response.status,
      headers: Object.keys(response.headers),
      hasData: !!response.data,
      data: response.data,
    });

    // Get the token from the response
    const token =
      response.headers["authorization"] ||
      response.headers["x-auth-token"] ||
      (response.data && (response.data.token || response.data.accessToken));

    if (!token && response.status !== 204) {
      console.error("No token found in response:", {
        status: response.status,
        headers: response.headers,
        data: response.data,
      });
      return NextResponse.json(
        { error: "No token received from authentication server" },
        { status: 401 }
      );
    }

    // For 204 responses (No Content), the token might be in headers
    if (response.status === 204) {
      if (token) {
        const cleanToken = token.replace("Bearer ", "");
        const res = NextResponse.json(
          { success: true, token: cleanToken },
          { status: 200 }
        );

        // Set the token in an HTTP-only cookie
        res.cookies.set("token", cleanToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
        });

        return res;
      } else {
        return NextResponse.json(
          { error: "Authentication successful but no token provided" },
          { status: 401 }
        );
      }
    }

    // For other successful responses
    const cleanToken = token.replace("Bearer ", "");
    const res = NextResponse.json(
      { success: true, token: cleanToken, data: response.data },
      { status: 200 }
    );

    // Set the token in an HTTP-only cookie
    res.cookies.set("token", cleanToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return res;
  } catch (error: any) {
    console.error("Authentication error:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      url: error.config?.url,
    });

    return NextResponse.json(
      {
        error: "Authentication failed",
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
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}
