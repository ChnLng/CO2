import { readFile, writeFile } from "node:fs/promises";
import Stripe from "stripe";

const envUrl = new URL("../.env", import.meta.url);
const envText = await readFile(envUrl, "utf8");
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

if (!env.STRIPE_SECRET_KEY?.startsWith("sk_test_")) {
  throw new Error("This setup script only accepts a Stripe test secret key.");
}

const stripe = new Stripe(env.STRIPE_SECRET_KEY);
const projectTag = "chine-langue-top-50-50";
const existing = await stripe.accounts.list({ limit: 100 });

async function ensureAccount(role, label) {
  const found = existing.data.find(
    (account) =>
      account.metadata?.project === projectTag &&
      account.metadata?.split_role === role &&
      !account.deleted,
  );

  if (found) return { account: found, created: false };

  const account = await stripe.accounts.create(
    {
      type: "express",
      country: "FR",
      capabilities: {
        transfers: { requested: true },
      },
      business_profile: {
        mcc: "8299",
        product_description: "Cours de langue en ligne",
      },
      metadata: {
        project: projectTag,
        split_role: role,
        display_label: label,
      },
    },
    { idempotencyKey: `${projectTag}-${role}-v1` },
  );

  return { account, created: true };
}

const first = await ensureAccount("admin_1", "管理员一 Administrateur 1");
const second = await ensureAccount("admin_2", "管理员二 Administrateur 2");

function replaceEnv(source, key, value) {
  const pattern = new RegExp(`^${key}=.*$`, "m");
  if (pattern.test(source)) return source.replace(pattern, `${key}=${value}`);
  return `${source.trimEnd()}\n${key}=${value}\n`;
}

let updatedEnv = envText;
updatedEnv = replaceEnv(
  updatedEnv,
  "STRIPE_CONNECT_ACCOUNT_1",
  first.account.id,
);
updatedEnv = replaceEnv(
  updatedEnv,
  "STRIPE_CONNECT_ACCOUNT_2",
  second.account.id,
);
await writeFile(envUrl, updatedEnv);

const mask = (value) => `${value.slice(0, 7)}…${value.slice(-4)}`;
const describe = ({ account, created }) => ({
  id: mask(account.id),
  created,
  type: account.type,
  transfers: account.capabilities?.transfers ?? "pending",
  detailsSubmitted: account.details_submitted,
  currentlyDue: account.requirements?.currently_due?.length ?? 0,
});

console.log(
  JSON.stringify(
    { admin1: describe(first), admin2: describe(second) },
    null,
    2,
  ),
);
