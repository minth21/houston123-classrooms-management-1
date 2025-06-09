import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

const ERP_API_URL = "https://erp.houston123.edu.vn";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ classCode: string }> }
) {
  try {
    // Await params in Next.js 15+
    const { classCode } = await params;

    // Get the token from cookies
    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "No authentication token found" },
        { status: 401 }
      );
    }
    const xCompany = request.headers.get("x-company");
    const xBranch = request.headers.get("x-branch");

    console.log(`Posting diary for class ${classCode} to ERP API...`);
    console.log("Headers received:", {
      "x-company": xCompany,
      "x-branch": xBranch,
    });

    // Log warning if required headers are missing
    if (!xCompany) {
      console.warn(
        "WARNING: x-company header is missing. This may cause authorization issues."
      );
    }
    if (!xBranch) {
      console.warn(
        "WARNING: x-branch header is missing. This may cause authorization issues."
      );
    }    // Get the form data from the request
    const formData = await request.formData();

    console.log("Diary form data received:", {
      classCode,
      hasContent: formData.has("content"),
      fileCount: Array.from(formData.keys()).filter((key) => key !== "content")
        .length,
      allKeys: Array.from(formData.keys()),
    });

    // Log the content to debug
    const content = formData.get("content");
    console.log("Content value:", content);    // Log file information if any
    Array.from(formData.keys()).forEach(key => {
      if (key !== "content") {
        const file = formData.get(key);
        if (file instanceof File) {
          console.log(`File ${key}:`, {
            name: file.name,
            size: file.size,
            type: file.type
          });
        }
      }
    });

    console.log("About to send request to ERP API:", {
      url: `${ERP_API_URL}/api/classroom/${classCode}/diary/post`,
      hasToken: !!token,
      hasCompany: !!xCompany,
      hasBranch: !!xBranch,
    });    // Forward the request to the ERP API using fetch instead of axios
    const erpUrl = `${ERP_API_URL}/api/classroom/${classCode}/diary/post`;
    const erpHeaders: Record<string, string> = {
      Authorization: `Bearer ${token}`,
    };
    
    if (xCompany) erpHeaders["x-company"] = xCompany;
    if (xBranch) erpHeaders["x-branch"] = xBranch;

    const erpResponse = await fetch(erpUrl, {
      method: 'POST',
      headers: erpHeaders,
      body: formData, // Let fetch handle Content-Type automatically
    });

    const responseData = await erpResponse.text();
    let parsedData;
    try {
      parsedData = JSON.parse(responseData);
    } catch {
      parsedData = responseData;
    }

    const response = {
      status: erpResponse.status,
      data: parsedData,
    };console.log("ERP API Response:", {
      status: response.status,
      hasData: !!response.data,
      data: response.status >= 400 ? response.data : "Success response",
    });

    if (response.status === 200 || response.status === 201) {
      return NextResponse.json(response.data, { status: response.status });
    } else {
      console.error("ERP API returned error:", {
        status: response.status,
        data: response.data,
        missingHeaders: {
          xCompany: !xCompany,
          xBranch: !xBranch,
        },
      });

      return NextResponse.json(
        {
          error: "Failed to post diary",
          details: response.data,
          missingHeaders: {
            xCompany: !xCompany,
            xBranch: !xBranch,
          },
        },
        { status: response.status }
      );
    }  } catch (error: any) {
    console.error("Diary post error:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      url: error.config?.url,
      method: error.config?.method,
      requestHeaders: error.config?.headers ? Object.keys(error.config.headers) : [],
    });

    // If it's a 500 error, provide more specific error message
    if (error.response?.status === 500) {
      console.error("ERP API Server Error Details:", {
        errorData: error.response?.data,
        errorText: typeof error.response?.data === 'string' ? error.response.data : JSON.stringify(error.response?.data)
      });
    }

    return NextResponse.json(
      {
        error: "Failed to post diary",
        details: error.response?.data || error.message,
        statusCode: error.response?.status,
        erpApiError: error.response?.status === 500 ? "ERP API Server Error" : undefined,
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
