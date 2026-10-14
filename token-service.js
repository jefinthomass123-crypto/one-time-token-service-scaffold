
import crypto from "node:crypto";
import Redis from "ioredis";
import "dotenv/config";

const redis = new Redis(process.env.REDIS_URL);

// Build the Redis key for a token ID.
const keyFor = (id) => "token:" + id;

/**
 * Issue a single-use token with an expiry.
 */
export async function issueToken(payload, ttlSeconds) {
  const tokenId = crypto.randomBytes(16).toString("hex");
  const value = JSON.stringify(payload);

  // Store payload and expiry atomically.
  await redis.set(
    keyFor(tokenId),
    value,
    "EX",
    ttlSeconds,
    "NX"
  );

  return tokenId;
}

/**
 * Consume a token exactly once.
 */
export async function consumeToken(tokenId) {
  // Atomically read and delete the token.
  const value = await redis.getdel(keyFor(tokenId));

  if (value === null) {
    return {
      ok: false,
      reason: "invalid"
    };
  }

  return {
    ok: true,
    payload: JSON.parse(value)
  };
}

// Close the Redis connection when the test finishes.
export function closeRedis() {
  return redis.quit();
}
