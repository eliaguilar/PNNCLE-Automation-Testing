'use client';

import { useEffect, useState } from 'react';
import { type WorkflowRun } from '@/lib/github';
import { type ParsedReport, type TestResult, type ContentIssue } from '@/lib/parsePlaywrightReport';
import Logo from '@/components/Logo';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Play, RefreshCw, CheckCircle2, XCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';

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

function getStatusIcon(status: string | null) {
  switch (status) {
    case 'success':
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    case 'failure':
      return <XCircle className="h-4 w-4 text-destructive" />;
    case 'in_progress':
      return <Clock className="h-4 w-4 text-blue-600 animate-spin" />;
    default:
      return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
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
      
      // Auto-select the latest successful run if no saved data
      if (data.length > 0 && !localStorage.getItem(STORAGE_KEY)) {
        const successfulRun = data.find((w: WorkflowRun) => w.conclusion === 'success');
        if (successfulRun) {
          setSelectedRun(successfulRun.id);
          loadReport(successfulRun.id).catch(() => {});
        } else if (data[0]) {
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
      setTimeout(() => setTriggerMessage(null), 5000);
    }
  };

  const loadReport = async (runId: number): Promise<void> => {
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
        if (response.status === 404) {
          const errorMsg = responseData.availableArtifacts?.length === 0
            ? 'No test report artifacts found for this run. The workflow may not have generated a report yet, or artifacts may have expired.'
            : responseData.error || 'Test report not found';
          setError(errorMsg);
          setReportData(null);
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
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      localStorage.setItem(STORAGE_RUN_KEY, runId.toString());
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load report';
      setError(errorMessage);
      setReportData(null);
      throw err;
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
      <div className="border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Logo className="w-10 h-10" />
              <div>
                <h1 className="text-3xl font-bold tracking-tight">PNNCLE Test Dashboard</h1>
                <p className="text-muted-foreground mt-1">Automation test results and content quality monitoring</p>
              </div>
            </div>
            <Button
              onClick={triggerAutomation}
              disabled={triggering}
              className="gap-2"
            >
              {triggering ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Triggering...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Run Tests Now
                </>
              )}
            </Button>
          </div>
          {triggerMessage && (
            <div className={`mt-4 p-3 rounded-md text-sm ${
              triggerMessage.startsWith('✅') 
                ? 'bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800'
                : 'bg-destructive/10 text-destructive border border-destructive/20'
            }`}>
              {triggerMessage}
            </div>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Message */}
        {error && (
          <Card className="mb-6 border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Error
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm mb-4">{error}</p>
              <Button onClick={loadWorkflows} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="ml-3 text-muted-foreground">Loading workflow runs...</p>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-5 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Runs</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.total}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Successful</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{stats.success}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Failed</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">{stats.failure}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">In Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{successRate}%</div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              {/* Workflow Runs List */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Recent Runs</CardTitle>
                  <CardDescription>Select a run to view detailed results</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[600px]">
                    <div className="space-y-2">
                      {workflows.map((workflow) => (
                        <div
                          key={workflow.id}
                          onClick={() => loadReport(workflow.id)}
                          className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                            selectedRun === workflow.id
                              ? 'bg-accent border-primary'
                              : 'hover:bg-accent/50'
                          } ${loadingReport && selectedRun === workflow.id ? 'opacity-50' : ''}`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(workflow.conclusion || workflow.status)}
                              <span className="font-medium text-sm">{workflow.name}</span>
                            </div>
                            <Badge
                              variant={
                                workflow.conclusion === 'success'
                                  ? 'default'
                                  : workflow.conclusion === 'failure'
                                  ? 'destructive'
                                  : 'secondary'
                              }
                            >
                              {workflow.conclusion || workflow.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(workflow.created_at)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Test Results */}
              <Card className="lg:col-span-5">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Test Results</CardTitle>
                      <CardDescription>
                        {reportData
                          ? `Last updated: ${formatDate(workflows.find(w => w.id === selectedRun)?.created_at || '')}`
                          : 'Select a workflow run to view results'}
                      </CardDescription>
                    </div>
                    {selectedRun && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadReport(selectedRun)}
                        disabled={loadingReport}
                      >
                        {loadingReport ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingReport ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      <p className="ml-3 text-muted-foreground">Loading report...</p>
                    </div>
                  ) : reportData ? (
                    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="tests">Form Tests</TabsTrigger>
                        <TabsTrigger value="content">Content Check</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="overview" className="space-y-4 mt-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-base">Test Summary</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-2">
                                <div className="flex justify-between">
                                  <span className="text-sm text-muted-foreground">Total Tests</span>
                                  <span className="font-medium">{reportData.summary.total}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-muted-foreground">Passed</span>
                                  <span className="font-medium text-green-600">{reportData.summary.passed}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-muted-foreground">Failed</span>
                                  <span className="font-medium text-destructive">{reportData.summary.failed}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-muted-foreground">Skipped</span>
                                  <span className="font-medium text-yellow-600">{reportData.summary.skipped}</span>
                                </div>
                                <Separator />
                                <div className="flex justify-between">
                                  <span className="text-sm font-medium">Success Rate</span>
                                  <span className="font-bold">{reportData.summary.successRate.toFixed(1)}%</span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-base">Content Quality</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-2">
                                <div className="flex justify-between">
                                  <span className="text-sm text-muted-foreground">Spelling Issues</span>
                                  <Badge variant={spellingIssues.length > 0 ? 'destructive' : 'default'}>
                                    {spellingIssues.length}
                                  </Badge>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-muted-foreground">Grammar Issues</span>
                                  <Badge variant={grammarIssues.length > 0 ? 'destructive' : 'default'}>
                                    {grammarIssues.length}
                                  </Badge>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-muted-foreground">Pages Checked</span>
                                  <span className="font-medium">{Object.keys(pageGroups).length || 'N/A'}</span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </TabsContent>

                      <TabsContent value="tests" className="space-y-4 mt-4">
                        {formTests.length === 0 ? (
                          <div className="text-center py-12 text-muted-foreground">
                            <p>No form tests found in this run.</p>
                          </div>
                        ) : (
                          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {Object.entries(formTestGroups).map(([formName, tests]) => {
                              const hasFailed = tests.some(t => t.status === 'failed' || t.status === 'error');
                              const allSkipped = tests.every(t => t.status === 'skipped');
                              const allPassed = tests.every(t => t.status === 'passed');

                              let statusVariant: 'default' | 'destructive' | 'secondary' = 'default';
                              if (hasFailed) statusVariant = 'destructive';
                              else if (allSkipped) statusVariant = 'secondary';

                              return (
                                <Card key={formName} className={hasFailed ? 'border-destructive' : ''}>
                                  <CardHeader>
                                    <div className="flex items-center justify-between">
                                      <CardTitle className="text-base">{formName}</CardTitle>
                                      <Badge variant={statusVariant}>
                                        {hasFailed ? 'Error' : allSkipped ? 'Skipped' : 'Success'}
                                      </Badge>
                                    </div>
                                  </CardHeader>
                                  <CardContent>
                                    <div className="space-y-2">
                                      {tests.map((test, idx) => (
                                        <div key={idx} className="flex items-center justify-between text-sm">
                                          <span className="text-muted-foreground">
                                            {test.name.replace('test_', '').replace(/_/g, ' ')}
                                          </span>
                                          <Badge
                                            variant={
                                              test.status === 'passed'
                                                ? 'default'
                                                : test.status === 'failed'
                                                ? 'destructive'
                                                : 'secondary'
                                            }
                                            className="text-xs"
                                          >
                                            {test.status}
                                          </Badge>
                                        </div>
                                      ))}
                                    </div>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="content" className="space-y-4 mt-4">
                        {Object.keys(pageGroups).length === 0 && spellingIssues.length === 0 && grammarIssues.length === 0 ? (
                          <div className="grid gap-4 md:grid-cols-2">
                            <Card className="border-green-500">
                              <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                                  Spell Check
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                                  No spelling errors found
                                </p>
                              </CardContent>
                            </Card>
                            <Card className="border-green-500">
                              <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                                  Grammar Check
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                                  No grammatical errors found
                                </p>
                              </CardContent>
                            </Card>
                          </div>
                        ) : (
                          <ScrollArea className="h-[500px]">
                            <div className="space-y-4">
                              {Object.values(pageGroups).map((pageGroup, idx) => (
                                <Card
                                  key={idx}
                                  className={pageGroup.totalIssues > 0 ? 'border-destructive' : 'border-green-500'}
                                >
                                  <CardHeader>
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <CardTitle className="text-base">
                                          <a
                                            href={pageGroup.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="hover:underline"
                                          >
                                            {pageGroup.url.replace('https://', '').replace('http://', '').replace(/\/$/, '') || 'Homepage'}
                                          </a>
                                        </CardTitle>
                                      </div>
                                      {pageGroup.totalIssues > 0 ? (
                                        <Badge variant="destructive">
                                          {pageGroup.totalIssues} {pageGroup.totalIssues === 1 ? 'Issue' : 'Issues'}
                                        </Badge>
                                      ) : (
                                        <Badge variant="default" className="bg-green-600">
                                          No Errors
                                        </Badge>
                                      )}
                                    </div>
                                  </CardHeader>
                                  {pageGroup.totalIssues > 0 && (
                                    <CardContent>
                                      <div className="space-y-3">
                                        {pageGroup.spellingIssues > 0 && (
                                          <div>
                                            <div className="text-sm font-medium mb-2">
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
                                                        <Badge variant="outline" className="text-xs">
                                                          Paragraph #{issue.paragraph_number}
                                                        </Badge>
                                                      )}
                                                    </div>
                                                    {(issue.before_context || issue.after_context) && (
                                                      <div className="mt-2 p-2 bg-background rounded border font-mono text-xs">
                                                        <span className="text-muted-foreground">{issue.before_context}</span>
                                                        <mark className="bg-yellow-200 px-1 font-bold">{issue.highlighted_word || issue.word}</mark>
                                                        <span className="text-muted-foreground">{issue.after_context}</span>
                                                      </div>
                                                    )}
                                                    {issue.suggestions && issue.suggestions.length > 0 && (
                                                      <div className="mt-1 text-xs text-green-700 dark:text-green-300">
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
                                            <div className="text-sm font-medium mb-2">
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
                                                        <Badge variant="outline" className="text-xs">
                                                          Paragraph #{issue.paragraph_number}
                                                        </Badge>
                                                      )}
                                                    </div>
                                                    {(issue.before_context || issue.after_context) && (
                                                      <div className="mt-2 p-2 bg-background rounded border font-mono text-xs">
                                                        <span className="text-muted-foreground">{issue.before_context}</span>
                                                        <mark className="bg-yellow-200 px-1 font-bold">{issue.highlighted_text}</mark>
                                                        <span className="text-muted-foreground">{issue.after_context}</span>
                                                      </div>
                                                    )}
                                                    {issue.suggestions && issue.suggestions.length > 0 && (
                                                      <div className="mt-1 text-xs text-green-700 dark:text-green-300">
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
                                    </CardContent>
                                  )}
                                </Card>
                              ))}
                            </div>
                          </ScrollArea>
                        )}
                      </TabsContent>
                    </Tabs>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <p>Select a workflow run to view test results</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
