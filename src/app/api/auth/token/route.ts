import { NextResponse } from 'next/server';
import axios from 'axios';

/**
 * API route that proxies requests to the Houston123 API
 * This helps bypass CORS issues by making the request server-side
 */
export async function POST(request: Request) {
  try {
    // Get the request body as JSON
    const body = await request.json();
    
    // Forward the request to the actual API with all headers
    const response = await axios.post(
      'https://erp.houston123.edu.vn/api/authorization/getToken',
      body,
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        validateStatus: (status) => status >= 200 && status < 500,
      }
    );

    // Extract the token from the response if available
    let token = null;
    if (response.headers['authorization']) {
      token = response.headers['authorization'];
    } else if (response.headers['x-auth-token']) {
      token = response.headers['x-auth-token'];
    } else if (response.data && response.data.token) {
      token = response.data.token;
    }

    // Handle 204 No Content responses specially
    if (response.status === 204) {
      const headers = new Headers();
      // If we found a token, include it in the response headers
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
        headers.set('X-Auth-Token', token);
      }
      headers.set('Content-Type', 'application/json');
      
      return new Response(null, { 
        status: 204,
        headers: headers
      });
    }

    // For other responses, create a response with the same status and data
    const headers = new Headers();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
      headers.set('X-Auth-Token', token);
    }
    headers.set('Content-Type', 'application/json');

    return new NextResponse(
      JSON.stringify(response.data),
      {
        status: response.status,
        headers: headers,
      }
    );
  } catch (error: any) {
    console.error('API proxy error:', error);
    console.error('Details:', error.response?.data || error.message);
    
    // Handle 204 No Content responses in error cases too
    if (error.response?.status === 204) {
      return new Response(null, { status: 204 });
    }
    
    // Forward the error response exactly as received
    if (error.response) {
      return new NextResponse(
        JSON.stringify(error.response.data || {}),
        {
          status: error.response.status,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }
    
    return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
  }
}
