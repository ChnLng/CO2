import { readFile } from "node:fs/promises";
import Stripe from "stripe";

const envText = await readFile(new URL("../.env", import.meta.url), "utf8");
const env = Object.fromEntries(
  envText
    .split(/\r?\n/)
    .filter(
      (line) => line && !line.trimStart().startsWith("#") && line.includes("="),
    )
    .map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
    }),
);

if (!env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is missing");
}

const stripe = new Stripe(env.STRIPE_SECRET_KEY);
const account = await stripe.accounts.retrieve();
const mask = (value) =>
  value && value.length > 12
    ? `${value.slice(0, 7)}…${value.slice(-4)}`
    : "not-available";

console.log(
  JSON.stringify(
    {
      account: mask(account.id),
      country: account.country,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      transfersCapability: account.capabilities?.transfers ?? "not-reported",
      testKey: env.STRIPE_SECRET_KEY.startsWith("sk_test_"),
    },
    null,
    2,
  ),
);
