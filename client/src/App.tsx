import Document from "./Document";
import { useEffect, useState, useRef } from "react";
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
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsVersionDropdownOpen(false);
      }
    };

    if (isVersionDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isVersionDropdownOpen]);

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
    if (!currentDocumentId) return;

    try {
      const version = await fetchVersion(currentDocumentId, versionId);
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

      {/* Main Content */}
      <div className="flex flex-1 flex-col lg:flex-row gap-6 p-6 overflow-hidden">

        {/* Left Sidebar - Document Selection */}
        <aside className="lg:w-56 flex-shrink-0">
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5">
            <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Documents
            </h3>
            <nav className="flex flex-row lg:flex-col gap-3 mt-5">
              <button
                onClick={() => loadPatent(1)}
                className={`w-full px-4 py-3 rounded-lg font-medium text-sm transition-all cursor-pointer border ${currentDocumentId === 1
                  ? "bg-slate-900 text-white shadow-sm border-slate-900"
                  : "bg-white text-slate-700 hover:bg-slate-50 border-slate-200 hover:border-slate-300"
                  }`}
              >
                Patent 1
              </button>
              <button
                onClick={() => loadPatent(2)}
                className={`w-full px-4 py-3 rounded-lg font-medium text-sm transition-all cursor-pointer border ${currentDocumentId === 2
                  ? "bg-slate-900 text-white shadow-sm border-slate-900"
                  : "bg-white text-slate-700 hover:bg-slate-50 border-slate-200 hover:border-slate-300"
                  }`}
              >
                Patent 2
              </button>
            </nav>
          </div>
        </aside>

        {/* Center - Editor */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 flex flex-col h-full">
            {/* Document Header */}
            <div className="border-b border-slate-200 px-8 py-5 bg-slate-50">
              <h2 className="text-xl font-semibold text-slate-900">
                {currentDocumentId > 0
                  ? `Patent ${currentDocumentId} · Version ${getCurrentVersionNumber()}`
                  : "Select a patent to begin"}
              </h2>
            </div>

            {/* Editor Content */}
            <div className="flex-1 overflow-auto p-8">
              <Document
                onContentChange={setCurrentDocumentContent}
                content={currentDocumentContent}
              />
            </div>
          </div>
        </main>

        {/* Right Sidebar - Version Controls */}
        <aside className="lg:w-72 flex-shrink-0">
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5 sticky top-0">
            <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Version Control
            </h3>

            {/* Version Selector and Create Button */}
            <div className="mt-5 mb-5">
              <label className="block text-xs font-semibold text-slate-700 mb-2.5 uppercase tracking-wider">
                Current Version
              </label>

              {/* Custom Dropdown */}
              <div ref={dropdownRef} className="relative mb-3">
                <button
                  onClick={() => setIsVersionDropdownOpen(!isVersionDropdownOpen)}
                  disabled={versions.length === 0}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-left bg-white border border-slate-300 rounded-lg hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent disabled:bg-slate-50 disabled:cursor-not-allowed cursor-pointer transition-all"
                >
                  <span className="text-slate-900">
                    {versions.find(v => v.id === currentVersionId)
                      ? `Version ${versions.find(v => v.id === currentVersionId)?.version_number}`
                      : 'Select version'}
                  </span>
                  <svg className={`w-4 h-4 text-slate-600 transition-transform ${isVersionDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isVersionDropdownOpen && versions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                    {versions.map((version) => (
                      <button
                        key={version.id}
                        onClick={() => {
                          loadVersion(version.id);
                          setIsVersionDropdownOpen(false);
                        }}
                        className={`w-full px-4 py-3 text-sm text-left hover:bg-slate-50 transition-colors cursor-pointer ${version.id === currentVersionId
                          ? 'bg-slate-100 font-semibold text-slate-900'
                          : 'text-slate-700'
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>Version {version.version_number}</span>
                          {version.id === currentVersionId && (
                            <svg className="w-4 h-4 text-slate-900" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* New Version Button */}
              <button
                onClick={() => createVersionMutation.mutate()}
                disabled={currentDocumentId === 0 || createVersionMutation.isPending}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:bg-slate-300 disabled:cursor-not-allowed cursor-pointer transition-all shadow-sm"
              >
                {createVersionMutation.isPending ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>New Version</span>
                  </>
                )}
              </button>
            </div>

            {/* Save Button */}
            <div className="space-y-3">
              <button
                onClick={() => saveVersionMutation.mutate()}
                disabled={currentDocumentId === 0 || currentVersionId === 0 || saveVersionMutation.isPending}
                className="w-full px-5 py-3 bg-emerald-700 text-white font-semibold text-sm rounded-lg hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:ring-offset-2 disabled:bg-slate-300 disabled:cursor-not-allowed cursor-pointer transition-all shadow-sm"
              >
                {saveVersionMutation.isPending ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </span>
                ) : (
                  "Save Changes"
                )}
              </button>
            </div>

            {/* Version Info */}
            {versions.length > 0 && (
              <div className="mt-5 pt-5 border-t border-slate-200">
                <p className="text-xs text-slate-500 font-medium">
                  {versions.length} version{versions.length !== 1 ? "s" : ""} available
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

export default App;
