import { NextRequest, NextResponse } from 'next/server';
import { getArtifactsForRun } from '@/lib/github';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const runId = searchParams.get('runId');

    if (!runId) {
      return NextResponse.json(
        { error: 'runId parameter is required' },
        { status: 400 }
      );
    }

    // Check if GitHub token is configured
    if (!process.env.GITHUB_TOKEN) {
      return NextResponse.json(
        { error: 'GITHUB_TOKEN environment variable is not set' },
        { status: 500 }
      );
    }

    const artifacts = await getArtifactsForRun(parseInt(runId));
    return NextResponse.json(artifacts);
  } catch (error) {
    console.error('Error fetching artifacts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch artifacts', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

