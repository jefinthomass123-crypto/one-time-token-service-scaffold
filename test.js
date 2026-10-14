
import assert from "node:assert/strict";
import {
  issueToken,
  consumeToken,
  closeRedis
} from "./token-service.js";

async function main() {
  const payload = {
    userId: 123,
    purpose: "password-reset"
  };

  // Issue one token that expires after 60 seconds.
  const tokenId = await issueToken(payload, 60);

  console.log("issued token:", tokenId);

  // Run five consumers simultaneously.
  const results = await Promise.all(
    Array.from({ length: 5 }, () => consumeToken(tokenId))
  );

  // Count successful consumers.
  const winners = results.filter(
    (result) => result.ok === true
  ).length;

  console.log("winners:", winners);

  // Exactly one consumer must succeed.
  assert.equal(winners, 1);

  // Verify that the winning consumer received the payload.
  const winner = results.find((result) => result.ok === true);
  assert.deepEqual(winner.payload, payload);

  // Verify that consuming the same token again fails.
  const secondAttempt = await consumeToken(tokenId);
  assert.deepEqual(secondAttempt, {
    ok: false,
    reason: "invalid"
  });

  console.log("PASS: token was single-use.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeRedis();
  });
