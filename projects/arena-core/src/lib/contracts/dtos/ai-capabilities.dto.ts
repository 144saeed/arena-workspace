/**
 * Defines the specific features a registered AI adapter supports.
 * Allows the application to gracefully degrade or adapt its UI based on model limitations.
 */
export interface AiCapabilitiesDto {
    readonly supportsStreaming: boolean;
    readonly supportsTools: boolean;
    readonly supportsVision: boolean;
    readonly supportsJsonMode: boolean;
}