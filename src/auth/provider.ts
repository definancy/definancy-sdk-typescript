/**
 * Authentication result containing both the Authorization and DPoP tokens.
 * Both are encoded JWT strings ready to be set as HTTP header values.
 */
export interface Authentication {
  /** Encoded Authorization JWT (set as `Authorization: DPoP {value}`). */
  authorization: string;
  /** Encoded DPoP proof JWT (set as `DPoP: {value}`). */
  dpop: string;
}

/**
 * Pluggable authentication strategy.
 *
 * Implementations produce a signed Authorization + DPoP token pair
 * for each HTTP request. The default implementation is `LocalAuthProvider`.
 *
 * Custom implementations can be used for HSM-backed signing, remote
 * signing services, or delegated authentication.
 */
export interface AuthProvider {
  authenticate(method: string, url: string, body: Uint8Array | null): Promise<Authentication>;
}
