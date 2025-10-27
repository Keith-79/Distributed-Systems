// frontend/src/components/Agent/AgentWidget.jsx
import { useMemo, useState, useId } from "react";

/** API base from env (CRA or Vite) with localhost fallback */
const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_AGENT_API_BASE) ||
  (typeof process !== "undefined" && process.env && process.env.REACT_APP_AGENT_API_BASE) ||
  "http://localhost:8088";

/** The 10 seeded cities */
const CITIES = [
  "New York, NY","Los Angeles, CA","Chicago, IL","Miami, FL",
  "San Francisco, CA","Seattle, WA","Austin, TX","Boston, MA","Denver, CO","Phoenix, AZ",
];
const PARTY_TYPES = ["couple","family","friends","business"];
const BUDGETS = ["$","$$","$$$"];
const INTERESTS = ["park","museum","art","science","viewpoint","garden","kid-friendly","cafe"];

const TAG_EMOJI = {
  park: "🌳",
  museum: "🖼️",
  art: "🎨",
  science: "🔬",
  viewpoint: "🔭",
  garden: "🌼",
  "kid-friendly": "👶",
  cafe: "☕",
  restaurant: "🍽️",
  vegan: "🥦",
  vegetarian: "🥗",
  "gluten-free": "🌾🚫",
  event: "🎟️",
};

function tagEmoji(tag) {
  return TAG_EMOJI[tag] || "📍";
}

function slotEmoji(slot) {
  if (slot === "morning") return "🌅";
  if (slot === "afternoon") return "🌤️";
  return "🌙";
}

function weatherEmoji(summary) {
  if (!summary) return "🌤️";
  const m = summary.match(/(\d+)\s+likely rainy/);
  if (m && parseInt(m[1], 10) > 0) return "🌧️";
  return "🌤️";
}

function activityEmoji(activity) {
  const tags = (activity?.tags || []).map(t => String(t).toLowerCase());
  if (tags.includes("restaurant")) return "🍽️";
  if (tags.includes("cafe")) return "☕";
  if (tags.includes("park")) return "🌳";
  if (tags.includes("museum")) return "🖼️";
  if (tags.includes("art")) return "🎨";
  if (tags.includes("science")) return "🔬";
  if (tags.includes("viewpoint")) return "🔭";
  if (tags.includes("garden")) return "🌼";
  return "📍";
}

