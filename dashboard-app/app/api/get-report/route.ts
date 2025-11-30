import { NextRequest, NextResponse } from 'next/server';
import { getArtifactsForRun } from '@/lib/github';
import { extractHtmlFromZip } from '@/lib/extractReport';
import { parsePlaywrightHtml } from '@/lib/parsePlaywrightReport';

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

    if (!process.env.GITHUB_TOKEN) {
      return NextResponse.json(
        { error: 'GITHUB_TOKEN environment variable is not set' },
        { status: 500 }
      );
    }

    let artifacts;
    try {
      artifacts = await getArtifactsForRun(parseInt(runId));
    } catch (artifactsError) {
      console.error('Error fetching artifacts:', artifactsError);
      return NextResponse.json(
        { 
          error: 'Failed to fetch artifacts', 
          details: artifactsError instanceof Error ? artifactsError.message : 'Unknown error' 
        },
        { status: 500 }
      );
    }
    
    // Find the full test report artifact - check multiple possible names
    const reportArtifact = artifacts.find(a => 
      a.name.includes('full-test-report') ||
      a.name.includes('full-report') || 
      a.name.includes('test-reports') ||
      a.name.includes('report') ||
      a.name.includes('test-results')
    );

    if (!reportArtifact) {
      return NextResponse.json(
        { 
          error: 'Test report artifact not found',
          availableArtifacts: artifacts.map(a => ({ name: a.name, expired: a.expired }))
        },
        { status: 404 }
      );
    }

    if (reportArtifact.expired) {
      return NextResponse.json(
        { error: 'Test report artifact has expired' },
        { status: 410 }
      );
    }

    // Download the artifact
    const owner = process.env.GITHUB_OWNER || 'eliaguilar';
    const repo = process.env.GITHUB_REPO || 'PNNCLE-Automation-Testing';
    
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/actions/artifacts/${reportArtifact.id}/zip`,
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

    // Extract HTML from ZIP
    try {
      const zipBlob = await response.blob();
      const html = await extractHtmlFromZip(zipBlob);
      
      if (!html) {
        return NextResponse.json(
          { error: 'Could not extract HTML from artifact. Artifact may be empty or in an unexpected format.' },
          { status: 500 }
        );
      }

          // Parse the HTML report (Playwright format)
          const parsed = parsePlaywrightHtml(html);
      
      return NextResponse.json(parsed);
    } catch (extractError) {
      console.error('Error extracting/parsing report:', extractError);
      return NextResponse.json(
        { 
          error: 'Failed to extract or parse report', 
          details: extractError instanceof Error ? extractError.message : 'Unknown error',
          stack: extractError instanceof Error ? extractError.stack : undefined
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error fetching report:', error);
    return NextResponse.json(
      { error: 'Failed to fetch report', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

