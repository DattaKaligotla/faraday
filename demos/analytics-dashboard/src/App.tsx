import { UIAgentProvider, Modifiable } from "@faraday-stack/forge";
import { AlertBanner } from "./components/AlertBanner";

const tableRows = [
  {
    id: "T-1001",
    customer: "Stripe Inc.",
    amount: "$12,400",
    status: "Paid",
    date: "2025-04-28",
  },
  {
    id: "T-1002",
    customer: "Linear B.V.",
    amount: "$3,200",
    status: "Pending",
    date: "2025-04-27",
  },
  {
    id: "T-1003",
    customer: "Vercel LLC",
    amount: "$8,750",
    status: "Paid",
    date: "2025-04-26",
  },
  {
    id: "T-1004",
    customer: "Loom Ltd.",
    amount: "$1,100",
    status: "Failed",
    date: "2025-04-25",
  },
  {
    id: "T-1005",
    customer: "Figma Corp.",
    amount: "$5,900",
    status: "Paid",
    date: "2025-04-24",
  },
  {
    id: "T-1006",
    customer: "Notion HQ",
    amount: "$2,340",
    status: "Pending",
    date: "2025-04-23",
  },
];

const barData = [
  { label: "Jan", value: 42 },
  { label: "Feb", value: 61 },
  { label: "Mar", value: 55 },
  { label: "Apr", value: 78 },
  { label: "May", value: 90 },
  { label: "Jun", value: 67 },
];

const statusColor: Record<string, string> = {
  Paid: "#16a34a",
  Pending: "#b45309",
  Failed: "#b91c1c",
};

