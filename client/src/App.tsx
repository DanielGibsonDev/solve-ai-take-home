import Document from "./Document";
import SuggestionsPanel from "./components/SuggestionsPanel";
import { useEffect, useState, useRef, useCallback } from "react";
import LoadingOverlay from "./internal/LoadingOverlay";
import Logo from "./assets/logo.png";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchVersions,
  fetchVersion,
  createVersion,
  updateVersion,
} from "./api/documents";


function App() {
  const queryClient = useQueryClient();
  const [currentDocumentContent, setCurrentDocumentContent] = useState<string>("");
  const [currentDocumentId, setCurrentDocumentId] = useState<number>(1);
  const [currentVersionId, setCurrentVersionId] = useState<number>(0);
  const [isVersionDropdownOpen, setIsVersionDropdownOpen] = useState<boolean>(false);
  const [isDocumentDropdownOpen, setIsDocumentDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const documentDropdownRef = useRef<HTMLDivElement>(null);

  // AI Suggestions state
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [isAiProcessing, setIsAiProcessing] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Handle AI suggestions updates from Document component
  // Memoize this function to prevent infinite re-render loops
  const handleSuggestionsUpdate = useCallback((suggestions: any[], isProcessing: boolean, error: string | null) => {
    // Only update suggestions if they're provided (not undefined)
    // This allows us to just update processing state without clearing suggestions
    if (suggestions !== undefined) {
      setAiSuggestions(suggestions);
    }
    setIsAiProcessing(isProcessing);
    setAiError(error);
  }, []);

  // Close version dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsVersionDropdownOpen(false);
      }
      if (documentDropdownRef.current && !documentDropdownRef.current.contains(event.target as Node)) {
        setIsDocumentDropdownOpen(false);
      }
    };

    if (isVersionDropdownOpen || isDocumentDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isVersionDropdownOpen, isDocumentDropdownOpen]);

  // Fetch versions for the current document
  const {
    data: versions = [],
    isLoading: versionsLoading,
  } = useQuery({
    queryKey: ["versions", currentDocumentId],
    queryFn: () => fetchVersions(currentDocumentId),
    enabled: currentDocumentId > 0,
  });

  // Load the latest version when versions are fetched
  useEffect(() => {
    if (versions.length > 0 && currentVersionId === 0) {
      const latestVersion = versions[versions.length - 1];
      setCurrentVersionId(latestVersion.id);
      setCurrentDocumentContent(latestVersion.content);
    }
  }, [versions, currentVersionId]);

  // Mutation to create a new version
  const createVersionMutation = useMutation({
    mutationFn: () => createVersion(currentDocumentId),
    onSuccess: (newVersion) => {
      // Invalidate and refetch versions
      queryClient.invalidateQueries({ queryKey: ["versions", currentDocumentId] });
      // Switch to the new version
      setCurrentVersionId(newVersion.id);
      setCurrentDocumentContent(newVersion.content);
    },
    onError: (error) => {
      console.error("Error creating version:", error);
    },
  });

  // Mutation to save the current version
  const saveVersionMutation = useMutation({
    mutationFn: () => updateVersion(currentDocumentId, currentVersionId, currentDocumentContent),
    onSuccess: () => {
      // Optionally invalidate the versions cache to refresh timestamps
      queryClient.invalidateQueries({ queryKey: ["versions", currentDocumentId] });
    },
    onError: (error) => {
      console.error("Error saving version:", error);
    },
  });

  // Load a patent (switch documents)
  const loadPatent = (documentNumber: number) => {
    console.log("Loading patent:", documentNumber);
    setCurrentDocumentId(documentNumber);
    setCurrentVersionId(0); // Reset to trigger loading latest version
  };

  // Load a specific version
  const loadVersion = async (versionId: number) => {
    // Capture document ID at call time to detect race conditions
    const docId = currentDocumentId;
    if (!docId) return;

    try {
      const version = await fetchVersion(docId, versionId);

      // Check if user switched documents while we were loading
      if (docId !== currentDocumentId) {
        console.log("Document changed during version load, ignoring stale result");
        return;
      }

      setCurrentDocumentContent(version.content);
      setCurrentVersionId(version.id);
    } catch (error) {
      console.error("Error loading version:", error);
    }
  };

  // Get current version number for display
  const getCurrentVersionNumber = () => {
    const version = versions.find((v) => v.id === currentVersionId);
    return version ? version.version_number : 0;
  };

  const isLoading = versionsLoading || createVersionMutation.isPending || saveVersionMutation.isPending;

  return (
    <div className="flex flex-col h-screen w-full bg-slate-50">
      {isLoading && <LoadingOverlay />}

      {/* Header */}
      <header className="flex items-center justify-center w-full bg-slate-900 text-white px-8 py-3 shadow-sm border-b border-slate-700">
        <img src={Logo} alt="Solve Intelligence Logo" className="h-8" />
      </header>

      {/* Top Navigation Bar */}
      <nav className="bg-white border-b border-slate-200 px-4 md:px-8 py-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
          {/* Left Side - Selectors */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 md:gap-6 flex-1">
            {/* Document Selector */}
            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                Document:
              </label>
              <div ref={documentDropdownRef} className="relative flex-1 md:flex-none">
                <button
                  onClick={() => setIsDocumentDropdownOpen(!isDocumentDropdownOpen)}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white border border-slate-300 rounded-lg hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent cursor-pointer transition-all"
                >
                  <span className="text-slate-900 flex-1 text-left">
                    {currentDocumentId > 0 ? `Patent ${currentDocumentId}` : 'Select Patent'}
                  </span>
                  <svg className={`w-4 h-4 text-slate-600 transition-transform flex-shrink-0 ${isDocumentDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isDocumentDropdownOpen && (
                  <div className="absolute z-10 left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-auto w-full min-w-[160px]">
                    {[1, 2].map((docId) => (
                      <button
                        key={docId}
                        onClick={() => {
                          loadPatent(docId);
                          setIsDocumentDropdownOpen(false);
                        }}
                        className={`w-full px-4 py-2.5 text-sm text-left hover:bg-slate-50 transition-colors cursor-pointer ${docId === currentDocumentId
                          ? 'bg-slate-100 font-semibold text-slate-900'
                          : 'text-slate-700'
                          }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span>Patent {docId}</span>
                          {docId === currentDocumentId && (
                            <svg className="w-4 h-4 text-slate-900 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="hidden md:block w-px h-8 bg-slate-200"></div>

            {/* Version Selector */}
            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                Version:
              </label>
              <div ref={dropdownRef} className="relative flex-1 md:flex-none">
                <button
                  onClick={() => setIsVersionDropdownOpen(!isVersionDropdownOpen)}
                  disabled={versions.length === 0}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white border border-slate-300 rounded-lg hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent disabled:bg-slate-50 disabled:cursor-not-allowed cursor-pointer transition-all"
                >
                  <span className="text-slate-900 flex-1 text-left">
                    {versions.find(v => v.id === currentVersionId)
                      ? `Version ${versions.find(v => v.id === currentVersionId)?.version_number}`
                      : 'Select version'}
                  </span>
                  <svg className={`w-4 h-4 text-slate-600 transition-transform flex-shrink-0 ${isVersionDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isVersionDropdownOpen && versions.length > 0 && (
                  <div className="absolute z-10 left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-auto w-full min-w-[160px]">
                    {versions.map((version) => (
                      <button
                        key={version.id}
                        onClick={() => {
                          loadVersion(version.id);
                          setIsVersionDropdownOpen(false);
                        }}
                        className={`w-full px-4 py-2.5 text-sm text-left hover:bg-slate-50 transition-colors cursor-pointer ${version.id === currentVersionId
                          ? 'bg-slate-100 font-semibold text-slate-900'
                          : 'text-slate-700'
                          }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span>Version {version.version_number}</span>
                          {version.id === currentVersionId && (
                            <svg className="w-4 h-4 text-slate-900 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            <button
              onClick={() => createVersionMutation.mutate()}
              disabled={currentDocumentId === 0 || createVersionMutation.isPending}
              className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:bg-slate-300 disabled:cursor-not-allowed cursor-pointer transition-all"
            >
              {createVersionMutation.isPending ? (
                <>
                  <svg className="animate-spin h-4 w-4 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>New Version</span>
                </>
              )}
            </button>

            <button
              onClick={() => saveVersionMutation.mutate()}
              disabled={currentDocumentId === 0 || currentVersionId === 0 || saveVersionMutation.isPending}
              className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:ring-offset-2 disabled:bg-slate-300 disabled:cursor-not-allowed cursor-pointer transition-all"
            >
              {saveVersionMutation.isPending ? (
                <>
                  <svg className="animate-spin h-4 w-4 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Save</span>
                </>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 p-4 md:p-6 overflow-auto">
        {/* Editor - Takes more space */}
        <main className="flex-1 flex flex-col min-w-0">
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 flex flex-col h-full min-h-[600px]">
            {/* Document Header */}
            <div className="border-b border-slate-200 px-4 md:px-8 py-4 bg-slate-50">
              <h2 className="text-base md:text-lg font-semibold text-slate-900">
                {currentDocumentId > 0
                  ? `Patent ${currentDocumentId} · Version ${getCurrentVersionNumber()}`
                  : "Select a patent to begin"}
              </h2>
            </div>

            {/* Editor Content */}
            <div className="flex-1 overflow-auto p-4 md:p-8">
              <Document
                onContentChange={setCurrentDocumentContent}
                content={currentDocumentContent}
                onSuggestionsUpdate={handleSuggestionsUpdate}
              />
            </div>
          </div>
        </main>

        {/* AI Suggestions Panel */}
        <aside className="w-full lg:w-96 flex-shrink-0 min-h-[600px]">
          <SuggestionsPanel
            issues={aiSuggestions}
            isProcessing={isAiProcessing}
            error={aiError}
          />
        </aside>
      </div>
    </div>
  );
}

export default App;
