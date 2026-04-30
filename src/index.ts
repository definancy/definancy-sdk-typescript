// Client
export { createClient, ENVIRONMENTS } from "./client.js";
export type { ClientOptions, DefinancyClient, Environment } from "./client.js";

// Auth — middleware
export { createAuthMiddleware } from "./auth/dpop.js";

// Auth — provider
export { LocalAuthProvider } from "./auth/local-provider.js";
export type { AuthProvider, Authentication } from "./auth/provider.js";

// Auth — signer
export type { Signer } from "./auth/signer.js";

// Auth — JWK
export { createJwk, jwkThumbprint } from "./auth/jwk.js";
export type { Jwk } from "./auth/jwk.js";

// Identity
export { DefinancyDid } from "./identity/did.js";
export { DefinancyId } from "./identity/id.js";

// Crypto
export { KeyPair } from "./crypto/keypair.js";

// Errors
export { DefinancyError, errorMiddleware } from "./errors.js";

// Media
export { createMediaMiddleware } from "./media.js";

// Explorer
export { createExplorer } from "./explorer.js";
export type { Explorer } from "./explorer.js";

// Amounts
export {
  amountFromRaw,
  amountFromValue,
  normalizeAmount,
  rawToValue,
  valueToRaw,
} from "./amounts.js";

// Generated enum
export { ApiPaths } from "./types.js";

// Types — re-export everything from the convenience aliases
export type {
  // Top-level generated interfaces
  components,
  operations,
  paths,

  // Common
  Enabled,
  Expire,
  FormalName,
  NetworkAddress,
  Note,
  Time,
  Timestamp,
  UnsignedInteger,
  URL,
  UUID,
  Version,

  // Amount
  Amount,
  AmountFormat,
  AmountRaw,
  AmountValue,
  Decimals,

  // Media
  Media,
  MediaMap,
  MediaType,

  // Status / Error
  ApiError,
  ErrorList,
  Status,

  // Network
  Network,
  NetworkConfig,
  NetworkId,
  NetworkExplorer,
  NetworkInfo,
  NetworkStatus,

  // Asset
  Asset,
  AssetConfig,
  AssetInfo,
  AssetStatus,
  AssetUnit,

  // Contract
  Contract,
  ContractAmount,
  ContractAmountFormat,
  ContractConfig,
  ContractId,
  ContractInfo,
  ContractStatus,

  // Vault
  Vault,
  VaultConfig,
  VaultId,
  VaultInfo,

  // Document
  Document,
  DocumentConfig,
  DocumentConfigPersonV1,
  DocumentId,
  DocumentInfo,
  DocumentStatus,
  DocumentStatusId,
  DocumentType,

  // Person / KYC
  CustodialV1,
  NonCustodialV1,
  PersonLegalV1,
  PersonNaturalV1,
  PersonLegalIdType,
  PersonNaturalIdType,
  PersonType,
  PersonV1,

  // Compliance
  Compliance,
  ComplianceScenario,
  ComplianceScenarioStatus,

  // Payment
  PaymentAcceptance,
  PaymentAcceptanceConfig,
  PaymentAcceptanceConfigFormat,
  PaymentAcceptanceId,
  PaymentAcceptanceInfo,
  PaymentAcceptanceOrder,
  PaymentAcceptanceScenario,
  PaymentAcceptanceScenarioStatus,
  PaymentAcceptanceStatusId,
  PaymentEstimate,
  PaymentEstimateScenario,

  // Blockchain
  BlockchainConfirmations,
  BlockchainConfirmationStats,
  BlockchainTransaction,
  BlockchainTransactionId,
  BlockchainTransactionStatus,

  // QR Code
  QrCode,
  QrCodeEncoding,
  QrCodeTransactionRequest,
  QrCodeType,
} from "./types.js";
