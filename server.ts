import express from "express";
import { createServer as createViteServer } from "vite";
import Stripe from "stripe";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

// Lazy initialization helpers
let stripeClient: Stripe | null = null;
const getStripe = () => {
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
      apiVersion: "2024-12-18.acacia" as any,
    });
  }
  return stripeClient;
};

let supabaseAdminClient: any = null;
const getSupabaseAdmin = () => {
  if (!supabaseAdminClient) {
    const url = process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      console.error("Missing Supabase environment variables for admin client");
      return null;
    }
    supabaseAdminClient = createClient(url, key);
  }
  return supabaseAdminClient;
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Webhook needs raw body
  app.post("/api/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    const sig = req.headers["stripe-signature"];
    const stripe = getStripe();
    const supabaseAdmin = getSupabaseAdmin();

    if (!supabaseAdmin) {
      return res.status(500).send("Server configuration error");
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig || "",
        process.env.STRIPE_WEBHOOK_SECRET || ""
      );
    } catch (err: any) {
      console.error(`Webhook Error: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id;

      if (userId) {
        console.log(`Payment successful for user: ${userId}`);
        const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          user_metadata: { is_premium: true }
        });
        
        if (error) {
          console.error("Error updating user premium status:", error);
        } else {
          console.log(`User ${userId} upgraded to Premium successfully.`);
        }
      }
    }

    res.json({ received: true });
  });

  app.use(express.json());

  // API Routes
  app.post("/api/create-checkout-session", async (req, res) => {
    try {
      const { priceId, userId, userEmail } = req.body;
      const stripe = getStripe();

      if (!priceId || !userId) {
        return res.status(400).json({ error: "Missing required parameters" });
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: `${req.headers.origin}/?session_id={CHECKOUT_SESSION_ID}&success=true`,
        cancel_url: `${req.headers.origin}/?success=false`,
        customer_email: userEmail,
        client_reference_id: userId,
        metadata: {
          userId: userId,
        },
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Stripe error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile("dist/index.html", { root: "." });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("CRITICAL: Failed to start server:", err);
  process.exit(1);
});