export default function AgentWidget() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resp, setResp] = useState(null);
  const [error, setError] = useState(null);

  // form state
  const [city, setCity] = useState("Los Angeles, CA");
  const [start, setStart] = useState("2025-11-04");
  const [end, setEnd] = useState("2025-11-06");
  const [party, setParty] = useState("friends");
  const [budget, setBudget] = useState("$$");
  const [mobility, setMobility] = useState("");
  const [dietary, setDietary] = useState("vegetarian");
  const [ask, setAsk] = useState("");
  const [interestSet, setInterestSet] = useState(new Set(["park","museum","art","science"]));

  const formId = useId();
  const interests = useMemo(() => Array.from(interestSet), [interestSet]);

  const payload = useMemo(
    () => ({
      booking: { start_date: start, end_date: end, location: city, party_type: party },
      preferences: { budget_tier: budget, interests, mobility, dietary },
      ask,
    }),
    [start, end, city, party, budget, interests, mobility, dietary, ask]
  );

  async function callAgent() {
    setError(null);
    setLoading(true);
    setResp(null);
    try {
      const r = await fetch(`${API_BASE}/agent/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const text = await r.text();
      if (!r.ok) throw new Error(text || `HTTP ${r.status}`);
      const data = JSON.parse(text);
      setResp(data.output);
      // scroll to results area
      const el = document.getElementById("agent-results");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function toggleInterest(tag) {
    setInterestSet(prev => {
      const next = new Set(prev);
      next.has(tag) ? next.delete(tag) : next.add(tag);
      return next;
    });
  }

  return (
    <>
      {/* Floating action button */}
      <button onClick={() => setOpen(true)} aria-label="Open AI Concierge" style={styles.fab}>
        <span style={{ marginRight: 8 }}>🤖</span> Concierge
      </button>

      {open && (
        <aside role="dialog" aria-modal="true" aria-label="AI Concierge Panel" style={styles.panel}>
          <header style={styles.header}>
            <div>
              <h3 style={styles.title}>✈️ AI Concierge</h3>
              <p style={styles.subtitle}>Smart trip plan • activities • eats • packing</p>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close panel" style={styles.close}>✕</button>
          </header>

          {/* Scrollable content area (form + results). Footer below is sticky. */}
          <div style={styles.scrollArea}>
            {/* Form */}
            <div style={{ padding: 16, display: "grid", gap: 12 }}>
              <div style={styles.row}>
                <label htmlFor={`${formId}-city`} style={styles.label}>🗺️ City</label>
                <select id={`${formId}-city`} value={city} onChange={e=>setCity(e.target.value)} style={styles.input}>
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={styles.row}>
                  <label htmlFor={`${formId}-start`} style={styles.label}>📅 Start</label>
                  <input id={`${formId}-start`} type="date" value={start} onChange={e=>setStart(e.target.value)} style={styles.input}/>
                </div>
                <div style={styles.row}>
                  <label htmlFor={`${formId}-end`} style={styles.label}>📅 End</label>
                  <input id={`${formId}-end`} type="date" value={end} onChange={e=>setEnd(e.target.value)} style={styles.input}/>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={styles.row}>
                  <label htmlFor={`${formId}-party`} style={styles.label}>🧑‍🤝‍🧑 Party</label>
                  <select id={`${formId}-party`} value={party} onChange={e=>setParty(e.target.value)} style={styles.input}>
                    {PARTY_TYPES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div style={styles.row}>
                  <label htmlFor={`${formId}-budget`} style={styles.label}>💵 Budget</label>
                  <select id={`${formId}-budget`} value={budget} onChange={e=>setBudget(e.target.value)} style={styles.input}>
                    {BUDGETS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={styles.row}>
                  <label htmlFor={`${formId}-mobility`} style={styles.label}>♿ Mobility</label>
                  <select id={`${formId}-mobility`} value={mobility} onChange={e=>setMobility(e.target.value)} style={styles.input}>
                    <option value="">none</option>
                    <option value="wheelchair">wheelchair</option>
                    <option value="no-long-hikes">no long hikes</option>
                    <option value="stroller">stroller</option>
                  </select>
                </div>
                <div style={styles.row}>
                  <label htmlFor={`${formId}-diet`} style={styles.label}>🥗 Dietary</label>
                  <select id={`${formId}-diet`} value={dietary} onChange={e=>setDietary(e.target.value)} style={styles.input}>
                    <option value="">none</option>
                    <option value="vegan">vegan</option>
                    <option value="vegetarian">vegetarian</option>
                    <option value="gluten-free">gluten-free</option>
                  </select>
                </div>
              </div>

              <fieldset style={styles.fieldset}>
                <legend style={styles.legend}>🎯 Interests</legend>
                <div style={styles.chipWrap}>
                  {INTERESTS.map(tag => {
                    const selected = interestSet.has(tag);
                    return (
                      <button
                        key={tag}
                        onClick={() => toggleInterest(tag)}
                        aria-pressed={selected}
                        style={{
                          ...styles.chip,
                          background: selected ? "#111827" : "white",
                          color: selected ? "white" : "#111827",
                          borderColor: "#111827",
                        }}
                      >
                        <span style={{ marginRight: 6 }}>{tagEmoji(tag)}</span>{tag}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <label style={styles.row}>
                <span style={styles.label}>💬 Free-text ask</span>
                <textarea
                  value={ask}
                  onChange={e=>setAsk(e.target.value)}
                  rows={3}
                  placeholder="e.g., we’re vegan, no long hikes, two kids"
                  style={{ ...styles.input, resize: "vertical" }}
                />
              </label>

              {error && (
                <div role="alert" style={styles.alert}>
                  <strong>⚠️ Agent error:</strong> {error}
                </div>
              )}

              {/* Anchor for auto-scroll */}
              <div id="agent-results" />
              {/* Results */}
              <div style={styles.results}>
                {!resp ? (
                  <p>Results will appear here after you click <em>Get plan</em> 🚀</p>
                ) : (
                  <>
                    <p style={{ fontSize: 16, marginBottom: 12 }}>
                      <strong>{weatherEmoji(resp.weather_summary)} Weather:</strong> {resp.weather_summary}
                    </p>

                    <h4 style={styles.sectionTitle}>🗓️ Itinerary</h4>
                    <div style={styles.itineraryGrid}>
                      {resp.itinerary.map(day => (
                        <section key={day.date} style={styles.dayCard}>
                          <header style={styles.dayHeader}>
                            <div style={{ fontWeight: 700 }}>{day.date}</div>
                            <div style={{ color: '#6b7280', fontSize: 12 }}>Morning • Afternoon • Evening</div>
                          </header>
                          <div style={{ padding: '10px 12px 12px' }}>
                            {["morning","afternoon","evening"].map(slot => (
                              <div key={slot} style={styles.slotBlock}>
                                <div style={styles.slotTitle}>{slotEmoji(slot)} {slot}</div>
                                {day.blocks[slot].length === 0 ? (
                                  <div style={styles.emptyRow}>—</div>
                                ) : (
                                  day.blocks[slot].map((a,i)=>(
                                    <div key={i} style={styles.activityRow}>
                                      <div style={styles.activityMain}>
                                        <span style={{ marginRight: 8 }}>{activityEmoji(a)}</span>
                                        <span style={{ fontWeight: 600 }}>{a.title}</span>
                                      </div>
                                      <div style={styles.activityMeta}>
                                        <span style={styles.badge}>{a.price_tier}</span>
                                        {a.duration_minutes ? <span style={styles.badge}>{a.duration_minutes}m</span> : null}
                                        {a.wheelchair_friendly ? <span style={styles.badge}>♿</span> : null}
                                        {a.child_friendly ? <span style={styles.badge}>👶</span> : null}
                                      </div>
                                      <div style={styles.activitySub}>📍 {a.address}</div>
                                      {a.tags && a.tags.length > 0 && (
                                        <div style={styles.tagWrap}>
                                          {a.tags.slice(0,6).map((t,idx)=> (
                                            <span key={idx} style={styles.tagChip}>{tagEmoji(String(t).toLowerCase())} {t}</span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  ))
                                )}
                              </div>
                            ))}
                          </div>
                        </section>
                      ))}
                    </div>

                    <h4 style={styles.sectionTitle}>🍽️ Restaurants & cafés</h4>
                    <section style={styles.dayCard}>
                      <div style={{ padding: '10px 12px 12px' }}>
                        {resp.restaurants.length === 0 ? (
                          <div style={styles.emptyRow}>—</div>
                        ) : (
                          resp.restaurants.map((r,i)=>(
                            <div key={i} style={styles.activityRow}>
                              <div style={styles.activityMain}>
                                <span style={{ marginRight: 8 }}>🍽️</span>
                                <span style={{ fontWeight: 600 }}>{r.title}</span>
                              </div>
                              <div style={styles.activityMeta}>
                                <span style={styles.badge}>{r.price_tier}</span>
                                {Array.isArray(r.tags) && r.tags.length > 0 && (
                                  <>
                                    {r.tags.slice(0, 4).map((t,idx)=> (
                                      <span key={idx} style={styles.badge}>{String(t)}</span>
                                    ))}
                                  </>
                                )}
                              </div>
                              <div style={styles.activitySub}>📍 {r.address}</div>
                            </div>
                          ))
                        )}
                      </div>
                    </section>

                    <h4 style={styles.sectionTitle}>🎒 Packing checklist</h4>
                    <section style={styles.dayCard}>
                      <div style={{ padding: '10px 12px 12px' }}>
                        {resp.packing_checklist.length === 0 ? (
                          <div style={styles.emptyRow}>—</div>
                        ) : (
                          <div style={styles.tagWrap}>
                            {resp.packing_checklist.map((p,i)=> (
                              <span key={i} style={styles.tagChip}>🧳 {p}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </section>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Sticky footer with the Send/Get Plan button */}
          <div style={styles.footerBar}>
            <button onClick={callAgent} disabled={loading} style={styles.primary}>
              {loading ? "Thinking…" : "Get plan 🚀"}
            </button>
          </div>
        </aside>
      )}
    </>
  );
}

const styles = {
  fab: {
    position: "fixed", right: 16, bottom: 16, zIndex: 9999,
    borderRadius: 9999,
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    padding: "10px 14px",
    boxShadow: "0 8px 24px rgba(0,0,0,.15)", border: "none",
    background: "linear-gradient(135deg,#ff4b6e,#ff385c)", color: "white", fontWeight: 700, cursor: "pointer",
    fontSize: 14,
  },
  panel: {
    position: "fixed", top: 0, right: 0, height: "100vh",
    width: "min(520px, 100vw)", background: "white",
    boxShadow: "-8px 0 24px rgba(0,0,0,.12)", zIndex: 10000,
    display: "flex", flexDirection: "column",
  },
  header: { padding: 16, borderBottom: "1px solid #eee",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            background: "linear-gradient(180deg, #f9fafb, #ffffff)" },
  title: { margin: 0, fontSize: 20 },
  subtitle: { margin: "4px 0 0 0", color: "#6b7280", fontSize: 13 },
  close: { border: "1px solid #ddd", borderRadius: 8, background: "white", padding: "6px 10px", cursor: "pointer" },

  // scrollable middle area (form + results)
  scrollArea: { flex: 1, overflowY: "auto", scrollBehavior: "smooth" },

  row: { display: "grid", gap: 6 },
  label: { fontSize: 13, color: "#374151" },
  input: { width: "100%", border: "1px solid #e5e7eb", borderRadius: 10, padding: "12px 14px", fontSize: 15 },

  fieldset: { border: "1px solid #e5e7eb", borderRadius: 8, padding: 10 },
  legend: { fontSize: 13, color: "#374151", padding: "0 6px" },
  chipWrap: { display: "flex", flexWrap: "wrap", gap: 8 },
  chip: { border: "1px solid", borderRadius: 999, padding: "8px 12px", background: "white", cursor: "pointer", fontSize: 14 },

  alert: { border: "1px solid #fecaca", background: "#fee2e2", padding: 10, borderRadius: 8, color: "#7f1d1d" },

  results: { padding: 16 },
  sectionTitle: { fontSize: 16, margin: "16px 0 8px" },
  meta: { color: "#6b7280" },

  itineraryGrid: { display: "grid", gap: 12 },
  dayCard: { border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden", background: "white" },
  dayHeader: { padding: "10px 12px", background: "#f9fafb", borderBottom: "1px solid #eef2f7" },
  slotBlock: { paddingTop: 6, paddingBottom: 8 },
  slotTitle: { fontSize: 13, color: "#374151", marginBottom: 6 },
  activityRow: { padding: 10, border: "1px solid #f3f4f6", borderRadius: 10, marginBottom: 8, background: "#ffffff" },
  activityMain: { display: "flex", alignItems: "center", marginBottom: 6 },
  activityMeta: { display: "flex", gap: 6, marginBottom: 6 },
  badge: { display: "inline-block", padding: "2px 8px", borderRadius: 999, background: "#f3f4f6", fontSize: 12 },
  activitySub: { color: "#6b7280", fontSize: 12, marginBottom: 6 },
  tagWrap: { display: "flex", flexWrap: "wrap", gap: 6 },
  tagChip: { fontSize: 12, padding: "3px 8px", borderRadius: 999, background: "#f9fafb", border: "1px solid #eef2f7" },
  emptyRow: { color: "#9ca3af", padding: "2px 0 8px" },

  // sticky footer with the button always visible
  footerBar: {
    position: "sticky",
    bottom: 0,
    background: "white",
    padding: 12,
    borderTop: "1px solid #f3f4f6",
  },

  primary: {
    width: "100%",
    padding: "14px 16px",
    borderRadius: 12,
    border: "1px solid #111827",
    background: "linear-gradient(135deg,#111827,#4b5563)",
    color: "white",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 16,
  },
};
