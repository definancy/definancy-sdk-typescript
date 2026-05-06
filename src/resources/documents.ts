import type { RequestOptions } from "../options.js";
import type {
  Document,
  DocumentConfig,
  DocumentId,
  VaultId,
} from "../types.js";
import { buildOptions, type RawClient } from "./_delegate.js";

/**
 * Documents — compliance + KYC artefacts attached to a vault. Supported
 * types include personal identification, entity documentation, and
 * wallet-verification (custodial / non-custodial) data. Submission
 * server-assigns a document ID; partners then `linkDocument` from a
 * `paymentAcceptance` to attach the document to a specific payment.
 */
export class DocumentsResource {
  constructor(private readonly client: RawClient) {}

  /**
   * Submit a new document. The server assigns the `documentId` in the
   * response; use that ID with `paymentAcceptances.linkDocument` to
   * attach the document to a payment.
   */
  async submit(
    vaultId: VaultId,
    body: DocumentConfig,
    options?: RequestOptions,
  ): Promise<Document> {
    const { data } = await this.client.PUT(
      "/v1/vault/{vaultId}/document",
      {
        params: { path: { vaultId } },
        body,
        ...buildOptions(options),
      },
    );
    return data!;
  }

  /** Get a specific document by ID. */
  async get(
    vaultId: VaultId,
    documentId: DocumentId,
    options?: RequestOptions,
  ): Promise<Document> {
    const { data } = await this.client.GET(
      "/v1/vault/{vaultId}/document/{documentId}",
      {
        params: { path: { vaultId, documentId } },
        ...buildOptions(options),
      },
    );
    return data!;
  }

  /**
   * Archive (soft-delete) a document. The document is retained for
   * audit; archival removes it from active consideration.
   */
  async archive(
    vaultId: VaultId,
    documentId: DocumentId,
    options?: RequestOptions,
  ): Promise<void> {
    await this.client.DELETE(
      "/v1/vault/{vaultId}/document/{documentId}",
      {
        params: { path: { vaultId, documentId } },
        ...buildOptions(options),
      },
    );
  }
}
