const BACKEND_URL = "http://localhost:8000";

export interface DocumentVersion {
    id: number;
    document_id: number;
    version_number: number;
    content: string;
    created_at: string;
}

/**
 * Fetch all versions for a specific document
 */
export const fetchVersions = async (documentId: number): Promise<DocumentVersion[]> => {
    const response = await fetch(`${BACKEND_URL}/document/${documentId}/versions`);

    if (!response.ok) {
        throw new Error(`Failed to fetch versions: ${response.statusText}`);
    }

    return response.json();
};

/**
 * Fetch a specific version of a document
 */
export const fetchVersion = async (
    documentId: number,
    versionId: number
): Promise<DocumentVersion> => {
    const response = await fetch(
        `${BACKEND_URL}/document/${documentId}/version/${versionId}`
    );

    if (!response.ok) {
        throw new Error(`Failed to fetch version: ${response.statusText}`);
    }

    return response.json();
};

/**
 * Create a new version for a document (copies the latest version)
 */
export const createVersion = async (documentId: number): Promise<DocumentVersion> => {
    const response = await fetch(`${BACKEND_URL}/document/${documentId}/version`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to create version: ${response.statusText}`);
    }

    return response.json();
};

/**
 * Update a specific version's content
 */
export const updateVersion = async (
    documentId: number,
    versionId: number,
    content: string
): Promise<DocumentVersion> => {
    const response = await fetch(
        `${BACKEND_URL}/document/${documentId}/version/${versionId}`,
        {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ content }),
        }
    );

    if (!response.ok) {
        throw new Error(`Failed to update version: ${response.statusText}`);
    }

    return response.json();
};

