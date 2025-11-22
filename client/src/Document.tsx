import Editor from "./internal/Editor";
import useWebSocket from "react-use-websocket";
import { debounce } from "lodash";
import { useCallback, useEffect } from "react";

export interface DocumentProps {
  onContentChange: (content: string) => void;
  content: string;
  onSuggestionsUpdate?: (suggestions: any, isProcessing: boolean, error: string | null) => void;
}

const SOCKET_URL = "ws://localhost:8000/ws";

export default function Document({ onContentChange, content, onSuggestionsUpdate }: DocumentProps) {
  const { sendMessage, lastMessage } = useWebSocket(SOCKET_URL, {
    shouldReconnect: (_closeEvent) => true,
  });

  useEffect(() => {
    if (lastMessage !== null) {
      try {
        const response = JSON.parse(lastMessage.data);

        if (response.status === "processing") {
          // Keep existing suggestions, just update processing state
          if (onSuggestionsUpdate) {
            // Don't clear suggestions - just signal we're processing
            onSuggestionsUpdate(undefined as any, true, null);
          }
        } else if (response.status === "success") {
          if (onSuggestionsUpdate) {
            onSuggestionsUpdate(response.data?.issues || [], false, null);
          }
        } else if (response.status === "error") {
          if (onSuggestionsUpdate) {
            onSuggestionsUpdate([], false, response.message || "An error occurred");
          }
        }
      } catch (e) {
        console.error("WebSocket error:", e);
        if (onSuggestionsUpdate) {
          onSuggestionsUpdate([], false, "Failed to parse AI response");
        }
      }
    }
  }, [lastMessage, onSuggestionsUpdate]);

  // Debounce editor content changes
  const sendEditorContent = useCallback(
    debounce((content: string) => {
      // Only send if content has substance
      if (content && content.trim().length > 10) {
        sendMessage(content);
      }
    }, 2000), // 2 second debounce - give user time to type
    [sendMessage]
  );

  const handleEditorChange = (content: string) => {
    onContentChange(content);
    sendEditorContent(content);
  };

  return (
    <div className="w-full h-full overflow-y-auto">
      <Editor handleEditorChange={handleEditorChange} content={content} />
    </div>
  );
}