export default function App() {
  return (
    <UIAgentProvider
      publishableKey="fdy_pk_AvM5RPfQ6ur43ILQO08E_YmLIGiGy6W9"
      userToken="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkZW1vLXVzZXItMSIsImV4cCI6MTc3ODAyMDA0MiwiaWF0IjoxNzc3OTMzNjQyfQ.wcTgyBMRRDBU9BeJ_b3AUTNGLDr0-hAS-2K74i4KM88"
      components={{
        AlertBanner: {
          component: AlertBanner,
          propsSchema: {
            message: { type: "string", default: "This is an alert." },
            variant: {
              type: "string",
              enum: ["info", "warning", "error", "success"],
              default: "info",
            },
          },
        },
      }}
    >
      <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
        {/* Sidebar */}
        <aside
          style={{
            width: 220,
            background: "#0f172a",
            color: "#f8fafc",
            display: "flex",
            flexDirection: "column",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              padding: "24px 20px 16px",
              fontWeight: 700,
              fontSize: 18,
              letterSpacing: -0.5,
              borderBottom: "1px solid #1e293b",
            }}
          >
            Faraday
          </div>
          <nav style={{ padding: "12px 0", flex: 1 }}>
            {[
              { id: "nav-overview", label: "Overview", active: true },
              { id: "nav-transactions", label: "Transactions" },
              { id: "nav-customers", label: "Customers" },
              { id: "nav-reports", label: "Reports" },
              { id: "nav-settings", label: "Settings" },
            ].map(({ id, label, active }) => (
              <Modifiable
                key={id}
                id={id}
                as="a"
                href="#"
                style={{
                  display: "block",
                  padding: "9px 20px",
                  color: active ? "#fff" : "#94a3b8",
                  background: active ? "#1e293b" : "transparent",
                  textDecoration: "none",
                  fontSize: 14,
                  fontWeight: active ? 500 : 400,
                }}
              >
                {label}
              </Modifiable>
            ))}
          </nav>
          <div
            style={{
              padding: "16px 20px",
              borderTop: "1px solid #1e293b",
              fontSize: 13,
              color: "#64748b",
            }}
          >
            demo@faraday.dev
          </div>
        </aside>

        {/* Main content */}
        <main style={{ flex: 1, overflow: "auto", padding: "28px 32px" }}>
          {/* Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 28,
            }}
          >
            <Modifiable id="page-title" as="h1" style={{ fontSize: 24, fontWeight: 700, color: "#0f172a" }}>
              Overview
            </Modifiable>
            <div style={{ display: "flex", gap: 8 }}>
              <select
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: 6,
                  padding: "6px 12px",
                  fontSize: 13,
                  background: "#fff",
                }}
              >
                <option>Last 30 days</option>
                <option>Last 90 days</option>
                <option>This year</option>
              </select>
              <button
                style={{
                  background: "#6366f1",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  padding: "6px 16px",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Export
              </button>
            </div>
          </div>

          {/* KPI cards */}
          <Modifiable
            id="cards-container"
            as="div"
            type="container"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 16,
              marginBottom: 24,
            }}
          >
            {[
              {
                id: "stat-revenue",
                label: "Total Revenue",
                value: "$84,320",
                delta: "+12.4%",
                up: true,
              },
              {
                id: "stat-users",
                label: "Active Users",
                value: "3,841",
                delta: "+7.1%",
                up: true,
              },
              {
                id: "stat-orders",
                label: "New Orders",
                value: "412",
                delta: "-2.3%",
                up: false,
              },
              {
                id: "stat-churn",
                label: "Churn Rate",
                value: "1.8%",
                delta: "-0.4%",
                up: true,
              },
            ].map(({ id, label, value, delta, up }) => (
              <Modifiable
                key={id}
                id={id}
                as="div"
                style={{
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                  padding: "20px 24px",
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    color: "#64748b",
                    fontWeight: 500,
                    marginBottom: 6,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  {label}
                </div>
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 700,
                    color: "#0f172a",
                    marginBottom: 4,
                  }}
                >
                  {value}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: up ? "#16a34a" : "#dc2626",
                    fontWeight: 500,
                  }}
                >
                  {delta} vs last period
                </div>
              </Modifiable>
            ))}
          </Modifiable>

          {/* Chart + table row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1.6fr",
              gap: 16,
              marginBottom: 24,
            }}
          >
            {/* Bar chart */}
            <Modifiable
              id="chart-placeholder"
              as="div"
              style={{
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: 12,
                padding: "20px 24px",
              }}
            >
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  marginBottom: 20,
                  color: "#0f172a",
                }}
              >
                Revenue by month
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  gap: 10,
                  height: 120,
                }}
              >
                {barData.map(({ label, value }) => (
                  <div
                    key={label}
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <div
                      style={{
                        width: "100%",
                        background: "#6366f1",
                        borderRadius: "4px 4px 0 0",
                        height: `${(value / 100) * 100}px`,
                        opacity: 0.85,
                      }}
                    />
                    <span style={{ fontSize: 11, color: "#94a3b8" }}>{label}</span>
                  </div>
                ))}
              </div>
            </Modifiable>

            {/* Mini stats panel */}
            <div
              style={{
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: 12,
                padding: "20px 24px",
              }}
            >
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  marginBottom: 16,
                  color: "#0f172a",
                }}
              >
                Top channels
              </div>
              {[
                { name: "Organic search", pct: 46 },
                { name: "Direct", pct: 28 },
                { name: "Referral", pct: 14 },
                { name: "Social", pct: 12 },
              ].map(({ name, pct }) => (
                <div key={name} style={{ marginBottom: 14 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 13,
                      marginBottom: 4,
                    }}
                  >
                    <span style={{ color: "#374151" }}>{name}</span>
                    <span style={{ color: "#6366f1", fontWeight: 600 }}>{pct}%</span>
                  </div>
                  <div
                    style={{
                      height: 6,
                      background: "#f1f5f9",
                      borderRadius: 4,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${pct}%`,
                        background: "#6366f1",
                        borderRadius: 4,
                        opacity: 0.8,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Transactions table */}
          <Modifiable
            id="table-section"
            as="section"
            style={{
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px 24px",
                borderBottom: "1px solid #e2e8f0",
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 14, color: "#0f172a" }}>Recent transactions</div>
              <a
                href="#"
                style={{
                  fontSize: 13,
                  color: "#6366f1",
                  textDecoration: "none",
                }}
              >
                View all
              </a>
            </div>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 13,
              }}
            >
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["ID", "Customer", "Amount", "Status", "Date"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "10px 24px",
                        textAlign: "left",
                        fontWeight: 500,
                        color: "#64748b",
                        borderBottom: "1px solid #e2e8f0",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row, i) => (
                  <Modifiable
                    key={row.id}
                    id={`row-${row.id}`}
                    as="tr"
                    style={{
                      borderBottom: i < tableRows.length - 1 ? "1px solid #f1f5f9" : "none",
                    }}
                  >
                    <td
                      style={{
                        padding: "12px 24px",
                        color: "#94a3b8",
                        fontFamily: "monospace",
                      }}
                    >
                      {row.id}
                    </td>
                    <td
                      style={{
                        padding: "12px 24px",
                        color: "#0f172a",
                        fontWeight: 500,
                      }}
                    >
                      {row.customer}
                    </td>
                    <td
                      style={{
                        padding: "12px 24px",
                        color: "#0f172a",
                        fontWeight: 600,
                      }}
                    >
                      {row.amount}
                    </td>
                    <td style={{ padding: "12px 24px" }}>
                      <span
                        style={{
                          color: statusColor[row.status],
                          background: `${statusColor[row.status]}18`,
                          borderRadius: 99,
                          padding: "2px 10px",
                          fontWeight: 500,
                          fontSize: 12,
                        }}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td style={{ padding: "12px 24px", color: "#64748b" }}>{row.date}</td>
                  </Modifiable>
                ))}
              </tbody>
            </table>
          </Modifiable>
        </main>
      </div>
    </UIAgentProvider>
  );
}
