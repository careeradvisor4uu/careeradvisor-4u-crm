import { useEffect, useState, useRef } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import { Phone, MessageSquare, Plus, LogOut, Upload, X, Edit2, Trash2, CheckCircle, Clock, Users, TrendingUp } from "lucide-react";

const API_URL = "https://careeradvisor-4u-crm-1.onrender.com/api";

function statusBadge(s) {
  const map = {
    New: "badge-new", Contacted: "badge-contacted", Interested: "badge-interested",
    "Not Interested": "badge-notinterested", Closed: "badge-closed", Converted: "badge-converted",
  };
  return map[s] || "badge-new";
}

function followupClass(date) {
  if (!date) return "";
  const d = new Date(date);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.floor((d - today) / 86400000);
  if (diff < 0) return "overdue";
  if (diff <= 2) return "soon";
  return "";
}

// ── User Management Modal ─────────────────────────────────────
function UserManagementModal({ onClose, token }) {
  const headers = { Authorization: `Bearer ${token}` };
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "caller" });
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchUsers(); }, []);

  async function fetchUsers() {
    try {
      const res = await axios.get(`${API_URL}/users`, { headers });
      setUsers(res.data);
    } catch { setError("Failed to load users"); }
  }

  async function createUser(e) {
    e.preventDefault();
    setLoading(true); setMsg(""); setError("");
    try {
      await axios.post(`${API_URL}/users`, form, { headers });
      setMsg(`✅ User "${form.name}" created successfully!`);
      setForm({ name: "", email: "", password: "", role: "caller" });
      fetchUsers();
    } catch (err) {
      setError(err.response?.data || "Error creating user");
    } finally { setLoading(false); }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <h2>👥 Manage Users</h2>
          <button className="close-btn" onClick={onClose}><X size={16} /></button>
        </div>
        <div style={{marginBottom:"24px"}}>
          <h3 style={{marginBottom:"12px", fontSize:"14px", fontWeight:"600"}}>Create New User</h3>
          <form onSubmit={createUser}>
            <div className="form-grid">
              <div className="form-group">
                <label>Full Name *</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                  placeholder="e.g. Ravi Kumar" required />
              </div>
              <div className="form-group">
                <label>Email *</label>
                <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                  placeholder="ravi@example.com" required />
              </div>
              <div className="form-group">
                <label>Password *</label>
                <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})}
                  placeholder="••••••••" required />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                  <option value="caller">Caller</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            {msg && <div style={{color:"green",marginBottom:"10px"}}>{msg}</div>}
            {error && <div className="error-msg">⚠️ {error}</div>}
            <div className="modal-actions">
              <button className="btn btn-primary" type="submit" disabled={loading}>
                {loading ? <span className="spinner" /> : "➕ Create User"}
              </button>
            </div>
          </form>
        </div>
        <div>
          <h3 style={{marginBottom:"12px", fontSize:"14px", fontWeight:"600"}}>
            Existing Users ({users.length})
          </h3>
          <div style={{overflowX:"auto"}}>
            <table>
              <thead>
                <tr><th>#</th><th>Name</th><th>Email</th><th>Role</th></tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr><td colSpan={4} className="empty-cell">No users yet</td></tr>
                ) : users.map((u, i) => (
                  <tr key={u._id}>
                    <td className="num-cell">{i + 1}</td>
                    <td><strong>{u.name}</strong></td>
                    <td className="mono">{u.email}</td>
                    <td><span className={`badge ${u.role === "admin" ? "badge-converted" : "badge-contacted"}`}>
                      {u.role}
                    </span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Forgot Password Page ──────────────────────────────────────
function ForgotPasswordPage({ onBack }) {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setMsg(""); setError("");
    try {
      await axios.post(`${API_URL}/forgot-password`, { email });
      setMsg("✅ Reset email sent! Check your inbox.");
    } catch (err) {
      setError(err.response?.data || "Something went wrong");
    } finally { setLoading(false); }
  }

  return (
    <div className="login-bg">
      <div className="login-card">
        <div className="login-logo">🔐</div>
        <h1 className="login-title">Forgot Password</h1>
        <p className="login-sub">Enter your email to receive a reset link</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com" required />
          </div>
          {msg && <div style={{color:"green",marginBottom:"10px"}}>{msg}</div>}
          {error && <div className="error-msg">⚠️ {error}</div>}
          <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
            {loading ? <span className="spinner" /> : "Send Reset Link"}
          </button>
        </form>
        <p style={{textAlign:"center",marginTop:"16px"}}>
          <button className="btn btn-ghost btn-sm" onClick={onBack}>← Back to Login</button>
        </p>
      </div>
    </div>
  );
}

// ── Reset Password Page ───────────────────────────────────────
function ResetPasswordPage({ token, onBack }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords do not match"); return; }
    setLoading(true); setMsg(""); setError("");
    try {
      await axios.post(`${API_URL}/reset-password/${token}`, { password });
      setMsg("✅ Password reset successful! You can now login.");
    } catch (err) {
      setError(err.response?.data || "Invalid or expired link");
    } finally { setLoading(false); }
  }

  return (
    <div className="login-bg">
      <div className="login-card">
        <div className="login-logo">🔑</div>
        <h1 className="login-title">Reset Password</h1>
        <p className="login-sub">Enter your new password</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>New Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" required />
          </div>
          <div className="form-group">
            <label>Confirm Password</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
              placeholder="••••••••" required />
          </div>
          {msg && <div style={{color:"green",marginBottom:"10px"}}>{msg}</div>}
          {error && <div className="error-msg">⚠️ {error}</div>}
          <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
            {loading ? <span className="spinner" /> : "Reset Password"}
          </button>
        </form>
        <p style={{textAlign:"center",marginTop:"16px"}}>
          <button className="btn btn-ghost btn-sm" onClick={onBack}>← Back to Login</button>
        </p>
      </div>
    </div>
  );
}

