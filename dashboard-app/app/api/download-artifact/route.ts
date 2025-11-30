import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const artifactId = searchParams.get('artifactId');

    if (!artifactId) {
      return NextResponse.json(
        { error: 'artifactId parameter is required' },
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

    const owner = process.env.GITHUB_OWNER || 'eliaguilar';
    const repo = process.env.GITHUB_REPO || 'PNNCLE-Automation-Testing';

    // Use GitHub API to get the download URL
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/actions/artifacts/${artifactId}/zip`,
      {
        headers: {
          'Authorization': `token ${process.env.GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`);
    }

    // Return the zip file
    const blob = await response.blob();
    return new NextResponse(blob, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="artifact-${artifactId}.zip"`,
      },
    });
  } catch (error) {
    console.error('Error downloading artifact:', error);
    return NextResponse.json(
      { error: 'Failed to download artifact', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

