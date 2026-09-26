import {createPrivateKey, createPublicKey, type KeyObject, sign} from "node:crypto";
import {APIError} from "@terreno/api";

// Version 1 of the grant contract shared by backend, Mac and iOS clients.
// Clients verify `signature` over the exact `payload` bytes, then parse the JSON.
export interface GrantPayloadV1 {
  v: 1;
  grantId: string;
  userId: string;
  sessionId: string;
  scope: "all";
  issuedAt: string;
  expiresAt: string;
}

const loadPrivateKey = (): KeyObject => {
  const encoded = process.env.GRANT_SIGNING_PRIVATE_KEY;
  if (!encoded) {
    throw new APIError({status: 500, title: "Grant signing key is not configured"});
  }
  let key: KeyObject;
  try {
    key = createPrivateKey({format: "der", key: Buffer.from(encoded, "base64url"), type: "pkcs8"});
  } catch {
    throw new APIError({status: 500, title: "Grant signing key could not be loaded"});
  }
  // Fail closed on a misconfigured secret: EC and RSA keys would otherwise sign and
  // publish keys clients cannot verify as Ed25519.
  if (key.asymmetricKeyType !== "ed25519") {
    throw new APIError({status: 500, title: "Grant signing key is not an Ed25519 key"});
  }
  return key;
};

// Serializes with a fixed key order so the signed bytes are stable across runtimes.
const serializePayload = (payload: GrantPayloadV1): string =>
  JSON.stringify({
    expiresAt: payload.expiresAt,
    grantId: payload.grantId,
    issuedAt: payload.issuedAt,
    scope: payload.scope,
    sessionId: payload.sessionId,
    userId: payload.userId,
    v: payload.v,
  });

export const signGrant = (payload: GrantPayloadV1): {payload: string; signature: string} => {
  const bytes = Buffer.from(serializePayload(payload), "utf8");
  const signature = sign(null, bytes, loadPrivateKey());
  return {payload: bytes.toString("base64url"), signature: signature.toString("base64url")};
};

// Raw 32-byte Ed25519 public key, base64url; clients pin this in their builds.
export const getGrantPublicKey = (): string => {
  const jwk = createPublicKey(loadPrivateKey()).export({format: "jwk"});
  return jwk.x as string;
};
