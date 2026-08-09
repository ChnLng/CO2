import { createServerFn } from "@tanstack/react-start";

import type {
  AdminInput,
  CheckoutInput,
  OnboardingInput,
  RefundInput,
} from "./stripe-core.server";

export const createStripeCheckoutSession = createServerFn({ method: "POST" })
  .validator((data: CheckoutInput) => data)
  .handler(async ({ data }) => {
    const [{ createCheckoutSessionCore }, { getRequestUrl }] =
      await Promise.all([
        import("./stripe-core.server"),
        import("@tanstack/react-start/server"),
      ]);
    return createCheckoutSessionCore(data, getRequestUrl().origin);
  });

export const getStripeConnectStatus = createServerFn({ method: "POST" })
  .validator((data: AdminInput) => data)
  .handler(async ({ data }) => {
    const { getStripeConnectStatusCore } = await import("./stripe-core.server");
    return getStripeConnectStatusCore(data);
  });

export const createStripeConnectOnboardingLink = createServerFn({
  method: "POST",
})
  .validator((data: OnboardingInput) => data)
  .handler(async ({ data }) => {
    const [{ createStripeConnectOnboardingLinkCore }, { getRequestUrl }] =
      await Promise.all([
        import("./stripe-core.server"),
        import("@tanstack/react-start/server"),
      ]);
    return createStripeConnectOnboardingLinkCore(data, getRequestUrl().origin);
  });

export const distributeAvailableStripeFunds = createServerFn({ method: "POST" })
  .validator((data: AdminInput) => data)
  .handler(async ({ data }) => {
    const { distributeAvailableFundsCore } =
      await import("./stripe-core.server");
    return distributeAvailableFundsCore(data);
  });

export const processStripeRefund = createServerFn({ method: "POST" })
  .validator((data: RefundInput) => data)
  .handler(async ({ data }) => {
    const { processStripeRefundCore } = await import("./stripe-core.server");
    return processStripeRefundCore(data);
  });
