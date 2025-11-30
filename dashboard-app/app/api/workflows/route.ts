import { NextResponse } from 'next/server';
import { getWorkflowRuns } from '@/lib/github';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Check if GitHub token is configured
    if (!process.env.GITHUB_TOKEN) {
      return NextResponse.json(
        { error: 'GITHUB_TOKEN environment variable is not set' },
        { status: 500 }
      );
    }

    const workflows = await getWorkflowRuns();
    return NextResponse.json(workflows);
  } catch (error) {
    console.error('Error fetching workflows:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workflows', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