// ── Login Page ────────────────────────────────────────────────
function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  if (showForgot) return <ForgotPasswordPage onBack={() => setShowForgot(false)} />;

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await axios.post(`${API_URL}/login`, { email, password });
      localStorage.setItem("crm_token", res.data.token);
      localStorage.setItem("crm_user", JSON.stringify(res.data.user));
      onLogin(res.data.user);
    } catch {
      setError("Invalid email or password");
    } finally { setLoading(false); }
  }

  return (
    <div className="login-bg">
      <div className="login-card">
        <div className="login-logo">⚡</div>
        <h1 className="login-title">Career Advisor 4U</h1>
        <p className="login-sub">Sign in to your CRM</p>
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com" required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" required />
          </div>
          {error && <div className="error-msg">⚠️ {error}</div>}
          <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
            {loading ? <span className="spinner" /> : "Sign In"}
          </button>
        </form>
        <p style={{textAlign:"center",marginTop:"12px"}}>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowForgot(true)}>
            Forgot password?
          </button>
        </p>
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────
export default function App() {
  const urlToken = window.location.pathname.startsWith("/reset-password/")
    ? window.location.pathname.split("/reset-password/")[1]
    : null;

  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("crm_user")); } catch { return null; }
  });
  const [leads, setLeads] = useState([]);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showUsers, setShowUsers] = useState(false);
  const [editLead, setEditLead] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [toast, setToast] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", status: "", followUp: "" });
  const fileRef = useRef();

  const token = localStorage.getItem("crm_token");
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => { if (user) fetchLeads(); }, [user]);

  async function fetchLeads() {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/leads`, { headers });
      setLeads(res.data);
    } catch { showToast("❌ Failed to load leads"); }
    finally { setLoading(false); }
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  function logout() {
    localStorage.removeItem("crm_token");
    localStorage.removeItem("crm_user");
    setUser(null);
  }

  function openAdd() {
    setEditLead(null);
    setForm({ name: "", phone: "", status: "New", followUp: "" });
    setShowModal(true);
  }

  function openEdit(lead) {
    setEditLead(lead);
    setForm({ name: lead.name, phone: lead.phone, status: lead.status, followUp: lead.followUp || "" });
    setShowModal(true);
  }

  async function saveLead() {
    if (!form.name || !form.phone) { showToast("⚠️ Name and phone required"); return; }
    try {
      if (editLead) {
        await axios.put(`${API_URL}/leads/${editLead._id}`, form, { headers });
        showToast("✏️ Lead updated");
      } else {
        await axios.post(`${API_URL}/leads`, form, { headers });
        showToast("✅ Lead added");
      }
      setShowModal(false);
      fetchLeads();
    } catch (e) {
      showToast("❌ " + (e.response?.data || e.message));
    }
  }

  async function deleteLead(id) {
    if (!confirm("Delete this lead?")) return;
    try {
      await axios.delete(`${API_URL}/leads/${id}`, { headers });
      showToast("🗑️ Deleted");
      fetchLeads();
    } catch { showToast("❌ Delete failed"); }
  }

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const wb = XLSX.read(ev.target.result, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
      const mapped = rows.map(r => ({
        name: String(r.Name || r.name || "").trim(),
        phone: String(r.Phone || r.phone || r.Number || r.number || "").trim(),
        status: String(r.Status || r.status || "New").trim() || "New",
        followUp: String(r.FollowUp || r.followUp || r.Followup || r["Follow-up"] || "").trim(),
      })).filter(r => r.name && r.phone);
      setPreviewData(mapped);
    };
    reader.readAsBinaryString(file);
  }

  async function importLeads() {
    let success = 0;
    for (const lead of previewData) {
      try { await axios.post(`${API_URL}/leads`, lead, { headers }); success++; }
      catch {}
    }
    showToast(`✅ ${success} leads imported!`);
    setPreviewData([]);
    setShowUpload(false);
    fetchLeads();
  }

  const filtered = leads.filter(l => {
    const matchFilter = filter === "All" || l.status === filter;
    const matchSearch = l.name?.toLowerCase().includes(search.toLowerCase()) ||
                        l.phone?.includes(search);
    return matchFilter && matchSearch;
  });

  const stats = {
    total: leads.length,
    interested: leads.filter(l => l.status === "Interested").length,
    converted: leads.filter(l => l.status === "Converted" || l.status === "Closed").length,
    contacted: leads.filter(l => l.status === "Contacted").length,
  };

  if (urlToken) return <ResetPasswordPage token={urlToken} onBack={() => window.location.href = "/"} />;
  if (!user) return <LoginPage onLogin={u => { setUser(u); }} />;

  return (
    <div className="app">
      <div className="header">
        <div className="header-left">
          <span className="logo">⚡</span>
          <div>
            <h1 className="app-title">Career Advisor 4U CRM</h1>
            <p className="app-sub">Welcome back, {user.name || user.email}</p>
          </div>
        </div>
        <div className="header-right">
          {user?.role === "admin" && (
            <button className="btn btn-outline btn-sm" onClick={() => setShowUsers(true)}>
              <Users size={14} /> Manage Users
            </button>
          )}
          <button className="btn btn-outline btn-sm" onClick={() => setShowUpload(true)}>
            <Upload size={14} /> Upload Excel
          </button>
          <button className="btn btn-primary btn-sm" onClick={openAdd}>
            <Plus size={14} /> Add Lead
          </button>
          <button className="btn btn-ghost btn-sm" onClick={logout} title="Logout">
            <LogOut size={14} />
          </button>
        </div>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-icon blue"><Users size={18} /></div>
          <div><div className="stat-label">Total Leads</div><div className="stat-value blue">{stats.total}</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><TrendingUp size={18} /></div>
          <div><div className="stat-label">Interested</div><div className="stat-value green">{stats.interested}</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple"><CheckCircle size={18} /></div>
          <div><div className="stat-label">Converted</div><div className="stat-value purple">{stats.converted}</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange"><Clock size={18} /></div>
          <div><div className="stat-label">Contacted</div><div className="stat-value orange">{stats.contacted}</div></div>
        </div>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <span>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or phone..." />
        </div>
        <div className="filter-tabs">
          {["All","New","Contacted","Interested","Not Interested","Closed","Converted"].map(s => (
            <button key={s} className={`filter-tab ${filter === s ? "active" : ""}`} onClick={() => setFilter(s)}>{s}</button>
          ))}
        </div>
        <span className="count-label">{filtered.length} lead{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="table-wrap">
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr><th>#</th><th>Name</th><th>Phone</th><th>Status</th><th>Follow-up</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="empty-cell"><div className="spinner-lg" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="empty-cell">
                  <div className="empty-state"><div className="empty-icon">📭</div><p>No leads found</p></div>
                </td></tr>
              ) : filtered.map((l, i) => {
                const fc = followupClass(l.followUp);
                return (
                  <tr key={l._id}>
                    <td className="num-cell">{i + 1}</td>
                    <td><strong>{l.name}</strong></td>
                    <td className="mono">{l.phone}</td>
                    <td><span className={`badge ${statusBadge(l.status)}`}>{l.status}</span></td>
                    <td>
                      {l.followUp
                        ? <span className={`followup ${fc}`}>📅 {l.followUp}</span>
                        : <span className="muted">—</span>}
                    </td>
                    <td>
                      <div className="action-btns">
                        <button className="btn btn-call btn-xs" onClick={() => window.location.href = `tel:${l.phone}`}>
                          <Phone size={12} /> Call
                        </button>
                        <button className="btn btn-msg btn-xs" onClick={() => window.open(`https://wa.me/91${l.phone}`, "_blank")}>
                          <MessageSquare size={12} /> Message
                        </button>
                        <button className="btn btn-outline btn-xs" onClick={() => openEdit(l)}>
                          <Edit2 size={12} />
                        </button>
                        <button className="btn btn-danger btn-xs" onClick={() => deleteLead(l._id)}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2>{editLead ? "Edit Lead" : "Add New Lead"}</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label>Full Name *</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Ravi Kumar" />
              </div>
              <div className="form-group">
                <label>Phone Number *</label>
                <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="e.g. 9876543210" />
              </div>
             <div className="form-group">
              <label>Status</label>
              <input value={form.status} onChange={e => setForm({...form, status: e.target.value})}
              placeholder="e.g. Interested, Called back..." />
             </div>
              </div>
              <div className="form-group">
                <label>Follow-up Date</label>
                <input type="date" value={form.followUp} onChange={e => setForm({...form, followUp: e.target.value})} />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveLead}>{editLead ? "Update" : "Save Lead"}</button>
            </div>
          </div>
        </div>
      )}

      {showUpload && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowUpload(false)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <h2>📊 Bulk Upload via Excel</h2>
              <button className="close-btn" onClick={() => setShowUpload(false)}><X size={16} /></button>
            </div>
            <p className="upload-hint">Columns required: <strong>Name, Phone, Status, FollowUp</strong></p>
            <div className="upload-zone" onClick={() => fileRef.current.click()}>
              <div className="upload-icon">📊</div>
              <p><strong>Click to choose</strong> or drag & drop Excel file</p>
              <p className="upload-sub">Supports .xlsx and .xls</p>
              <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{display:"none"}} onChange={handleFile} />
            </div>
            {previewData.length > 0 && (
              <>
                <div className="preview-header">
                  <span>{previewData.length} leads ready to import</span>
                  <div style={{display:"flex",gap:"8px"}}>
                    <button className="btn btn-outline btn-sm" onClick={() => setPreviewData([])}>Clear</button>
                    <button className="btn btn-primary btn-sm" onClick={importLeads}>✓ Import All</button>
                  </div>
                </div>
                <div className="preview-table-wrap">
                  <table>
                    <thead><tr><th>Name</th><th>Phone</th><th>Status</th><th>Follow-up</th></tr></thead>
                    <tbody>
                      {previewData.map((r, i) => (
                        <tr key={i}>
                          <td>{r.name}</td><td>{r.phone}</td>
                          <td><span className={`badge ${statusBadge(r.status)}`}>{r.status}</span></td>
                          <td>{r.followUp || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showUsers && user?.role === "admin" && (
        <UserManagementModal onClose={() => setShowUsers(false)} token={token} />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
