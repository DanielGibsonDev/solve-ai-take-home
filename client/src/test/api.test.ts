import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    fetchVersions,
    fetchVersion,
    createVersion,
    updateVersion,
    fetchAuditLog,
    fetchHistory,
    type DocumentVersion,
    type AuditEvent,
    type ContentSnapshot,
} from '../api/documents';

// Mock fetch globally
const mockFetch = vi.fn();
globalThis.fetch = mockFetch as any;

describe('Document API Functions', () => {
    beforeEach(() => {
        mockFetch.mockClear();
    });

    describe('fetchVersions', () => {
        it('should fetch all versions for a document', async () => {
            const mockVersions: DocumentVersion[] = [
                {
                    id: 1,
                    document_id: 1,
                    version_number: 1,
                    content: '<p>Version 1 content</p>',
                    created_at: '2024-01-01T00:00:00Z',
                    created_by: 'Daniel',
                },
                {
                    id: 2,
                    document_id: 1,
                    version_number: 2,
                    content: '<p>Version 2 content</p>',
                    created_at: '2024-01-02T00:00:00Z',
                    created_by: 'Daniel',
                },
            ];

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockVersions,
            });

            const result = await fetchVersions(1);

            expect(mockFetch).toHaveBeenCalledWith(
                'http://localhost:8000/document/1/versions'
            );
            expect(result).toEqual(mockVersions);
            expect(result).toHaveLength(2);
        });

        it('should throw error when fetch fails', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                statusText: 'Not Found',
            });

            await expect(fetchVersions(999)).rejects.toThrow(
                'Failed to fetch versions: Not Found'
            );
        });
    });

    describe('fetchVersion', () => {
        it('should fetch a specific version', async () => {
            const mockVersion: DocumentVersion = {
                id: 2,
                document_id: 1,
                version_number: 2,
                content: '<p>Specific version content</p>',
                created_at: '2024-01-02T00:00:00Z',
                created_by: 'Daniel',
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockVersion,
            });

            const result = await fetchVersion(1, 2);

            expect(mockFetch).toHaveBeenCalledWith(
                'http://localhost:8000/document/1/version/2'
            );
            expect(result).toEqual(mockVersion);
            expect(result.version_number).toBe(2);
        });

        it('should throw error when version not found', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                statusText: 'Not Found',
            });

            await expect(fetchVersion(1, 999)).rejects.toThrow(
                'Failed to fetch version: Not Found'
            );
        });
    });

    describe('createVersion', () => {
        it('should create a new version', async () => {
            const mockNewVersion: DocumentVersion = {
                id: 3,
                document_id: 1,
                version_number: 3,
                content: '<p>New version content</p>',
                created_at: '2024-01-03T00:00:00Z',
                created_by: 'Daniel',
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockNewVersion,
            });

            const result = await createVersion(1);

            expect(mockFetch).toHaveBeenCalledWith(
                'http://localhost:8000/document/1/version',
                expect.objectContaining({
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                })
            );
            expect(result).toEqual(mockNewVersion);
            expect(result.version_number).toBe(3);
        });

        it('should throw error when creation fails', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                statusText: 'Internal Server Error',
            });

            await expect(createVersion(1)).rejects.toThrow(
                'Failed to create version: Internal Server Error'
            );
        });
    });

    describe('updateVersion', () => {
        it('should update version content', async () => {
            const updatedContent = '<p>Updated content</p>';
            const mockUpdatedVersion: DocumentVersion = {
                id: 2,
                document_id: 1,
                version_number: 2,
                content: updatedContent,
                created_at: '2024-01-02T00:00:00Z',
                created_by: 'Daniel',
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockUpdatedVersion,
            });

            const result = await updateVersion(1, 2, updatedContent);

            expect(mockFetch).toHaveBeenCalledWith(
                'http://localhost:8000/document/1/version/2',
                expect.objectContaining({
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ content: updatedContent }),
                })
            );
            expect(result.content).toBe(updatedContent);
        });

        it('should throw error when update fails', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                statusText: 'Bad Request',
            });

            await expect(updateVersion(1, 2, 'content')).rejects.toThrow(
                'Failed to update version: Bad Request'
            );
        });
    });

    describe('fetchAuditLog', () => {
        it('should fetch audit log events', async () => {
            const mockEvents: AuditEvent[] = [
                {
                    id: 1,
                    event_type: 'save',
                    user_name: 'Daniel',
                    document_id: 1,
                    version_id: 1,
                    timestamp: '2024-01-01T10:00:00Z',
                    lines_changed: 5,
                },
                {
                    id: 2,
                    event_type: 'create_version',
                    user_name: 'Daniel',
                    document_id: 1,
                    version_id: 1,
                    timestamp: '2024-01-01T09:00:00Z',
                    lines_changed: null,
                },
            ];

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockEvents,
            });

            const result = await fetchAuditLog(1, 1);

            expect(mockFetch).toHaveBeenCalledWith(
                'http://localhost:8000/document/1/version/1/audit'
            );
            expect(result).toEqual(mockEvents);
            expect(result).toHaveLength(2);
        });

        it('should throw error when fetch fails', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                statusText: 'Internal Server Error',
            });

            await expect(fetchAuditLog(1, 1)).rejects.toThrow(
                'Failed to fetch audit log: Internal Server Error'
            );
        });
    });

    describe('fetchHistory', () => {
        it('should fetch history snapshots for undo/redo', async () => {
            const mockSnapshots: ContentSnapshot[] = [
                {
                    id: 1,
                    timestamp: '2024-01-01T09:00:00Z',
                    content_snapshot: '<p>First save</p>',
                },
                {
                    id: 2,
                    timestamp: '2024-01-01T10:00:00Z',
                    content_snapshot: '<p>Second save</p>',
                },
            ];

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockSnapshots,
            });

            const result = await fetchHistory(1, 1);

            expect(mockFetch).toHaveBeenCalledWith(
                'http://localhost:8000/document/1/version/1/history'
            );
            expect(result).toEqual(mockSnapshots);
            expect(result).toHaveLength(2);
        });

        it('should throw error when fetch fails', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                statusText: 'Not Found',
            });

            await expect(fetchHistory(1, 1)).rejects.toThrow(
                'Failed to fetch history: Not Found'
            );
        });
    });

    describe('API Integration', () => {
        it('should handle network errors gracefully', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            await expect(fetchVersions(1)).rejects.toThrow('Network error');
        });

        it('should send correct headers for all requests', async () => {
            const mockVersion: DocumentVersion = {
                id: 1,
                document_id: 1,
                version_number: 1,
                content: '<p>Test</p>',
                created_at: '2024-01-01T00:00:00Z',
                created_by: 'Daniel',
            };

            mockFetch.mockResolvedValue({
                ok: true,
                json: async () => mockVersion,
            });

            await createVersion(1);
            expect(mockFetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json',
                    }),
                })
            );

            await updateVersion(1, 1, 'test');
            expect(mockFetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json',
                    }),
                })
            );
        });
    });
});

