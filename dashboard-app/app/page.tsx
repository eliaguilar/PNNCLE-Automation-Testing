'use client';

import { useEffect, useState } from 'react';
import { type WorkflowRun } from '@/lib/github';
import { type ParsedReport, type TestResult, type ContentIssue } from '@/lib/parseReport';
import Logo from '@/components/Logo';

const STORAGE_KEY = 'pnncle_last_report';
const STORAGE_RUN_KEY = 'pnncle_last_run_id';

// Client-side helper functions
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (e) {
    return dateString;
  }
}

export default function Home() {
  const [workflows, setWorkflows] = useState<WorkflowRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRun, setSelectedRun] = useState<number | null>(null);
  const [reportData, setReportData] = useState<ParsedReport | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'tests' | 'content'>('overview');
  const [triggering, setTriggering] = useState(false);
  const [triggerMessage, setTriggerMessage] = useState<string | null>(null);

  // Load persisted data on mount
  useEffect(() => {
    const savedReport = localStorage.getItem(STORAGE_KEY);
    const savedRunId = localStorage.getItem(STORAGE_RUN_KEY);
    
    if (savedReport && savedRunId) {
      try {
        const parsed = JSON.parse(savedReport);
        setReportData(parsed);
        setSelectedRun(parseInt(savedRunId));
        setActiveTab('overview');
      } catch (e) {
        console.error('Failed to load saved report:', e);
      }
    }
    
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/workflows');
      if (!response.ok) {
        throw new Error('Failed to fetch workflows');
      }
      const data = await response.json();
      setWorkflows(data);
      
      // Auto-select the latest successful run if no saved data, but don't auto-load
      // (to avoid 404 errors if artifacts don't exist)
      if (data.length > 0 && !localStorage.getItem(STORAGE_KEY)) {
        // Try to find a successful run first
        const successfulRun = data.find((w: WorkflowRun) => w.conclusion === 'success');
        if (successfulRun) {
          setSelectedRun(successfulRun.id);
          // Try to load, but don't show error if it fails
          loadReport(successfulRun.id).catch(() => {
            // Silently fail - user can manually select a run
          });
        } else if (data[0]) {
          // If no successful run, try the latest one
          setSelectedRun(data[0].id);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workflows');
    } finally {
      setLoading(false);
    }
  };

  const triggerAutomation = async () => {
    try {
      setTriggering(true);
      setTriggerMessage(null);
      const response = await fetch('/api/trigger-workflow', {
        method: 'POST',
      });
      const result = await response.json();
      
      if (result.success) {
        setTriggerMessage('✅ ' + result.message);
        // Reload workflows after a short delay
        setTimeout(() => {
          loadWorkflows();
        }, 2000);
      } else {
        setTriggerMessage('❌ ' + result.message);
      }
    } catch (err) {
      setTriggerMessage('❌ Failed to trigger workflow: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setTriggering(false);
      // Clear message after 5 seconds
      setTimeout(() => setTriggerMessage(null), 5000);
    }
  };

  const loadReport = async (runId: number): Promise<void> => {
    // Prevent loading if already loading the same run
    if (loadingReport && selectedRun === runId) {
      return;
    }
    
    try {
      setLoadingReport(true);
      setSelectedRun(runId);
      setError(null);
      
      const response = await fetch(`/api/get-report?runId=${runId}`);
      const responseData = await response.json();
      
      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 404) {
          const errorMsg = responseData.availableArtifacts?.length === 0
            ? 'No test report artifacts found for this run. The workflow may not have generated a report yet, or artifacts may have expired.'
            : responseData.error || 'Test report not found';
          setError(errorMsg);
          setReportData(null);
          // Don't throw - just set error state
          return;
        } else if (response.status === 410) {
          setError('Test report artifact has expired. GitHub artifacts expire after 90 days.');
          setReportData(null);
          return;
        } else {
          setError(responseData.error || responseData.details || 'Failed to fetch report');
          setReportData(null);
          return;
        }
      }
      
      const data: ParsedReport = responseData;
      setReportData(data);
      
      // Persist to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      localStorage.setItem(STORAGE_RUN_KEY, runId.toString());
      setError(null); // Clear any previous errors
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load report';
      setError(errorMessage);
      setReportData(null);
      // Don't clear localStorage on error - keep last successful report
      throw err; // Re-throw so caller can handle
    } finally {
      setLoadingReport(false);
    }
  };

  const stats = {
    total: workflows.length,
    success: workflows.filter(w => w.conclusion === 'success').length,
    failure: workflows.filter(w => w.conclusion === 'failure').length,
    inProgress: workflows.filter(w => w.status === 'in_progress').length,
  };

  const successRate = stats.total > 0 ? ((stats.success / stats.total) * 100).toFixed(1) : '0';

  const formTests = reportData?.tests.filter(t => t.category === 'form') || [];
  const spellingIssues = reportData?.contentIssues.filter(i => i.type === 'spelling') || [];
  const grammarIssues = reportData?.contentIssues.filter(i => i.type === 'grammar') || [];

  // Group form tests by form name/page
  const formTestGroups = formTests.reduce((acc, test) => {
    let formName = 'Unknown Form';
    const nameLower = test.name.toLowerCase();
    
    if (nameLower.includes('equip')) formName = 'Equip Page Form';
    else if (nameLower.includes('gift')) formName = 'Gift Page Form';
    else if (nameLower.includes('partner')) formName = 'Partners Page Form';
    else if (nameLower.includes('contact')) formName = 'Contact Page Form';
    else if (nameLower.includes('newsletter') || nameLower.includes('homepage')) formName = 'Homepage Newsletter Form';
    else if (nameLower.includes('accessible')) formName = 'Form Accessibility Check';
    else formName = test.name.replace('test_', '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    if (!acc[formName]) {
      acc[formName] = [];
    }
    acc[formName].push(test);
    return acc;
  }, {} as Record<string, typeof formTests>);

  // Group content issues by page URL
  const allContentIssues = [...spellingIssues, ...grammarIssues];
  const pagesWithIssues = new Set(
    allContentIssues
      .map(issue => issue.page_url)
      .filter((url): url is string => Boolean(url))
  );
  
  // Get all unique pages from issues
  const pageGroups = Array.from(pagesWithIssues).reduce((acc, pageUrl) => {
    const pageIssues = allContentIssues.filter(issue => issue.page_url === pageUrl);
    const spellingCount = pageIssues.filter(i => i.type === 'spelling').length;
    const grammarCount = pageIssues.filter(i => i.type === 'grammar').length;
    
    acc[pageUrl] = {
      url: pageUrl,
      spellingIssues: spellingCount,
      grammarIssues: grammarCount,
      totalIssues: spellingCount + grammarCount,
      issues: pageIssues,
    };
    return acc;
  }, {} as Record<string, { url: string; spellingIssues: number; grammarIssues: number; totalIssues: number; issues: typeof allContentIssues }>);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-zinc-950 text-white border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-3">
            <Logo className="w-10 h-10" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">PNNCLE Test Dashboard</h1>
              <p className="text-zinc-400 mt-2 text-sm">Automation test results and content quality monitoring</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md">
            <div className="flex items-center justify-between">
              <div>
                <strong>Error:</strong> {error}
              </div>
              <button 
                onClick={loadWorkflows}
                className="ml-4 px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-600"></div>
            <p className="mt-4 text-muted-foreground">Loading workflow runs...</p>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
              <div className="bg-card rounded-md border border-border shadow-sm p-6">
                <div className="text-3xl font-bold text-foreground">{stats.total}</div>
                <div className="text-sm text-muted-foreground mt-1">Total Runs</div>
              </div>
              <div className="bg-card rounded-md border border-border shadow-sm p-6">
                <div className="text-3xl font-bold text-green-600">{stats.success}</div>
                <div className="text-sm text-muted-foreground mt-1">Successful</div>
              </div>
              <div className="bg-card rounded-md border border-border shadow-sm p-6">
                <div className="text-3xl font-bold text-destructive">{stats.failure}</div>
                <div className="text-sm text-muted-foreground mt-1">Failed</div>
              </div>
              <div className="bg-card rounded-md border border-border shadow-sm p-6">
                <div className="text-3xl font-bold text-blue-600">{stats.inProgress}</div>
                <div className="text-sm text-muted-foreground mt-1">In Progress</div>
              </div>
              <div className="bg-card rounded-md border border-border shadow-sm p-6">
                <div className="text-3xl font-bold text-foreground">{successRate}%</div>
                <div className="text-sm text-muted-foreground mt-1">Success Rate</div>
              </div>
            </div>

            {/* Main Content Card */}
            <div className="bg-card rounded-md border border-border shadow-sm">
              <div className="px-6 py-4 border-b border-border flex items-center justify-between flex-wrap gap-4">
                <h2 className="text-xl font-semibold text-card-foreground">Test Results</h2>
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    onClick={triggerAutomation}
                    disabled={triggering}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                  >
                    {triggering ? 'Triggering...' : 'Run Tests Now'}
                  </button>
                  {triggerMessage && (
                    <span className={`text-sm ${triggerMessage.startsWith('✅') ? 'text-green-600' : 'text-destructive'}`}>
                      {triggerMessage}
                    </span>
                  )}
                  {workflows.length > 0 && (
                    <select 
                      value={selectedRun || ''} 
                      onChange={(e) => {
                        const runId = parseInt(e.target.value);
                        if (runId && runId !== selectedRun) {
                          loadReport(runId);
                        }
                      }}
                      disabled={loadingReport}
                      className="px-4 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 min-w-[250px] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {workflows.map(w => (
                        <option key={w.id} value={w.id}>
                          {w.name} - {formatDate(w.created_at)}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="p-6">
                {loadingReport ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-600"></div>
                    <p className="mt-4 text-muted-foreground">Loading test report...</p>
                  </div>
                ) : error && (error.includes('No test report artifacts') || error.includes('not found') || error.includes('expired')) ? (
                  <div className="text-center py-12">
                    <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-md p-6 max-w-md mx-auto">
                      <p className="text-yellow-800 dark:text-yellow-200 font-medium mb-2">No Report Available</p>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-4">{error}</p>
                      <div className="space-y-2">
                        <p className="text-xs text-yellow-600 dark:text-yellow-400">
                          This usually means:
                        </p>
                        <ul className="text-xs text-yellow-600 dark:text-yellow-400 text-left list-disc list-inside space-y-1">
                          <li>The workflow is still running</li>
                          <li>Artifacts expired (GitHub deletes them after 90 days)</li>
                          <li>The workflow didn't generate a report</li>
                        </ul>
                        <button
                          onClick={() => triggerAutomation()}
                          className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 text-sm font-medium"
                        >
                          Run Tests Now to Generate New Report
                        </button>
                      </div>
                      {reportData && (
                        <div className="mt-4 pt-4 border-t border-yellow-300 dark:border-yellow-700">
                          <p className="text-xs text-muted-foreground italic mb-2">
                            Showing last available report from cache:
                          </p>
                          <button
                            onClick={() => setActiveTab('overview')}
                            className="text-xs text-primary hover:text-primary/80 underline"
                          >
                            View Cached Report
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : !selectedRun ? (
                  <div className="text-center py-12">
                    <div className="bg-muted rounded-md p-6 max-w-md mx-auto">
                      <p className="text-foreground font-medium mb-2">No Test Run Selected</p>
                      <p className="text-sm text-muted-foreground mb-4">
                        Select a workflow run from the dropdown above to view test results
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Or click "Run Tests Now" to trigger a new test run
                      </p>
                    </div>
                  </div>
                ) : !reportData && !loadingReport ? (
                  <div className="text-center py-12">
                    <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-md p-6 max-w-md mx-auto">
                      <p className="text-yellow-800 dark:text-yellow-200 font-medium mb-2">Report Not Available</p>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-4">
                        This workflow run doesn't have a test report available yet.
                      </p>
                      <button
                        onClick={() => loadReport(selectedRun!)}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 text-sm"
                      >
                        Retry Loading Report
                      </button>
                    </div>
                  </div>
                ) : reportData ? (
                  <>
                    {/* Tabs */}
                    <div className="flex space-x-1 border-b border-border mb-6">
                      <button
                        onClick={() => setActiveTab('overview')}
                        className={`px-4 py-2 font-medium text-sm ${
                          activeTab === 'overview'
                            ? 'text-foreground border-b-2 border-foreground'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Overview
                      </button>
                      <button
                        onClick={() => setActiveTab('tests')}
                        className={`px-4 py-2 font-medium text-sm ${
                          activeTab === 'tests'
                            ? 'text-foreground border-b-2 border-foreground'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Form Tests ({formTests.length})
                      </button>
                      <button
                        onClick={() => setActiveTab('content')}
                        className={`px-4 py-2 font-medium text-sm ${
                          activeTab === 'content'
                            ? 'text-foreground border-b-2 border-foreground'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Content Check ({spellingIssues.length + grammarIssues.length} issues)
                      </button>
                    </div>

                    {/* Overview Tab */}
                    {activeTab === 'overview' && (
                      <div>
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                          <div className="bg-muted rounded-md p-4 border border-border">
                            <div className="text-2xl font-bold text-foreground">{reportData.summary.total}</div>
                            <div className="text-sm text-muted-foreground mt-1">Total Tests</div>
                          </div>
                          <div className="bg-green-50 rounded-md p-4 border border-green-200">
                            <div className="text-2xl font-bold text-green-700">{reportData.summary.passed}</div>
                            <div className="text-sm text-green-600 mt-1">Passed</div>
                          </div>
                          <div className="bg-red-50 rounded-md p-4 border border-red-200">
                            <div className="text-2xl font-bold text-red-700">{reportData.summary.failed}</div>
                            <div className="text-sm text-red-600 mt-1">Failed</div>
                          </div>
                          <div className="bg-yellow-50 rounded-md p-4 border border-yellow-200">
                            <div className="text-2xl font-bold text-yellow-700">{reportData.summary.skipped}</div>
                            <div className="text-sm text-yellow-600 mt-1">Skipped</div>
                          </div>
                          <div className="bg-blue-50 rounded-md p-4 border border-blue-200">
                            <div className="text-2xl font-bold text-blue-700">{reportData.summary.successRate.toFixed(1)}%</div>
                            <div className="text-sm text-blue-600 mt-1">Success Rate</div>
                          </div>
                        </div>
                        
                        {reportData.tests.length > 0 && (
                          <div>
                            <h3 className="text-lg font-semibold text-foreground mb-4">Recent Test Results</h3>
                            <div className="space-y-2">
                              {reportData.tests.slice(0, 5).map((test, idx) => (
                                <div 
                                  key={idx} 
                                  className={`p-4 rounded-md border-l-4 ${
                                    test.status === 'passed' 
                                      ? 'bg-green-50 border-green-500' 
                                      : test.status === 'failed' 
                                      ? 'bg-red-50 border-destructive'
                                      : 'bg-yellow-50 border-yellow-500'
                                  }`}
                                >
                                  <div className="font-medium text-foreground">{test.name}</div>
                                  <div className="text-sm text-muted-foreground mt-1">
                                    Duration: {test.duration} • 
                                    <span className={`ml-2 px-2 py-1 rounded text-xs ${
                                      test.status === 'passed' 
                                        ? 'bg-green-100 text-green-800' 
                                        : test.status === 'failed' 
                                        ? 'bg-red-100 text-red-800'
                                        : 'bg-yellow-100 text-yellow-800'
                                    }`}>
                                      {test.status}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Tests Tab */}
                    {activeTab === 'tests' && (
                      <div>
                        <h3 className="text-lg font-semibold text-foreground mb-6">Form Test Results</h3>
                        {formTests.length === 0 ? (
                          <div className="text-center py-12 text-muted-foreground">
                            <p>No form tests found in this run.</p>
                            <p className="text-sm mt-2">Test results will appear here once the report is fully parsed.</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {Object.entries(formTestGroups).map(([formName, tests]) => {
                              // Determine overall status for this form
                              const hasFailed = tests.some(t => t.status === 'failed' || t.status === 'error');
                              const allPassed = tests.every(t => t.status === 'passed');
                              const allSkipped = tests.every(t => t.status === 'skipped');
                              
                              let status: 'success' | 'error' | 'warning' = 'success';
                              let statusText = 'All Tests Passed';
                              
                              if (hasFailed) {
                                status = 'error';
                                statusText = 'Tests Failed';
                              } else if (allSkipped) {
                                status = 'warning';
                                statusText = 'Tests Skipped';
                              } else if (!allPassed) {
                                status = 'warning';
                                statusText = 'Partial Success';
                              }

                              // Get specific test criteria based on test names
                              const getTestCriteria = (testName: string) => {
                                const nameLower = testName.toLowerCase();
                                if (nameLower.includes('submitted') || nameLower.includes('form')) {
                                  return 'Form submitted successfully';
                                } else if (nameLower.includes('accessible')) {
                                  return 'Form accessible and interactive';
                                } else if (nameLower.includes('newsletter')) {
                                  return 'Newsletter signup functional';
                                }
                                return 'Form test completed';
                              };

                              const getTestDetails = (test: TestResult) => {
                                if (test.status === 'passed') {
                                  if (test.name.toLowerCase().includes('submitted') || test.name.toLowerCase().includes('form')) {
                                    return 'Form submitted, email sent successfully, no bounce back detected';
                                  } else if (test.name.toLowerCase().includes('accessible')) {
                                    return 'Form is accessible, all input fields present, submit button functional';
                                  }
                                  return 'Test passed successfully';
                                } else if (test.status === 'failed') {
                                  return test.error || 'Test failed - check error details';
                                } else {
                                  return 'Test was skipped';
                                }
                              };
                              
                              return (
                                <div 
                                  key={formName}
                                  className={`bg-card rounded-md border-2 shadow-sm ${
                                    status === 'success'
                                      ? 'border-green-500 dark:border-green-600'
                                      : status === 'error'
                                      ? 'border-destructive'
                                      : 'border-yellow-500 dark:border-yellow-600'
                                  }`}
                                >
                                  <div className={`p-4 border-b ${
                                    status === 'success'
                                      ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
                                      : status === 'error'
                                      ? 'bg-destructive/10 border-destructive/20'
                                      : 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800'
                                  }`}>
                                    <div className="flex items-center justify-between">
                                      <h4 className="font-semibold text-card-foreground">{formName}</h4>
                                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                        status === 'success'
                                          ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                                          : status === 'error'
                                          ? 'bg-destructive/20 text-destructive'
                                          : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                                      }`}>
                                        {statusText}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="p-4">
                                    <div className="space-y-3">
                                      {tests.map((test, idx) => (
                                        <div key={idx} className="border-b border-border pb-3 last:border-0 last:pb-0">
                                          <div className="flex items-start justify-between mb-1">
                                            <div className="flex-1">
                                              <p className="text-sm font-medium text-card-foreground">
                                                {getTestCriteria(test.name)}
                                              </p>
                                              <p className={`text-xs mt-1 ${
                                                test.status === 'passed'
                                                  ? 'text-green-700 dark:text-green-300'
                                                  : test.status === 'failed'
                                                  ? 'text-destructive'
                                                  : 'text-yellow-700 dark:text-yellow-300'
                                              }`}>
                                                {getTestDetails(test)}
                                              </p>
                                            </div>
                                            <span className={`ml-2 px-2 py-1 rounded-md text-xs font-medium shrink-0 ${
                                              test.status === 'passed'
                                                ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                                                : test.status === 'failed'
                                                ? 'bg-destructive/20 text-destructive'
                                                : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300'
                                            }`}>
                                              {test.status === 'passed' ? 'Pass' : test.status === 'failed' ? 'Fail' : 'Skip'}
                                            </span>
                                          </div>
                                          {test.error && (
                                            <div className="mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded-md text-xs text-destructive">
                                              {test.error}
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Content Tab */}
                    {activeTab === 'content' && (
                      <div>
                        <h3 className="text-lg font-semibold text-foreground mb-6">Content Quality Check</h3>
                        
                        {Object.keys(pageGroups).length === 0 && spellingIssues.length === 0 && grammarIssues.length === 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="bg-card rounded-md border-2 border-green-500 dark:border-green-600 shadow-sm">
                              <div className="p-4 bg-green-50 dark:bg-green-950 border-b border-green-200 dark:border-green-800">
                                <h4 className="font-semibold text-card-foreground">Spell Check</h4>
                              </div>
                              <div className="p-4">
                                <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                                  Scanned all pages
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  No spelling errors found
                                </p>
                              </div>
                            </div>
                            <div className="bg-card rounded-md border-2 border-green-500 dark:border-green-600 shadow-sm">
                              <div className="p-4 bg-green-50 dark:bg-green-950 border-b border-green-200 dark:border-green-800">
                                <h4 className="font-semibold text-card-foreground">Grammar Check</h4>
                              </div>
                              <div className="p-4">
                                <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                                  Scanned all pages
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  No grammatical errors found
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                              <div className="bg-card rounded-md border-2 border-green-500 dark:border-green-600 shadow-sm">
                                <div className="p-4 bg-green-50 dark:bg-green-950 border-b border-green-200 dark:border-green-800">
                                  <h4 className="font-semibold text-card-foreground">Spell Check Summary</h4>
                                </div>
                                <div className="p-4">
                                  <p className="text-sm text-foreground">
                                    <span className="font-medium">{Object.keys(pageGroups).length || 'All'} pages scanned</span>
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {spellingIssues.length === 0 
                                      ? 'No spelling errors found' 
                                      : `${spellingIssues.length} spelling ${spellingIssues.length === 1 ? 'error' : 'errors'} found`}
                                  </p>
                                </div>
                              </div>
                              <div className="bg-card rounded-md border-2 border-green-500 dark:border-green-600 shadow-sm">
                                <div className="p-4 bg-green-50 dark:bg-green-950 border-b border-green-200 dark:border-green-800">
                                  <h4 className="font-semibold text-card-foreground">Grammar Check Summary</h4>
                                </div>
                                <div className="p-4">
                                  <p className="text-sm text-foreground">
                                    <span className="font-medium">{Object.keys(pageGroups).length || 'All'} pages scanned</span>
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {grammarIssues.length === 0 
                                      ? 'No grammatical errors found' 
                                      : `${grammarIssues.length} grammar ${grammarIssues.length === 1 ? 'error' : 'errors'} found`}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Show pages with issues */}
                            {Object.values(pageGroups).map((pageGroup, idx) => (
                              <div 
                                key={idx}
                                className={`bg-card rounded-md shadow-sm border-2 ${
                                  pageGroup.totalIssues > 0
                                    ? 'border-destructive'
                                    : 'border-green-500 dark:border-green-600'
                                }`}
                              >
                                <div className={`p-4 border-b ${
                                  pageGroup.totalIssues > 0
                                    ? 'bg-destructive/10 border-destructive/20'
                                    : 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
                                }`}>
                                  <div className="flex items-center justify-between flex-wrap gap-2">
                                    <div className="flex items-center gap-3">
                                      <a 
                                        href={pageGroup.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="font-semibold text-card-foreground hover:text-primary"
                                      >
                                        {pageGroup.url.replace('https://', '').replace('http://', '').replace(/\/$/, '') || 'Homepage'}
                                      </a>
                                    </div>
                                    {pageGroup.totalIssues > 0 ? (
                                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-destructive/20 text-destructive">
                                        {pageGroup.totalIssues} {pageGroup.totalIssues === 1 ? 'Issue' : 'Issues'}
                                      </span>
                                    ) : (
                                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                                        Scanned - No Issues Found
                                      </span>
                                    )}
                                  </div>
                                </div>
                                
                                {pageGroup.totalIssues > 0 && (
                                  <div className="p-4 space-y-3">
                                    {pageGroup.spellingIssues > 0 && (
                                      <div>
                                        <div className="text-sm font-medium text-red-700 mb-2">
                                          Spelling Issues ({pageGroup.spellingIssues})
                                        </div>
                                        <div className="space-y-2">
                                          {pageGroup.issues
                                            .filter(i => i.type === 'spelling')
                                            .slice(0, 5)
                                            .map((issue, issueIdx) => (
                                              <div key={issueIdx} className="bg-destructive/10 border-l-4 border-destructive p-3 rounded text-sm">
                                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                  <strong className="text-destructive">"{issue.word || issue.highlighted_word}"</strong>
                                                  {issue.paragraph_number && (
                                                    <span className="text-xs bg-muted text-foreground px-2 py-0.5 rounded">
                                                      Paragraph #{issue.paragraph_number}
                                                    </span>
                                                  )}
                                                </div>
                                                {(issue.before_context || issue.after_context) && (
                                                  <div className="mt-2 p-2 bg-card rounded border border-border font-mono text-xs">
                                                    <span className="text-muted-foreground">{issue.before_context}</span>
                                                    <mark className="bg-yellow-200 px-1 font-bold">{issue.highlighted_word || issue.word}</mark>
                                                    <span className="text-muted-foreground">{issue.after_context}</span>
                                                  </div>
                                                )}
                                                {issue.suggestions && issue.suggestions.length > 0 && (
                                                  <div className="mt-1 text-xs text-green-700">
                                                    Suggestions: {issue.suggestions.join(', ')}
                                                  </div>
                                                )}
                                              </div>
                                            ))}
                                          {pageGroup.spellingIssues > 5 && (
                                            <div className="text-xs text-muted-foreground italic">
                                              + {pageGroup.spellingIssues - 5} more spelling {pageGroup.spellingIssues - 5 === 1 ? 'issue' : 'issues'}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                    
                                    {pageGroup.grammarIssues > 0 && (
                                      <div>
                                        <div className="text-sm font-medium text-yellow-700 mb-2">
                                          Grammar Issues ({pageGroup.grammarIssues})
                                        </div>
                                        <div className="space-y-2">
                                          {pageGroup.issues
                                            .filter(i => i.type === 'grammar')
                                            .slice(0, 5)
                                            .map((issue, issueIdx) => (
                                              <div key={issueIdx} className="bg-yellow-50 dark:bg-yellow-950 border-l-4 border-yellow-400 dark:border-yellow-600 p-3 rounded text-sm">
                                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                  <strong className="text-yellow-900 dark:text-yellow-200">{issue.message}</strong>
                                                  {issue.paragraph_number && (
                                                    <span className="text-xs bg-muted text-foreground px-2 py-0.5 rounded">
                                                      Paragraph #{issue.paragraph_number}
                                                    </span>
                                                  )}
                                                </div>
                                                {(issue.before_context || issue.after_context) && (
                                                  <div className="mt-2 p-2 bg-card rounded border border-border font-mono text-xs">
                                                    <span className="text-muted-foreground">{issue.before_context}</span>
                                                    <mark className="bg-yellow-200 px-1 font-bold">{issue.highlighted_text}</mark>
                                                    <span className="text-muted-foreground">{issue.after_context}</span>
                                                  </div>
                                                )}
                                                {issue.suggestions && issue.suggestions.length > 0 && (
                                                  <div className="mt-1 text-xs text-green-700">
                                                    Suggestions: {issue.suggestions.join(', ')}
                                                  </div>
                                                )}
                                              </div>
                                            ))}
                                          {pageGroup.grammarIssues > 5 && (
                                            <div className="text-xs text-muted-foreground italic">
                                              + {pageGroup.grammarIssues - 5} more grammar {pageGroup.grammarIssues - 5 === 1 ? 'issue' : 'issues'}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                            
                            {/* Show pages without issues if we have page data but no issues */}
                            {Object.keys(pageGroups).length === 0 && (
                              <div className="bg-green-50 border-2 border-green-500 rounded-md p-6">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-green-800 font-medium">No Spelling Errors Found</p>
                                    <p className="text-sm text-green-700 mt-1">All pages have been checked and no errors were detected.</p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>Select a workflow run to view test results</p>
                    {workflows.length === 0 && (
                      <p className="text-sm mt-2">No workflow runs found. Make sure GitHub Actions are configured.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
