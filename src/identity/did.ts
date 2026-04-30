import { DefinancyId } from "./id.js";

/**
 * A Definancy DID (Decentralized Identifier) in the format:
 * `did:definancy:{network}:{id}`
 *
 * @example
 * ```ts
 * const did = new DefinancyDid("dev", definancyId);
 * console.log(await did.toString()); // "did:definancy:dev:ZKKXG4KA5PTZ..."
 * ```
 */
export class DefinancyDid {
  readonly network: string;
  readonly id: DefinancyId;

  constructor(network: string, id: DefinancyId) {
    this.network = network;
    this.id = id;
  }

  async toString(): Promise<string> {
    return `did:definancy:${this.network}:${await this.id.toString()}`;
  }
}
