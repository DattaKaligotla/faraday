import { UIAgentProvider, Modifiable } from "@faraday-stack/forge";

const reviews = [
  {
    id: "review-1",
    author: "Sarah K.",
    rating: 5,
    date: "April 20, 2025",
    body: "Absolutely love this product. Super lightweight and the battery lasts forever. Would buy again without hesitation.",
  },
  {
    id: "review-2",
    author: "Marcus T.",
    rating: 4,
    date: "April 14, 2025",
    body: "Great build quality and fast shipping. Knocked one star because setup instructions could be clearer, but the product itself is excellent.",
  },
];

function Stars({ count }: { count: number }) {
  return (
    <span style={{ color: "#f59e0b", fontSize: 16 }}>
      {"★".repeat(count)}
      {"☆".repeat(5 - count)}
    </span>
  );
}

export default function App() {
  return (
    <UIAgentProvider>
      {/* Nav */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 40px",
          borderBottom: "1px solid #e2e8f0",
          background: "#fff",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 18, color: "#0f172a" }}>ShopCo</span>
        <div style={{ display: "flex", gap: 28, fontSize: 14, color: "#64748b" }}>
          <a href="#" style={{ color: "#64748b", textDecoration: "none" }}>
            New arrivals
          </a>
          <a href="#" style={{ color: "#64748b", textDecoration: "none" }}>
            Men
          </a>
          <a href="#" style={{ color: "#64748b", textDecoration: "none" }}>
            Women
          </a>
          <a href="#" style={{ color: "#64748b", textDecoration: "none" }}>
            Sale
          </a>
        </div>
        <div style={{ display: "flex", gap: 16, fontSize: 20 }}>
          <span style={{ cursor: "pointer" }}>🔍</span>
          <span style={{ cursor: "pointer" }}>🛒</span>
        </div>
      </nav>

      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "40px 24px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Breadcrumb */}
        <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 28 }}>
          Home &rsaquo; Electronics &rsaquo; Audio &rsaquo;{" "}
          <span style={{ color: "#0f172a" }}>Wireless Headphones</span>
        </div>

        {/* Product layout */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 56,
            marginBottom: 64,
          }}
        >
          {/* Image gallery */}
          <div>
            <Modifiable
              id="product-image-main"
              as="div"
              style={{
                background: "#f1f5f9",
                borderRadius: 16,
                aspectRatio: "1 / 1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 80,
                marginBottom: 12,
              }}
            >
              🎧
            </Modifiable>
            <div style={{ display: "flex", gap: 10 }}>
              {["🎧", "🔋", "📦"].map((icon, i) => (
                <div
                  key={i}
                  style={{
                    background: "#f8fafc",
                    border: `2px solid ${i === 0 ? "#6366f1" : "#e2e8f0"}`,
                    borderRadius: 8,
                    width: 72,
                    height: 72,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 28,
                    cursor: "pointer",
                  }}
                >
                  {icon}
                </div>
              ))}
            </div>
          </div>

          {/* Product details */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <div
                style={{
                  fontSize: 13,
                  color: "#6366f1",
                  fontWeight: 600,
                  marginBottom: 6,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                Studio Series
              </div>
              <Modifiable
                id="product-name"
                as="h1"
                style={{
                  fontSize: 32,
                  fontWeight: 800,
                  color: "#0f172a",
                  lineHeight: 1.15,
                  marginBottom: 12,
                }}
              >
                ProSound ANC 4000
              </Modifiable>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Stars count={5} />
                <span style={{ fontSize: 13, color: "#64748b" }}>4.8 (312 reviews)</span>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
              <Modifiable id="product-price" as="span" style={{ fontSize: 36, fontWeight: 800, color: "#0f172a" }}>
                $349
              </Modifiable>
              <span
                style={{
                  fontSize: 16,
                  color: "#94a3b8",
                  textDecoration: "line-through",
                }}
              >
                $419
              </span>
              <span
                style={{
                  fontSize: 13,
                  background: "#fef2f2",
                  color: "#b91c1c",
                  borderRadius: 6,
                  padding: "2px 8px",
                  fontWeight: 600,
                }}
              >
                Save 17%
              </span>
            </div>

            <Modifiable id="product-description" as="p" style={{ fontSize: 15, color: "#475569", lineHeight: 1.7 }}>
              Industry-leading noise cancellation meets 30-hour battery life. The ProSound ANC 4000 adapts to your
              environment — from open offices to busy commutes — without missing a beat.
            </Modifiable>

            {/* Options */}
            <div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 8,
                  color: "#374151",
                }}
              >
                Color
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                {[
                  { bg: "#18181b", label: "Midnight Black" },
                  { bg: "#e2e8f0", label: "Cloud Silver" },
                  { bg: "#1d4ed8", label: "Navy Blue" },
                ].map(({ bg, label }) => (
                  <div
                    key={label}
                    title={label}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: bg,
                      cursor: "pointer",
                      border: label === "Midnight Black" ? "2px solid #6366f1" : "2px solid transparent",
                      outline: "1px solid #e2e8f0",
                    }}
                  />
                ))}
              </div>
            </div>

            {/* CTA */}
            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
              <Modifiable
                id="add-to-cart-btn"
                as="button"
                style={{
                  flex: 1,
                  background: "#6366f1",
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  padding: "14px 0",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Add to cart
              </Modifiable>
              <button
                style={{
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 10,
                  padding: "14px 18px",
                  fontSize: 18,
                  cursor: "pointer",
                }}
              >
                ♡
              </button>
            </div>

            {/* Trust badges */}
            <div
              style={{
                display: "flex",
                gap: 20,
                paddingTop: 8,
                borderTop: "1px solid #f1f5f9",
                fontSize: 12,
                color: "#64748b",
              }}
            >
              <span>✓ Free shipping over $99</span>
              <span>✓ 2-year warranty</span>
              <span>✓ Free returns</span>
            </div>
          </div>
        </div>

        {/* Reviews */}
        <Modifiable id="reviews-section" as="section">
          <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 48 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 32,
              }}
            >
              <h2 style={{ fontSize: 22, fontWeight: 700, color: "#0f172a" }}>Customer reviews</h2>
              <button
                style={{
                  background: "#0f172a",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "8px 18px",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Write a review
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {reviews.map(({ id, author, rating, date, body }) => (
                <Modifiable
                  key={id}
                  id={id}
                  as="div"
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: 14,
                    padding: "24px 28px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 12,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontWeight: 700,
                          color: "#0f172a",
                          marginBottom: 4,
                        }}
                      >
                        {author}
                      </div>
                      <Stars count={rating} />
                    </div>
                    <span style={{ fontSize: 13, color: "#94a3b8" }}>{date}</span>
                  </div>
                  <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.7 }}>{body}</p>
                </Modifiable>
              ))}
            </div>
          </div>
        </Modifiable>
      </div>
    </UIAgentProvider>
  );
}
