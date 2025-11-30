import { NextResponse } from 'next/server';
import { triggerWorkflow } from '@/lib/github';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    if (!process.env.GITHUB_TOKEN) {
      return NextResponse.json(
        { error: 'GITHUB_TOKEN environment variable is not set' },
        { status: 500 }
      );
    }

    const result = await triggerWorkflow();
    
    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(result, { status: 500 });
    }
  } catch (error) {
    console.error('Error triggering workflow:', error);
    return NextResponse.json(
      { 
        success: false,
        message: error instanceof Error ? error.message : 'Failed to trigger workflow' 
      },
      { status: 500 }
    );
  }
}

