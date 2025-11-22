import { useState, useEffect, useRef } from 'react';

interface Issue {
    type: string;
    severity: 'high' | 'medium' | 'low';
    claim: number;
    description: string;
    suggestion: string;
}

interface SuggestionsPanelProps {
    issues: Issue[];
    isProcessing: boolean;
    error: string | null;
}

export default function SuggestionsPanel({ issues, isProcessing, error }: SuggestionsPanelProps) {
    const [ignoredIndices, setIgnoredIndices] = useState<number[]>([]);
    const prevIssuesLengthRef = useRef(issues.length);

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'high':
                return 'bg-red-100 text-red-800 border-red-200';
            case 'medium':
                return 'bg-amber-100 text-amber-800 border-amber-200';
            case 'low':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            default:
                return 'bg-slate-100 text-slate-800 border-slate-200';
        }
    };

    const getSeverityBadge = (severity: string) => {
        const color = getSeverityColor(severity);
        return (
            <span className={`text-xs font-semibold px-2 py-1 rounded border ${color}`}>
                {severity.toUpperCase()}
            </span>
        );
    };

    // Sort issues by severity: high -> medium -> low
    const sortedIssues = [...issues].sort((a, b) => {
        const severityOrder = { high: 0, medium: 1, low: 2 };
        return severityOrder[a.severity] - severityOrder[b.severity];
    });

    // Filter out ignored suggestions
    const visibleIssues = sortedIssues.filter((_, index) => !ignoredIndices.includes(index));

    const handleIgnore = (index: number) => {
        setIgnoredIndices(prev => [...prev, index]);
    };

    const handleClearAll = () => {
        const allIndices = sortedIssues.map((_, i) => i);
        setIgnoredIndices(allIndices);
    };

    // Reset ignored when issues length changes (new AI response)
    useEffect(() => {
        if (issues.length !== prevIssuesLengthRef.current) {
            setIgnoredIndices([]);
            prevIssuesLengthRef.current = issues.length;
        }
    }, [issues.length]);

    return (
        <div className="h-full flex flex-col bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-900">AI Suggestions</h3>
                    <div className="flex items-center gap-2">
                        {isProcessing && visibleIssues.length > 0 && (
                            <svg className="animate-spin h-4 w-4 text-slate-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        )}
                        {visibleIssues.length > 0 && (
                            <>
                                <span className="px-2 py-1 text-xs font-medium bg-slate-900 text-white rounded">
                                    {visibleIssues.length}
                                </span>
                                <button
                                    type="button"
                                    onClick={handleClearAll}
                                    className="text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors cursor-pointer px-2 py-1 hover:bg-slate-100 rounded"
                                    title="Clear all suggestions"
                                >
                                    Clear All
                                </button>
                            </>
                        )}
                    </div>
                </div>
                {isProcessing && visibleIssues.length > 0 && (
                    <p className="text-xs text-slate-500 mt-1">Updating suggestions...</p>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5">
                {/* Only show loading state when no issues exist */}
                {isProcessing && visibleIssues.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <svg className="animate-spin h-8 w-8 text-slate-900 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p className="text-sm text-slate-600 font-medium">AI is reviewing your document...</p>
                        <p className="text-xs text-slate-500 mt-1">This may take a few moments</p>
                    </div>
                )}

                {error && (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-3">
                            <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <p className="text-sm text-red-600 font-medium mb-1">Error</p>
                        <p className="text-xs text-slate-600">{error}</p>
                    </div>
                )}

                {!error && visibleIssues.length === 0 && !isProcessing && (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-3">
                            <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <p className="text-sm text-slate-900 font-medium mb-1">All clear!</p>
                        <p className="text-xs text-slate-600">No issues found in your document</p>
                    </div>
                )}

                {!error && visibleIssues.length > 0 && (
                    <div className={`space-y-4 ${isProcessing ? 'opacity-60' : ''}`}>
                        {visibleIssues.map((issue) => {
                            // Find the original index in sortedIssues
                            const originalIndex = sortedIssues.indexOf(issue);

                            return (
                                <div
                                    key={`issue-${originalIndex}-${issue.type}-${issue.description.substring(0, 20)}`}
                                    className="border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-colors bg-white relative"
                                >
                                    {/* Ignore button */}
                                    <button
                                        type="button"
                                        onClick={() => handleIgnore(originalIndex)}
                                        className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded p-1 transition-colors cursor-pointer z-10"
                                        title="Ignore this suggestion"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>

                                    <div className="flex items-start justify-between mb-2 pr-8">
                                        <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                            {issue.type}
                                        </span>
                                        {getSeverityBadge(issue.severity)}
                                    </div>

                                    {/* Show claim number */}
                                    {issue.claim && (
                                        <div className="text-xs text-slate-500 mb-2">
                                            Claim {issue.claim}
                                        </div>
                                    )}

                                    <p className="text-sm text-slate-900 mb-3 leading-relaxed">
                                        {issue.description}
                                    </p>

                                    {issue.suggestion && (
                                        <div className="bg-slate-50 border border-slate-200 rounded-md p-3">
                                            <p className="text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wider">
                                                Suggestion
                                            </p>
                                            <p className="text-sm text-slate-700 leading-relaxed">
                                                {issue.suggestion}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
