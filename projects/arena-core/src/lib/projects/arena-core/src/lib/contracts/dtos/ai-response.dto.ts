/**
 * Standardized response payload returned by any AI adapter.
 */
export interface AiResponseDto {
    readonly content: string;
    readonly tokensUsed?: number;
    readonly providerId: string;
}