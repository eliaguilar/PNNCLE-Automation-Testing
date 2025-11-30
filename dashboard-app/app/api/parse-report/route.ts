import { NextRequest, NextResponse } from 'next/server';
import { parsePytestHtml } from '@/lib/parseReport';

export async function POST(request: NextRequest) {
  try {
    const { html } = await request.json();
    
    if (!html) {
      return NextResponse.json(
        { error: 'HTML content is required' },
        { status: 400 }
      );
    }
    
    const parsed = parsePytestHtml(html);
    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Error parsing report:', error);
    return NextResponse.json(
      { error: 'Failed to parse report', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

