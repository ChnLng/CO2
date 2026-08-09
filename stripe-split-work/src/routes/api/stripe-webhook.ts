import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/stripe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handleStripeWebhookCore } =
          await import("@/lib/stripe-core.server");
        return handleStripeWebhookCore(request);
      },
    },
  },
});
