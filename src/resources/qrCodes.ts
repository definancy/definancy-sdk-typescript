import type { RequestOptions } from "../options.js";
import type { QrCode, QrCodeTransactionRequest } from "../types.js";
import { buildOptions, type RawClient } from "./_delegate.js";

/**
 * QR codes — generate wallet-payable QR codes for blockchain
 * transactions. Currently only the wallet-transaction shape is
 * supported; future QR types may be added under this namespace.
 */
export class QrCodesResource {
  constructor(private readonly client: RawClient) {}

  /**
   * Generate one or more wallet-payable QR codes for the supplied
   * transaction request.
   */
  async transaction(
    body: QrCodeTransactionRequest,
    options?: RequestOptions,
  ): Promise<QrCode[]> {
    const { data } = await this.client.POST(
      "/v1/qrcode/transaction",
      {
        body,
        ...buildOptions(options),
      },
    );
    return data!;
  }
}
