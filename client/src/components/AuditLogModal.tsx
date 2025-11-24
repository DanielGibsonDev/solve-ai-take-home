import { AuditEvent } from "../api/documents";

interface AuditLogModalProps {
    isOpen: boolean;
    onClose: () => void;
    events: AuditEvent[];
    isLoading: boolean;
}

const AuditLogModal = ({ isOpen, onClose, events, isLoading }: AuditLogModalProps) => {
    if (!isOpen) return null;

    const formatDate = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        });
    };

    const formatEventText = (event: AuditEvent) => {
        if (event.event_type === "save") {
            const wordDelta = event.lines_changed;
            let wordChange: string;

            if (wordDelta === null || wordDelta === undefined) {
                wordChange = 'no change';
            } else if (wordDelta > 0) {
                const plural = wordDelta === 1 ? 'word' : 'words';
                wordChange = `+${wordDelta} ${plural}`;
            } else if (wordDelta < 0) {
                const plural = wordDelta === -1 ? 'word' : 'words';
                wordChange = `${wordDelta} ${plural}`;
            } else {
                // This else case is redundant now (handled by null check above)
                // but kept for clarity
                wordChange = 'no change';
            }

            return `Saved by ${event.user_name} • ${formatDate(event.timestamp)} • ${wordChange}`;
        } else if (event.event_type === "create_version") {
            return `Version created by ${event.user_name} • ${formatDate(event.timestamp)}`;
        }
        return `${event.event_type} by ${event.user_name} • ${formatDate(event.timestamp)}`;
    };

    const getEventIcon = (eventType: string) => {
        if (eventType === "save") {
            return (
                <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
            );
        } else if (eventType === "create_version") {
            return (
                <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
            );
        }
        return null;
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/30 z-40 transition-opacity"
            />

            {/* Modal */}
            <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                onClick={onClose}
            >
                <div
                    className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col cursor-default"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                        <h2 className="text-xl font-semibold text-slate-900">Audit Log</h2>
                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                            aria-label="Close"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto px-6 py-4">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <svg className="animate-spin h-8 w-8 text-slate-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            </div>
                        ) : events.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-slate-500">No activity recorded yet.</p>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {events.map((event, index) => (
                                    <div
                                        key={event.id}
                                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors"
                                    >
                                        <div className="flex-shrink-0 mt-0.5">
                                            {getEventIcon(event.event_type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-slate-700">{formatEventText(event)}</p>
                                        </div>
                                        {index === 0 && (
                                            <span className="flex-shrink-0 px-2 py-1 text-xs font-medium bg-slate-100 text-slate-600 rounded">
                                                Latest
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-slate-200 flex justify-end">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default AuditLogModal;

