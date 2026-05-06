import type { components, operations, paths } from "../oapi.gen.js";
import { ApiPaths } from "../oapi.gen.js";

// Re-export the generated top-level interfaces for advanced use
export type { components, operations, paths };
export { ApiPaths };

// ---------------------------------------------------------------------------
// Common
// ---------------------------------------------------------------------------
export type FormalName = components["schemas"]["FormalName"];
export type NetworkAddress = components["schemas"]["NetworkAddress"];
export type UnsignedInteger = components["schemas"]["UnsignedInteger"];
export type Timestamp = components["schemas"]["Timestamp"];
export type Time = components["schemas"]["Time"];
export type Expire = components["schemas"]["Expire"];
export type Enabled = components["schemas"]["Enabled"];
export type URL = components["schemas"]["URL"];
export type Version = components["schemas"]["Version"];
export type UUID = components["schemas"]["UUID"];
export type Note = components["schemas"]["Note"];

// ---------------------------------------------------------------------------
// Amount
// ---------------------------------------------------------------------------
export type Amount = components["schemas"]["Amount"];
export type AmountFormat = components["schemas"]["AmountFormat"];
export type AmountValue = components["schemas"]["AmountValue"];
export type AmountRaw = components["schemas"]["AmountRaw"];
export type Decimals = components["schemas"]["Decimals"];

// ---------------------------------------------------------------------------
// Media
// ---------------------------------------------------------------------------
export type MediaMap = components["schemas"]["MediaMap"];
export type Media = components["schemas"]["Media"];
export type MediaType = components["schemas"]["MediaType"];

// ---------------------------------------------------------------------------
// Status / Error
// ---------------------------------------------------------------------------
export type Status = components["schemas"]["Status"];
export type ApiError = components["schemas"]["Error"];
export type ErrorList = components["schemas"]["ErrorList"];

// ---------------------------------------------------------------------------
// Network
// ---------------------------------------------------------------------------
export type NetworkId = components["schemas"]["NetworkId"];
export type NetworkStatus = components["schemas"]["NetworkStatus"];
export type NetworkInfo = components["schemas"]["NetworkInfo"];
export type NetworkConfig = components["schemas"]["NetworkConfig"];
export type Network = components["schemas"]["Network"];
export type NetworkExplorer = components["schemas"]["NetworkExplorer"];

// ---------------------------------------------------------------------------
// Asset
// ---------------------------------------------------------------------------
export type AssetUnit = components["schemas"]["AssetUnit"];
export type AssetStatus = components["schemas"]["AssetStatus"];
export type AssetInfo = components["schemas"]["AssetInfo"];
export type AssetConfig = components["schemas"]["AssetConfig"];
export type Asset = components["schemas"]["Asset"];

// ---------------------------------------------------------------------------
// Contract
// ---------------------------------------------------------------------------
export type ContractId = components["schemas"]["ContractId"];
export type ContractStatus = components["schemas"]["ContractStatus"];
export type ContractInfo = components["schemas"]["ContractInfo"];
export type ContractConfig = components["schemas"]["ContractConfig"];
export type Contract = components["schemas"]["Contract"];
export type ContractAmount = components["schemas"]["ContractAmount"];
export type ContractAmountFormat = components["schemas"]["ContractAmountFormat"];

// ---------------------------------------------------------------------------
// Vault
// ---------------------------------------------------------------------------
export type VaultId = components["schemas"]["VaultId"];
export type VaultInfo = components["schemas"]["VaultInfo"];
export type VaultConfig = components["schemas"]["VaultConfig"];
export type Vault = components["schemas"]["Vault"];

// ---------------------------------------------------------------------------
// Document
// ---------------------------------------------------------------------------
export type DocumentId = components["schemas"]["DocumentId"];
export type DocumentType = components["schemas"]["DocumentType"];
export type DocumentInfo = components["schemas"]["DocumentInfo"];
export type DocumentConfig = components["schemas"]["DocumentConfig"];
export type DocumentConfigPersonV1 = components["schemas"]["DocumentConfigPersonV1"];
export type DocumentStatus = components["schemas"]["DocumentStatus"];
export type DocumentStatusId = components["schemas"]["DocumentStatusId"];
export type Document = components["schemas"]["Document"];

// ---------------------------------------------------------------------------
// Person / KYC
// ---------------------------------------------------------------------------
export type PersonV1 = components["schemas"]["PersonV1"];
export type PersonNaturalV1 = components["schemas"]["PersonNaturalV1"];
export type PersonLegalV1 = components["schemas"]["PersonLegalV1"];
export type PersonType = components["schemas"]["PersonType"];
export type PersonNaturalIdType = components["schemas"]["PersonNaturalIdType"];
export type PersonLegalIdType = components["schemas"]["PersonLegalIdType"];
export type CustodialV1 = components["schemas"]["CustodialV1"];
export type NonCustodialV1 = components["schemas"]["NonCustodialV1"];

// ---------------------------------------------------------------------------
// Compliance
// ---------------------------------------------------------------------------
export type Compliance = components["schemas"]["Compliance"];
export type ComplianceScenario = components["schemas"]["ComplianceScenario"];
export type ComplianceScenarioStatus = components["schemas"]["ComplianceScenarioStatus"];

// ---------------------------------------------------------------------------
// Payment
// ---------------------------------------------------------------------------
export type PaymentAcceptanceId = components["schemas"]["PaymentAcceptanceId"];
export type PaymentAcceptanceOrder = components["schemas"]["PaymentAcceptanceOrder"];
export type PaymentAcceptanceInfo = components["schemas"]["PaymentAcceptanceInfo"];
export type PaymentAcceptanceConfig = components["schemas"]["PaymentAcceptanceConfig"];
export type PaymentAcceptanceConfigFormat = components["schemas"]["PaymentAcceptanceConfigFormat"];
export type PaymentAcceptance = components["schemas"]["PaymentAcceptance"];
export type PaymentAcceptanceStatusId = components["schemas"]["PaymentAcceptanceStatusId"];
export type PaymentAcceptanceScenario = components["schemas"]["PaymentAcceptanceScenario"];
export type PaymentAcceptanceScenarioStatus = components["schemas"]["PaymentAcceptanceScenarioStatus"];
export type PaymentEstimate = components["schemas"]["PaymentEstimate"];
export type PaymentEstimateScenario = components["schemas"]["PaymentEstimateScenario"];

// ---------------------------------------------------------------------------
// Blockchain
// ---------------------------------------------------------------------------
export type BlockchainTransactionId = components["schemas"]["BlockchainTransactionId"];
export type BlockchainTransactionStatus = components["schemas"]["BlockchainTransactionStatus"];
export type BlockchainConfirmations = components["schemas"]["BlockchainConfirmations"];
export type BlockchainConfirmationStats = components["schemas"]["BlockchainConfirmationStats"];
export type BlockchainTransaction = components["schemas"]["BlockchainTransaction"];

// ---------------------------------------------------------------------------
// QR Code
// ---------------------------------------------------------------------------
export type QrCodeTransactionRequest = components["schemas"]["QrCodeTransactionRequest"];
export type QrCode = components["schemas"]["QrCode"];
export type QrCodeType = components["schemas"]["QrCodeType"];
export type QrCodeEncoding = components["schemas"]["QrCodeEncoding"];

// Velocity limits
export type VelocityLimitFormat = components["schemas"]["VelocityLimitFormat"];
export type VelocityMode = components["schemas"]["VelocityMode"];
export type VelocityScope = components["schemas"]["VelocityScope"];
export type VelocityWarning = components["schemas"]["VelocityWarning"];
