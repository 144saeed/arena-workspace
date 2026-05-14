/**
 * Mandatory identity structure for any application running on ArenaCore.
 * Ensures strict database isolation and prevents Same-Origin collisions.
 */
export interface AppIdentity {
    /** * The unique identifier of the developer or organization.
     * Allowed: Alphanumeric, dashes, underscores. Length: 3-50.
     */
    readonly developerId: string;

    /** * The specific name of the application.
     * Allowed: Alphanumeric, dashes, underscores. Length: 3-50.
     */
    readonly appName: string;

    /** * The version of the database schema (e.g., 'v1').
     * Changing this forces a completely new, isolated database instance.
     */
    readonly version: string;
}