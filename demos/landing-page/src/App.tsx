import { UIAgentProvider, Modifiable } from "@faraday-stack/forge";

export default function App() {
  return (
    <UIAgentProvider
      publishableKey={import.meta.env.VITE_FARADAY_PUBLISHABLE_KEY as string | undefined}
      userToken={import.meta.env.VITE_FARADAY_USER_TOKEN as string | undefined}
    >
      <div style={{ color: "#0f172a" }}>
        {/* Nav */}
        <nav
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 40px",
            borderBottom: "1px solid #e2e8f0",
          }}
        >
          <Modifiable
            id="nav-logo"
            as="span"
            defaultText="Acme Inc"
            style={{ fontWeight: 700, fontSize: 20, letterSpacing: -0.5 }}
          />
          <div style={{ display: "flex", gap: 32 }}>
            <a href="#" style={{ color: "#64748b", textDecoration: "none" }}>
              Product
            </a>
            <a href="#" style={{ color: "#64748b", textDecoration: "none" }}>
              Pricing
            </a>
            <a href="#" style={{ color: "#64748b", textDecoration: "none" }}>
              Docs
            </a>
          </div>
          <button
            style={{
              background: "#0f172a",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "8px 20px",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            Sign in
          </button>
        </nav>

        {/* Below-header injection zone */}
        <Modifiable id="below-header" type="container" as="div" />

        {/* Hero */}
        <section
          style={{
            background: "#020617",
            color: "#f8fafc",
            padding: "100px 40px",
            textAlign: "center",
          }}
        >
          <Modifiable
            id="hero-headline"
            as="h1"
            defaultText="Ship faster. Break less."
            style={{
              fontSize: 56,
              fontWeight: 800,
              letterSpacing: -1.5,
              lineHeight: 1.1,
              margin: "0 0 20px",
              maxWidth: 720,
              marginInline: "auto",
            }}
          />
          <Modifiable
            id="hero-subheadline"
            as="p"
            defaultText="Faraday lets your users tweak the UI in real time — no ticket, no deploy, no FDE."
            style={{
              fontSize: 20,
              color: "#94a3b8",
              maxWidth: 520,
              margin: "0 auto 48px",
              lineHeight: 1.6,
            }}
          />
          <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
            <Modifiable
              id="cta-button"
              as="button"
              defaultText="Get started free"
              style={{
                background: "#6366f1",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "14px 32px",
                fontSize: 16,
                fontWeight: 600,
                cursor: "pointer",
              }}
            />
            <button
              style={{
                background: "transparent",
                color: "#94a3b8",
                border: "1px solid #334155",
                borderRadius: 8,
                padding: "14px 32px",
                fontSize: 16,
                cursor: "pointer",
              }}
            >
              View docs
            </button>
          </div>
        </section>

        {/* Social proof */}
        <Modifiable
          id="social-proof-bar"
          as="div"
          defaultText="Trusted by teams at Stripe, Linear, Vercel, and 200+ more"
          style={{
            background: "#f1f5f9",
            borderTop: "1px solid #e2e8f0",
            borderBottom: "1px solid #e2e8f0",
            padding: "20px 40px",
            textAlign: "center",
            color: "#64748b",
            fontSize: 14,
          }}
        />

        {/* Features */}
        <Modifiable
          id="features-section"
          as="section"
          style={{ padding: "80px 40px", maxWidth: 1040, margin: "0 auto" }}
        >
          <h2
            style={{
              textAlign: "center",
              fontSize: 36,
              fontWeight: 700,
              marginBottom: 12,
            }}
          >
            Everything you need
          </h2>
          <p style={{ textAlign: "center", color: "#64748b", marginBottom: 56 }}>
            Three tools. One install. Zero workflow changes.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 24,
            }}
          >
            <Modifiable
              id="feature-1"
              as="div"
              style={{
                padding: 28,
                border: "1px solid #e2e8f0",
                borderRadius: 16,
                background: "#fff",
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 12 }}>⚡</div>
              <h3 style={{ fontWeight: 600, marginBottom: 8 }}>No deploy needed</h3>
              <p style={{ color: "#64748b", lineHeight: 1.6 }}>
                Push UI changes instantly without touching your CI pipeline or waiting on a review.
              </p>
            </Modifiable>
            <Modifiable
              id="feature-2"
              as="div"
              style={{
                padding: 28,
                border: "1px solid #e2e8f0",
                borderRadius: 16,
                background: "#fff",
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 12 }}>🧠</div>
              <h3 style={{ fontWeight: 600, marginBottom: 8 }}>Context-aware agent</h3>
              <p style={{ color: "#64748b", lineHeight: 1.6 }}>
                The agent knows which elements exist on screen and what properties are safe to modify.
              </p>
            </Modifiable>
            <Modifiable
              id="feature-3"
              as="div"
              style={{
                padding: 28,
                border: "1px solid #e2e8f0",
                borderRadius: 16,
                background: "#fff",
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 12 }}>🔒</div>
              <h3 style={{ fontWeight: 600, marginBottom: 8 }}>Safe by default</h3>
              <p style={{ color: "#64748b", lineHeight: 1.6 }}>
                CSS allowlists and a full undo history keep experiments under control at all times.
              </p>
            </Modifiable>
          </div>
        </Modifiable>

        {/* CTA banner */}
        <section
          style={{
            background: "#6366f1",
            color: "#fff",
            padding: "64px 40px",
            textAlign: "center",
          }}
        >
          <Modifiable
            id="cta-banner-headline"
            as="h2"
            defaultText="Ready to give it a try?"
            style={{ fontSize: 36, fontWeight: 700, marginBottom: 16 }}
          />
          <Modifiable
            id="cta-banner-sub"
            as="p"
            defaultText="Free for up to 3 seats. No credit card required."
            style={{ fontSize: 18, opacity: 0.85, marginBottom: 32 }}
          />
          <Modifiable
            id="cta-banner-button"
            as="button"
            defaultText="Start for free"
            style={{
              background: "#fff",
              color: "#6366f1",
              border: "none",
              borderRadius: 8,
              padding: "14px 32px",
              fontSize: 16,
              fontWeight: 700,
              cursor: "pointer",
            }}
          />
        </section>

        {/* Footer */}
        <footer
          style={{
            padding: "32px 40px",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            color: "#94a3b8",
            fontSize: 14,
          }}
        >
          <span>© 2025 Acme Inc. All rights reserved.</span>
          <div style={{ display: "flex", gap: 24 }}>
            <a href="#" style={{ color: "#94a3b8", textDecoration: "none" }}>
              Privacy
            </a>
            <a href="#" style={{ color: "#94a3b8", textDecoration: "none" }}>
              Terms
            </a>
          </div>
        </footer>
      </div>
    </UIAgentProvider>
  );
}
