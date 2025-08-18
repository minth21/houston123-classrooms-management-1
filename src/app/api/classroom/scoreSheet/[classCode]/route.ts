import { NextRequest, NextResponse } from 'next/server';

const ERP_API_URL = 'https://erp.houston123.edu.vn';

export async function POST(request: NextRequest, { params }: { params: Promise<{ classCode: string }> }) {
  try {
    const { classCode } = await params;
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'No authentication token found' }, { status: 401 });
    }
    const xCompany = request.headers.get('x-company');
    const xBranch = request.headers.get('x-branch');

    const formData = await request.formData();

    const erpUrl = `${ERP_API_URL}/api/classroom/scoreSheet/${classCode}`;
    const headers: Record<string,string> = { Authorization: `Bearer ${token}` };
    if (xCompany) headers['x-company'] = xCompany;
    if (xBranch) headers['x-branch'] = xBranch;

    const erpResp = await fetch(erpUrl, {
      method: 'POST',
      headers,
      body: formData,
    });

    const rawText = await erpResp.text();
    let data: any = rawText;
    try { data = JSON.parse(rawText); } catch { /* leave as text */ }

    if (erpResp.ok) {
      return NextResponse.json(data, { status: erpResp.status });
    }
    return NextResponse.json({ error: 'Failed to update score sheet', details: data }, { status: erpResp.status });
  } catch (error: any) {
    console.error('Score sheet POST error', { message: error.message, stack: error.stack });
    return NextResponse.json({ error: 'Failed to update score sheet', details: error.message }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ classCode: string }> }) {
  try {
    const { classCode } = await params;
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'No authentication token found' }, { status: 401 });
    }
    const xCompany = request.headers.get('x-company');
    const xBranch = request.headers.get('x-branch');

    const formData = await request.formData();
    const erpUrl = `${ERP_API_URL}/api/classroom/scoreSheet/${classCode}`;
    const headers: Record<string,string> = { Authorization: `Bearer ${token}` };
    if (xCompany) headers['x-company'] = xCompany;
    if (xBranch) headers['x-branch'] = xBranch;

    const erpResp = await fetch(erpUrl, { method: 'PUT', headers, body: formData });
    const rawText = await erpResp.text();
    let data: any = rawText;
    try { data = JSON.parse(rawText); } catch { /* ignore */ }
    if (erpResp.ok) {
      return NextResponse.json(data, { status: erpResp.status });
    }
    return NextResponse.json({ error: 'Failed to update score sheet (PUT)', details: data }, { status: erpResp.status });
  } catch (error: any) {
    console.error('Score sheet PUT error', { message: error.message, stack: error.stack });
    return NextResponse.json({ error: 'Failed to update score sheet', details: error.message }, { status: 500 });
  }
}
