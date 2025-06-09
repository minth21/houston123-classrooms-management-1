import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

const ERP_API_URL = "https://erp.houston123.edu.vn";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ attendanceId: string }> }
) {
  try {
    // Await params in Next.js 15+
    const { attendanceId } = await params;

    // Get the token from cookies
    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "No authentication token found" },
        { status: 401 }
      );
    }
    console.log(`Posting comment for attendance ${attendanceId} to ERP API...`);

    // Get the form data from the request
    const formData = await request.formData();

    console.log("Form data received:", {
      attendanceId,
      hasComment: formData.has("comment"),
      fileCount: Array.from(formData.keys()).filter((key) =>
        key.startsWith("file")
      ).length,
    });

    // Forward the request to the ERP API
    const response = await axios.post(
      `${ERP_API_URL}/api/classroom/attendance/${attendanceId}/comment`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
        validateStatus: (status) => status >= 200 && status < 500,
      }
    );

    console.log("ERP API Response:", {
      status: response.status,
      hasData: !!response.data,
    });

    if (response.status === 200 || response.status === 201) {
      return NextResponse.json(response.data, { status: response.status });
    } else {
      return NextResponse.json(
        { error: "Failed to post attendance comment", details: response.data },
        { status: response.status }
      );
    }
  } catch (error: any) {
    console.error("Attendance comment post error:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });

    return NextResponse.json(
      {
        error: "Failed to post attendance comment",
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
