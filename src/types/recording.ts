/**
 * Types for request recording and replay functionality
 */

export interface RecordedRequest {
    id: string;
    timestamp: number;
    method: string;
    url: string;
    path: string;
    query: Record<string, any>;
    headers: Record<string, string>;
    body?: any;
    response: RecordedResponse;
    duration: number;
    tags?: string[];
    collection?: string;
}

export interface RecordedResponse {
    statusCode: number;
    headers: Record<string, string>;
    body: any;
}

export interface RequestCollection {
    id: string;
    name: string;
    description?: string;
    createdAt: number;
    updatedAt: number;
    requests: RecordedRequest[];
    tags?: string[];
}

export interface ReplayOptions {
    delay?: number;
    modifyRequest?: (req: RecordedRequest) => RecordedRequest;
    modifyResponse?: (res: RecordedResponse) => RecordedResponse;
}

export interface RecordingStats {
    totalRecordings: number;
    totalCollections: number;
    oldestRecording: number | undefined;
    newestRecording: number | undefined;
    storageSize: number;
}
