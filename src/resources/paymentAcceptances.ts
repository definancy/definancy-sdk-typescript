import type { RequestOptions } from "../options.js";
import type {
  ContractAmountFormat,
  DocumentId,
  PaymentAcceptance,
  PaymentAcceptanceConfigFormat,
  PaymentAcceptanceId,
  PaymentEstimate,
  VaultId,
} from "../types.js";
import { buildOptions, type RawClient } from "./_delegate.js";

/**
 * Payment acceptances — the lifecycle for partner-initiated payments
 * against a vault. Stages: `estimate` (preview the cost without
 * committing) → `create` (initiate the acceptance) → `get`/`update` (read
 * or modify) → `archive` (deactivate while preserving history).
 * `linkDocument`/`unlinkDocument` attach compliance docs to a specific
 * acceptance.
 */
export class PaymentAcceptancesResource {
  constructor(private readonly client: RawClient) {}

  /**
   * Preview the cost of a payment without committing. Each entry in
   * `contractAmounts` is a `{ contract-id, amount }` pair; the response
   * returns one or more scenarios with the equivalent payable amounts in
   * each requested contract.
   */
  async estimate(
    vaultId: VaultId,
    contractAmounts: ContractAmountFormat[],
    options?: RequestOptions,
  ): Promise<PaymentEstimate> {
    const { data } = await this.client.POST(
      "/v1/vault/{vaultId}/payment/estimate",
      {
        params: { path: { vaultId } },
        body: contractAmounts,
        ...buildOptions(options),
      },
    );
    return data!;
  }

  /** Create a new payment acceptance. */
  async create(
    vaultId: VaultId,
    body: PaymentAcceptanceConfigFormat,
    options?: RequestOptions,
  ): Promise<PaymentAcceptance> {
    const { data } = await this.client.PUT(
      "/v1/vault/{vaultId}/payment/acceptance",
      {
        params: { path: { vaultId } },
        body,
        ...buildOptions(options),
      },
    );
    return data!;
  }

  /** Get a specific payment acceptance. */
  async get(
    vaultId: VaultId,
    paymentAcceptanceId: PaymentAcceptanceId,
    options?: RequestOptions,
  ): Promise<PaymentAcceptance> {
    const { data } = await this.client.GET(
      "/v1/vault/{vaultId}/payment/acceptance/{paymentAcceptanceId}",
      {
        params: { path: { vaultId, paymentAcceptanceId } },
        ...buildOptions(options),
      },
    );
    return data!;
  }

  /**
   * Modify an existing payment acceptance. Note: core price scenarios
   * are immutable after creation; updates can change the `documents`
   * list and the `order` context.
   */
  async update(
    vaultId: VaultId,
    paymentAcceptanceId: PaymentAcceptanceId,
    body: PaymentAcceptanceConfigFormat,
    options?: RequestOptions,
  ): Promise<PaymentAcceptance> {
    const { data } = await this.client.PATCH(
      "/v1/vault/{vaultId}/payment/acceptance/{paymentAcceptanceId}",
      {
        params: { path: { vaultId, paymentAcceptanceId } },
        body,
        ...buildOptions(options),
      },
    );
    return data!;
  }

  /** Archive (soft-delete) a payment acceptance. */
  async archive(
    vaultId: VaultId,
    paymentAcceptanceId: PaymentAcceptanceId,
    options?: RequestOptions,
  ): Promise<void> {
    await this.client.DELETE(
      "/v1/vault/{vaultId}/payment/acceptance/{paymentAcceptanceId}",
      {
        params: { path: { vaultId, paymentAcceptanceId } },
        ...buildOptions(options),
      },
    );
  }

  /**
   * Link an existing document (already submitted via `documents.submit`)
   * to this payment acceptance for compliance evidence. Returns the
   * updated payment acceptance.
   */
  async linkDocument(
    vaultId: VaultId,
    paymentAcceptanceId: PaymentAcceptanceId,
    documentId: DocumentId,
    options?: RequestOptions,
  ): Promise<PaymentAcceptance> {
    const { data } = await this.client.PUT(
      "/v1/vault/{vaultId}/payment/acceptance/{paymentAcceptanceId}/document/{documentId}",
      {
        params: { path: { vaultId, paymentAcceptanceId, documentId } },
        ...buildOptions(options),
      },
    );
    return data!;
  }

  /**
   * Remove a document association from this payment acceptance. The
   * underlying document is retained for audit; this only removes its
   * binding to the acceptance. Returns the updated payment acceptance.
   */
  async unlinkDocument(
    vaultId: VaultId,
    paymentAcceptanceId: PaymentAcceptanceId,
    documentId: DocumentId,
    options?: RequestOptions,
  ): Promise<PaymentAcceptance> {
    const { data } = await this.client.DELETE(
      "/v1/vault/{vaultId}/payment/acceptance/{paymentAcceptanceId}/document/{documentId}",
      {
        params: { path: { vaultId, paymentAcceptanceId, documentId } },
        ...buildOptions(options),
      },
    );
    return data!;
  }
}
