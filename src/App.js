import { useEffect, useState, useRef } from "react";
import { Preferences } from "@capacitor/preferences";

const API = "https://crm-backend-iluw.onrender.com";

const HEADERS = (token) => ({
  "Content-Type": "application/json",
  "ngrok-skip-browser-warning": "true",
  ...(token ? { Authorization: `Bearer ${token}` } : {})
});

const STATUS_COLORS = {
  "New Lead":       { bg: "#1e293b", color: "#94a3b8" },
  "Contacted":      { bg: "#1e3a5f", color: "#38bdf8" },
  "Interested":     { bg: "#14532d", color: "#4ade80" },
  "Not Interested": { bg: "#450a0a", color: "#f87171" },
  "Follow-up":      { bg: "#78350f", color: "#fbbf24" },
  "Converted":      { bg: "#581c87", color: "#c084fc" },
  "Closed":         { bg: "#1e293b", color: "#64748b" },
};

const STATUSES = ["New Lead","Contacted","Interested","Not Interested","Follow-up","Converted","Closed"];

export default function App() {
  const [token, setToken]     = useState(null);
  const [user, setUser]       = useState(null);
  const [leads, setLeads]     = useState([]);
  const [callers, setCallers] = useState([]);
  const [filter, setFilter]   = useState("All");
  const [search, setSearch]   = useState("");
  const [msg, setMsg]         = useState("");
  const [msgType, setMsgType] = useState("success");
  const [showAdd, setShowAdd] = useState(false);
  const [editLead, setEditLead]     = useState(null);
  const [loading, setLoading]       = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [showBulk, setShowBulk]     = useState(false);
  const [bulkLeads, setBulkLeads]   = useState([]);
  const [bulkAssign, setBulkAssign] = useState("");
  const [loginForm, setLoginForm]   = useState({ email:"", password:"" });
  const [regForm, setRegForm]       = useState({ name:"", email:"", password:"", secretCode:"" });
  const [loginError, setLoginError] = useState("");
  const [showRegister, setShowRegister] = useState(false);
  const [form, setForm] = useState({ name:"", phone:"", course:"", college:"", followUpDate:"", callTime:"", notes:"", status:"New Lead", assignedTo:"" });
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [uploadProgress, setUploadProgress] = useState({ active: false, current: 0, total: 0, imported: 0, failed: 0 });
  const notifTimers = useRef({});
  const uploadCancelled = useRef(false);

  const [showUsers, setShowUsers] = useState(false);
  const [newUser, setNewUser] = useState({ name:"", email:"", password:"", role:"agent" });
  const [userMsg, setUserMsg] = useState("");

  // ── Call log modal state ──────────────────────────────────────
  const [callModal, setCallModal] = useState(null); // { lead }
  const [callAnswered, setCallAnswered] = useState(true);
  const [callDuration, setCallDuration] = useState("");
  const callStartTime = useRef(null);

  useEffect(() => {
    const loadAuth = async () => {
      try {
        const { value: t } = await Preferences.get({ key: "crm_token" });
        const { value: u } = await Preferences.get({ key: "crm_user" });
        if (t) setToken(t);
        if (u) setUser(JSON.parse(u));
      } catch (e) {
        console.log("Auth load error:", e);
      }
    };
    loadAuth();
  }, []);

  useEffect(() => {
    if (token) {
      fetchLeads();
      if (user?.role === "admin") fetchCallers();
    }
  }, [token, search]);

  useEffect(() => {
    if (!leads.length) return;
    Object.values(notifTimers.current).forEach(clearTimeout);
    notifTimers.current = {};
    leads.forEach(lead => {
      if (!lead.followUpDate || !lead.callTime) return;
      const target = new Date(`${lead.followUpDate}T${lead.callTime}:00`);
      const diff   = target - new Date();
      if (diff > 0 && diff < 24 * 60 * 60 * 1000) {
        notifTimers.current[lead._id] = setTimeout(() => {
          showMsg(`🔔 Time to call ${lead.name} (${lead.phone})!`, "notif");
        }, diff);
      }
    });
    return () => Object.values(notifTimers.current).forEach(clearTimeout);
  }, [leads]);

  const showMsg = (text, type = "success") => {
    setMsg(text); setMsgType(type);
    setTimeout(() => setMsg(""), 5000);
  };

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/leads?search=${search}`, { headers: HEADERS(token) });
      if (res.status === 401) { logout(); return; }
      const data = await res.json();
      setLeads(Array.isArray(data) ? data : []);
    } catch { showMsg("Cannot connect to server. Is the backend running?", "error"); }
    finally  { setLoading(false); }
  };

  const fetchCallers = async () => {
    try {
      const res  = await fetch(`${API}/api/users`, { headers: HEADERS(token) });
      const data = await res.json();
      setCallers(Array.isArray(data) ? data : []);
    } catch {}
  };

  const login = async () => {
    if (!loginForm.email || !loginForm.password) { setLoginError("Please enter email and password."); return; }
    setLoginError(""); setLoginLoading(true);
    try {
      const res  = await fetch(`${API}/api/login`, { method:"POST", headers: HEADERS(null), body:JSON.stringify(loginForm) });
      const data = await res.json();
      if (data.token) {
        await Preferences.set({ key: "crm_token", value: data.token });
        await Preferences.set({ key: "crm_user", value: JSON.stringify(data.user) });
        setToken(data.token); setUser(data.user);
      } else setLoginError(data.error || "Invalid credentials");
    } catch(e) { setLoginError("Cannot connect to server: " + e.message); }
    finally   { setLoginLoading(false); }
  };

  const register = async () => {
    if (!regForm.name || !regForm.email || !regForm.password || !regForm.secretCode) {
      setLoginError("All fields including secret code are required."); return;
    }
    setLoginLoading(true);
    try {
      const res  = await fetch(`${API}/api/register`, { method:"POST", headers: HEADERS(null), body:JSON.stringify(regForm) });
      const data = await res.json();
      if (data.message) { setShowRegister(false); setLoginError("Account created! Please login."); }
      else setLoginError(data.error || "Registration failed");
    } catch { setLoginError("Cannot connect to server."); }
    finally   { setLoginLoading(false); }
  };

  const logout = async () => {
    await Preferences.remove({ key: "crm_token" });
    await Preferences.remove({ key: "crm_user" });
    setToken(null); setUser(null); setLeads([]);
  };

  const createUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password) {
      setUserMsg("All fields are required."); return;
    }
    try {
      const res  = await fetch(`${API}/api/create-user`, {
        method:"POST", headers: HEADERS(token), body:JSON.stringify(newUser)
      });
      const data = await res.json();
      if (data.user) {
        setUserMsg(`✅ ${data.user.name} created successfully!`);
        setNewUser({ name:"", email:"", password:"", role:"agent" });
        fetchCallers();
      } else setUserMsg(data.error || "Failed to create user");
    } catch { setUserMsg("Cannot connect to server."); }
  };

  const addLead = async () => {
    if (!form.name || !form.phone) { showMsg("Name and phone required!", "error"); return; }
    try {
      const payload = { ...form, assignedTo: form.assignedTo || null };
      const res  = await fetch(`${API}/api/leads`, { method:"POST", headers: HEADERS(token), body:JSON.stringify(payload) });
      const data = await res.json();
      if (data._id) {
        setLeads([data, ...leads]);
        setForm({ name:"", phone:"", course:"", college:"", followUpDate:"", callTime:"", notes:"", status:"New Lead", assignedTo:"" });
        setShowAdd(false); showMsg("Lead added successfully!");
      } else showMsg(data.error || "Failed to add lead", "error");
    } catch { showMsg("Cannot connect to server.", "error"); }
  };

  const updateLead = async (id, updates) => {
    try {
      const existingLead = leads.find(l => l._id === id);
      const payload = {
        ...existingLead,
        ...updates,
        assignedTo: updates.assignedTo !== undefined
          ? (updates.assignedTo || null)
          : (existingLead?.assignedTo?._id || existingLead?.assignedTo || null)
      };
      const res     = await fetch(`${API}/api/leads/${id}`, { method:"PUT", headers: HEADERS(token), body:JSON.stringify(payload) });
      const updated = await res.json();
      if (updated._id) {
        setLeads(leads.map(l => l._id === id ? updated : l));
        setEditLead(null);
      } else {
        showMsg(updated.error || "Failed to update.", "error");
      }
    } catch { showMsg("Failed to update.", "error"); }
  };

  const deleteLead = async (id) => {
    try {
      await fetch(`${API}/api/leads/${id}`, { method:"DELETE", headers: HEADERS(token) });
      setLeads(leads.filter(l => l._id !== id));
      setDeleteConfirm(null);
      showMsg("Lead deleted.");
    } catch { showMsg("Failed to delete.", "error"); }
  };

  // ── Call logging ──────────────────────────────────────────────
  const openCallModal = (lead) => {
    window.open(`tel:${lead.phone}`);
    callStartTime.current = Date.now();
    setCallAnswered(true);
    setCallDuration("");
    setCallModal(lead);
  };

  const submitCallLog = async () => {
    if (!callModal) return;
    const duration = callDuration
      ? parseInt(callDuration, 10)
      : Math.round((Date.now() - callStartTime.current) / 1000);
    try {
      await fetch(`${API}/api/log-call`, {
        method: "POST",
        headers: HEADERS(token),
        body: JSON.stringify({
          callerId:   user._id,
          callerName: user.name,
          date:       new Date().toISOString().split("T")[0],
          duration,
          answered:   callAnswered,
        }),
      });
      showMsg(`📞 Call logged — ${callAnswered ? "Answered" : "Missed"}, ${duration}s`);
    } catch {
      showMsg("Call made but failed to log.", "error");
    }
    setCallModal(null);
  };

  const handleExcelUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    showMsg("Reading file... please wait", "notif");
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const { read, utils } = await import("https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs");
        const wb   = read(ev.target.result, { type:"binary" });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const rows = utils.sheet_to_json(ws);
        const mapped = rows.map(r => ({
          name:         r["Name"]   || r["name"]   || r["NAME"]   || "",
          phone:        String(r["Phone"] || r["phone"] || r["PHONE"] || r["Mobile"] || r["mobile"] || ""),
          course:       r["Course"] || r["course"] || "",
          college:      r["College"]|| r["college"]|| "",
          notes:        r["Notes"]  || r["notes"]  || "",
          followUpDate: r["FollowUpDate"] || r["Follow Up Date"] || "",
          callTime:     r["CallTime"] || r["Call Time"] || "",
          status:       r["Status"] || r["status"] || "New Lead",
          assignedTo:   null
        })).filter(r => r.name || r.phone);
        showMsg(`✅ Found ${mapped.length.toLocaleString()} leads in file`, "success");
        setBulkLeads(mapped);
        setShowBulk(true);
      } catch (err) {
        showMsg("Failed to read Excel file. Make sure it's .xlsx or .xls", "error");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  const submitBulk = async () => {
    if (!bulkLeads.length) return;
    const CHUNK_SIZE = 500;
    const leadsToSend = bulkLeads.map(l => ({ ...l, assignedTo: bulkAssign || null }));
    const chunks = [];
    for (let i = 0; i < leadsToSend.length; i += CHUNK_SIZE) {
      chunks.push(leadsToSend.slice(i, i + CHUNK_SIZE));
    }
    uploadCancelled.current = false;
    setShowBulk(false);
    setUploadProgress({ active: true, current: 0, total: chunks.length, imported: 0, failed: 0 });
    let totalImported = 0;
    let totalFailed   = 0;
    for (let i = 0; i < chunks.length; i++) {
      if (uploadCancelled.current) {
        showMsg(`⚠️ Upload cancelled. ${totalImported.toLocaleString()} leads saved.`, "error");
        break;
      }
      try {
        const res  = await fetch(`${API}/api/leads/bulk`, {
          method: "POST",
          headers: HEADERS(token),
          body: JSON.stringify({ leads: chunks[i] })
        });
        const data = await res.json();
        if (data.count) { totalImported += data.count; }
        else { totalFailed += chunks[i].length; }
      } catch { totalFailed += chunks[i].length; }
      setUploadProgress({ active: true, current: i + 1, total: chunks.length, imported: totalImported, failed: totalFailed });
      await new Promise(r => setTimeout(r, 200));
    }
    setUploadProgress({ active: false, current: 0, total: 0, imported: 0, failed: 0 });
    setBulkLeads([]);
    setBulkAssign("");
    if (!uploadCancelled.current) {
      showMsg(`🎉 Import complete! ${totalImported.toLocaleString()} leads imported${totalFailed ? `, ${totalFailed} failed` : ""}`, totalFailed ? "error" : "success");
      fetchLeads();
    }
  };

  const cancelUpload = () => { uploadCancelled.current = true; };

  const filteredLeads = leads.filter(l => filter === "All" || l.status === filter);
  const stats = {
    total:      leads.length,
    interested: leads.filter(l => l.status === "Interested").length,
    converted:  leads.filter(l => l.status === "Converted").length,
    followup:   leads.filter(l => l.status === "Follow-up").length,
  };

  const isOverdue = (lead) => {
    if (!lead.followUpDate || !lead.callTime) return false;
    return new Date(`${lead.followUpDate}T${lead.callTime}:00`) < new Date();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    return dateStr.slice(0, 10);
  };

  const s = {
    page:  { padding:"16px", background:"#0a0f1e", minHeight:"100vh", color:"white", fontFamily:"'Segoe UI',sans-serif", maxWidth:"100vw", overflowX:"hidden", boxSizing:"border-box" },
    card:  { background:"#111827", borderRadius:14, border:"1px solid #1e293b" },
    input: { padding:"10px 14px", borderRadius:8, border:"1px solid #1e293b", background:"#0a0f1e", color:"white", fontSize:14, width:"100%", boxSizing:"border-box" },
    btn:   (bg) => ({ padding:"9px 18px", background:bg, color:"white", border:"none", borderRadius:8, cursor:"pointer", fontWeight:600, fontSize:13, display:"flex", alignItems:"center", gap:5 }),
  };

  if (!token) return (
    <div style={{...s.page, display:"flex", alignItems:"center", justifyContent:"center"}}>
      <div style={{...s.card, width:"100%", maxWidth:400, padding:32}}>
        <div style={{display:"flex", alignItems:"center", gap:10, marginBottom:4}}>
          <span style={{fontSize:28}}>⚡</span>
          <h2 style={{color:"#6366f1", margin:0, fontSize:22}}>Career Advisor 4U CRM</h2>
        </div>
        <p style={{color:"#64748b", marginBottom:24, fontSize:13}}>
          {showRegister ? "Create your caller account" : "Sign in to continue"}
        </p>
        {showRegister ? (<>
          {[["name","Full Name"],["email","Email"],["password","Password"]].map(([f,p])=>(
            <input key={f} placeholder={p} type={f==="password"?"password":"text"} value={regForm[f]}
              onChange={e=>setRegForm({...regForm,[f]:e.target.value})}
              style={{...s.input,marginBottom:10}} onKeyDown={e=>e.key==="Enter"&&register()}/>
          ))}
          <input placeholder="Secret Code (ask your admin)" type="password" value={regForm.secretCode}
            onChange={e=>setRegForm({...regForm,secretCode:e.target.value})}
            style={{...s.input,marginBottom:6}} onKeyDown={e=>e.key==="Enter"&&register()}/>
          <p style={{color:"#475569",fontSize:11,marginBottom:16}}>🔐 You need a secret code from your admin to register.</p>
          <button onClick={register} disabled={loginLoading} style={{...s.btn("#6366f1"),width:"100%",justifyContent:"center",marginBottom:8}}>
            {loginLoading?"Creating...":"Create Caller Account"}
          </button>
          <button onClick={()=>setShowRegister(false)} style={{...s.btn("#1e293b"),width:"100%",justifyContent:"center"}}>Back to Login</button>
        </>) : (<>
          <input placeholder="Email" value={loginForm.email} onChange={e=>setLoginForm({...loginForm,email:e.target.value})} style={{...s.input,marginBottom:10}} onKeyDown={e=>e.key==="Enter"&&login()}/>
          <input placeholder="Password" type="password" value={loginForm.password} onChange={e=>setLoginForm({...loginForm,password:e.target.value})} style={{...s.input,marginBottom:20}} onKeyDown={e=>e.key==="Enter"&&login()}/>
          <button onClick={login} disabled={loginLoading} style={{...s.btn("#6366f1"),width:"100%",justifyContent:"center",marginBottom:8}}>
            {loginLoading?"Signing in...":"Login"}
          </button>
          <button onClick={()=>setShowRegister(true)} style={{...s.btn("#1e293b"),width:"100%",justifyContent:"center"}}>
            New Caller? Register Here
          </button>
        </>)}
        {loginError && <p style={{color:loginError.includes("created")?"#4ade80":"#f87171",marginTop:10,fontSize:13}}>{loginError}</p>}
      </div>
    </div>
  );

  const progressPct = uploadProgress.total > 0 ? Math.round((uploadProgress.current / uploadProgress.total) * 100) : 0;

  return (
    <div style={s.page}>

      {/* ── Call Log Modal ── */}
      {callModal && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:400}}>
          <div style={{...s.card,padding:28,width:340,maxWidth:"92vw",textAlign:"center"}}>
            <div style={{fontSize:40,marginBottom:8}}>📞</div>
            <h3 style={{margin:"0 0 4px",color:"white"}}>Log this call</h3>
            <p style={{color:"#64748b",fontSize:13,marginBottom:20}}>{callModal.name} · {callModal.phone}</p>

            <p style={{color:"#94a3b8",fontSize:12,marginBottom:8,textAlign:"left"}}>Did they answer?</p>
            <div style={{display:"flex",gap:10,marginBottom:16}}>
              <button onClick={()=>setCallAnswered(true)}
                style={{...s.btn(callAnswered?"#14532d":"#1e293b"),flex:1,justifyContent:"center",border:callAnswered?"1px solid #4ade80":"1px solid transparent"}}>
                ✅ Answered
              </button>
              <button onClick={()=>setCallAnswered(false)}
                style={{...s.btn(!callAnswered?"#450a0a":"#1e293b"),flex:1,justifyContent:"center",border:!callAnswered?"1px solid #f87171":"1px solid transparent"}}>
                ❌ Missed
              </button>
            </div>

            <p style={{color:"#94a3b8",fontSize:12,marginBottom:8,textAlign:"left"}}>Duration (seconds) — leave blank to auto-calculate</p>
            <input
              type="number"
              placeholder="e.g. 120"
              value={callDuration}
              onChange={e=>setCallDuration(e.target.value)}
              style={{...s.input,marginBottom:20}}
            />

            <div style={{display:"flex",gap:10}}>
              <button onClick={submitCallLog} style={{...s.btn("#6366f1"),flex:1,justifyContent:"center"}}>💾 Save Log</button>
              <button onClick={()=>setCallModal(null)} style={{...s.btn("#1e293b"),flex:1,justifyContent:"center"}}>Skip</button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Progress Modal */}
      {uploadProgress.active && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.9)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300}}>
          <div style={{...s.card,padding:36,width:420,maxWidth:"92vw",textAlign:"center"}}>
            <div style={{fontSize:40,marginBottom:12}}>📥</div>
            <h3 style={{margin:"0 0 6px",color:"white",fontSize:18}}>Importing Leads...</h3>
            <p style={{color:"#64748b",fontSize:13,marginBottom:24}}>Please keep the app open. Do not close or navigate away.</p>
            <div style={{background:"#1e293b",borderRadius:999,height:14,marginBottom:12,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${progressPct}%`,background:progressPct===100?"#4ade80":"linear-gradient(90deg,#6366f1,#818cf8)",borderRadius:999,transition:"width 0.3s ease"}}/>
            </div>
            <p style={{color:"#6366f1",fontWeight:700,fontSize:22,margin:"0 0 4px"}}>{progressPct}%</p>
            <p style={{color:"#94a3b8",fontSize:13,margin:"0 0 16px"}}>Batch {uploadProgress.current} of {uploadProgress.total}</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:24}}>
              <div style={{background:"#0a0f1e",borderRadius:8,padding:"10px 8px"}}>
                <p style={{margin:0,color:"#64748b",fontSize:10,letterSpacing:1}}>TOTAL</p>
                <p style={{margin:0,color:"white",fontWeight:700,fontSize:16}}>{(uploadProgress.total*500).toLocaleString()}</p>
              </div>
              <div style={{background:"#0a0f1e",borderRadius:8,padding:"10px 8px"}}>
                <p style={{margin:0,color:"#64748b",fontSize:10,letterSpacing:1}}>IMPORTED</p>
                <p style={{margin:0,color:"#4ade80",fontWeight:700,fontSize:16}}>{uploadProgress.imported.toLocaleString()}</p>
              </div>
              <div style={{background:"#0a0f1e",borderRadius:8,padding:"10px 8px"}}>
                <p style={{margin:0,color:"#64748b",fontSize:10,letterSpacing:1}}>FAILED</p>
                <p style={{margin:0,color:uploadProgress.failed>0?"#f87171":"#475569",fontWeight:700,fontSize:16}}>{uploadProgress.failed.toLocaleString()}</p>
              </div>
            </div>
            <p style={{color:"#475569",fontSize:12,marginBottom:20}}>⏱ Est. time remaining: ~{Math.max(0,Math.round((uploadProgress.total-uploadProgress.current)*0.7))}s</p>
            <button onClick={cancelUpload} style={{...s.btn("#450a0a"),justifyContent:"center",width:"100%"}}>⛔ Cancel Upload</button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200}}>
          <div style={{...s.card,padding:28,width:320,maxWidth:"90vw",textAlign:"center"}}>
            <div style={{fontSize:36,marginBottom:12}}>🗑️</div>
            <h3 style={{margin:"0 0 8px",color:"white"}}>Delete Lead?</h3>
            <p style={{color:"#64748b",fontSize:13,marginBottom:20}}>This action cannot be undone.</p>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>deleteLead(deleteConfirm)} style={{...s.btn("#450a0a"),flex:1,justifyContent:"center"}}>Yes, Delete</button>
              <button onClick={()=>setDeleteConfirm(null)} style={{...s.btn("#1e293b"),flex:1,justifyContent:"center"}}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:10}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:24}}>⚡</span>
          <div>
            <h1 style={{margin:0,fontSize:18,color:"#6366f1",fontWeight:700}}>Career Advisor 4U CRM</h1>
            <p style={{margin:0,color:"#64748b",fontSize:12}}>Welcome, {user?.name} · <span style={{color:"#6366f1",textTransform:"capitalize"}}>{user?.role}</span></p>
          </div>
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          <button onClick={()=>setShowAdd(true)} style={s.btn("#6366f1")}>＋ Add Lead</button>
          {user?.role==="admin" && (<>
            <label style={{...s.btn("#0f766e"),cursor:"pointer"}}>
              📥 Import Excel
              <input type="file" accept=".xlsx,.xls,.csv" onChange={handleExcelUpload} style={{display:"none"}}/>
            </label>
            <button onClick={()=>{ setShowUsers(true); setUserMsg(""); }} style={s.btn("#7c3aed")}>👥 Manage Users</button>
          </>)}
          <button onClick={fetchLeads} style={s.btn("#1e3a5f")}>🔄 Refresh</button>
          <button onClick={logout} style={s.btn("#1e293b")}>⎋ Logout</button>
        </div>
      </div>

      {/* Stats cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10,marginBottom:20}}>
        {[
          {label:"TOTAL LEADS", value:stats.total,      icon:"👥", color:"#6366f1"},
          {label:"INTERESTED",  value:stats.interested,  icon:"📈", color:"#4ade80"},
          {label:"CONVERTED",   value:stats.converted,   icon:"✅", color:"#c084fc"},
          {label:"FOLLOW-UP",   value:stats.followup,    icon:"🔔", color:"#fb923c"},
        ].map(({label,value,icon,color})=>(
          <div key={label} style={{...s.card,padding:"14px 16px",display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:38,height:38,borderRadius:10,background:color+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{icon}</div>
            <div>
              <p style={{margin:0,color:"#64748b",fontSize:10,letterSpacing:1}}>{label}</p>
              <p style={{margin:0,fontSize:22,fontWeight:700,color}}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search & Filter */}
      <div style={{display:"flex",gap:10,marginBottom:16,alignItems:"center",flexWrap:"wrap"}}>
        <div style={{position:"relative",flex:1,minWidth:160}}>
          <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"#64748b"}}>🔍</span>
          <input placeholder="Search name or phone..." value={search} onChange={e=>setSearch(e.target.value)} style={{...s.input,paddingLeft:36}}/>
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {["All",...STATUSES].map(st=>(
            <button key={st} onClick={()=>setFilter(st)}
              style={{padding:"7px 14px",borderRadius:20,border:`1px solid ${filter===st?"#6366f1":"#1e293b"}`,
                background:filter===st?"#6366f1":"transparent",color:filter===st?"white":"#94a3b8",cursor:"pointer",fontSize:12}}>
              {st}
            </button>
          ))}
        </div>
        <span style={{color:"#64748b",fontSize:13,whiteSpace:"nowrap"}}>{filteredLeads.length} leads</span>
      </div>

      {msg && (
        <div style={{background:msgType==="error"?"#450a0a":msgType==="notif"?"#1e3a5f":"#14532d",
          color:msgType==="error"?"#f87171":msgType==="notif"?"#38bdf8":"#4ade80",
          padding:"10px 16px",borderRadius:8,marginBottom:16,fontSize:13,fontWeight:600}}>
          {msgType==="error"?"❌ ":msgType==="notif"?"🔔 ":"✅ "}{msg}
        </div>
      )}

      {/* Table */}
      <div style={{...s.card,overflowX:"auto",width:"100%"}}>
        {loading ? <p style={{padding:40,textAlign:"center",color:"#475569"}}>Loading leads...</p> : (
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:900}}>
            <thead>
              <tr style={{borderBottom:"1px solid #1e293b"}}>
                {["#","NAME","PHONE","COURSE","STATUS","FOLLOW-UP","CALL TIME","ASSIGNED TO","ACTIONS"].map(h=>(
                  <th key={h} style={{padding:"12px 10px",textAlign:"left",color:"#475569",fontSize:11,letterSpacing:1,fontWeight:600,whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead,i) => {
                const overdue = isOverdue(lead);
                return (
                  <tr key={lead._id}
                    style={{borderBottom:"1px solid #0f172a",background:overdue?"rgba(239,68,68,0.06)":"transparent",transition:"background .15s"}}
                    onMouseEnter={e=>e.currentTarget.style.background=overdue?"rgba(239,68,68,0.12)":"#1a2236"}
                    onMouseLeave={e=>e.currentTarget.style.background=overdue?"rgba(239,68,68,0.06)":"transparent"}>
                    <td style={{padding:"12px 10px",color:"#475569",fontSize:13}}>{i+1}</td>
                    <td style={{padding:"12px 10px"}}>
                      <span style={{fontWeight:600,color:"white"}}>{lead.name}</span>
                      {lead.notes && <p style={{margin:"2px 0 0",color:"#64748b",fontSize:11}}>{lead.notes}</p>}
                    </td>
                    <td style={{padding:"12px 10px",color:"#94a3b8",fontSize:13,whiteSpace:"nowrap"}}>{lead.phone}</td>
                    <td style={{padding:"12px 10px",color:"#64748b",fontSize:13}}>{lead.course||"—"}</td>
                    <td style={{padding:"12px 10px"}}>
                      <select value={lead.status} onChange={e=>updateLead(lead._id,{status:e.target.value})}
                        style={{padding:"4px 8px",borderRadius:20,border:"none",fontSize:12,fontWeight:600,cursor:"pointer",
                          background:(STATUS_COLORS[lead.status]||STATUS_COLORS["New Lead"]).bg,
                          color:(STATUS_COLORS[lead.status]||STATUS_COLORS["New Lead"]).color}}>
                        {STATUSES.map(st=><option key={st} value={st}>{st}</option>)}
                      </select>
                    </td>
                    <td style={{padding:"12px 10px",color:lead.followUpDate?"#f59e0b":"#475569",fontSize:13,whiteSpace:"nowrap"}}>
                      {formatDate(lead.followUpDate) ? `📅 ${formatDate(lead.followUpDate)}` : "—"}
                    </td>
                    <td style={{padding:"12px 10px",whiteSpace:"nowrap"}}>
                      {lead.callTime ? (
                        <span style={{color:overdue?"#f87171":"#38bdf8",fontWeight:600,fontSize:13}}>
                          {overdue?"🔴":"⏰"} {lead.callTime}
                          {overdue && <span style={{color:"#f87171",fontSize:10,display:"block",marginTop:1}}>OVERDUE</span>}
                        </span>
                      ) : "—"}
                    </td>
                    <td style={{padding:"12px 10px"}}>
                      {user?.role==="admin" ? (
                        <select value={lead.assignedTo?._id||""}
                          onChange={e=>updateLead(lead._id,{assignedTo:e.target.value||null})}
                          style={{padding:"5px 8px",borderRadius:6,border:"1px solid #1e293b",background:"#0a0f1e",color:"white",fontSize:12,cursor:"pointer"}}>
                          <option value="">Unassigned</option>
                          {callers.map(c=><option key={c._id} value={c._id}>{c.name}</option>)}
                        </select>
                      ) : (
                        <span style={{color:"#94a3b8",fontSize:13}}>{lead.assignedTo?.name||"Unassigned"}</span>
                      )}
                    </td>
                    <td style={{padding:"12px 10px"}}>
                      <div style={{display:"flex",gap:4}}>
                        {/* 📞 Now opens call + shows log modal */}
                        <button onClick={()=>openCallModal(lead)}
                          style={{padding:"5px 8px",background:"#14532d",color:"#4ade80",border:"none",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:600}}>📞</button>
                        <button onClick={()=>window.open(`https://wa.me/91${lead.phone}`)}
                          style={{padding:"5px 8px",background:"#1e3a5f",color:"#38bdf8",border:"none",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:600}}>💬</button>
                        <button onClick={()=>window.open(`sms:${lead.phone}`)}
                          style={{padding:"5px 8px",background:"#2d1f4e",color:"#a78bfa",border:"none",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:600}}>✉️</button>
                        <button onClick={()=>setEditLead({...lead, assignedTo: lead.assignedTo?._id||lead.assignedTo||""})}
                          style={{padding:"5px 8px",background:"#1e293b",color:"#94a3b8",border:"none",borderRadius:6,cursor:"pointer",fontSize:13}}>✏️</button>
                        {user?.role==="admin" && (
                          <button onClick={()=>setDeleteConfirm(lead._id)}
                            style={{padding:"5px 8px",background:"#450a0a",color:"#f87171",border:"none",borderRadius:6,cursor:"pointer",fontSize:13}}>🗑️</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {!loading && filteredLeads.length===0 && (
          <p style={{padding:40,textAlign:"center",color:"#475569"}}>No leads found.</p>
        )}
      </div>

      {/* Add Lead Modal */}
      {showAdd && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.8)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100}}>
          <div style={{...s.card,padding:24,width:"95vw",maxWidth:520,maxHeight:"90vh",overflowY:"auto"}}>
            <h3 style={{margin:"0 0 20px",color:"white"}}>➕ Add New Lead</h3>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
              {[["name","Name *"],["phone","Phone *"],["course","Course"],["college","College"]].map(([f,p])=>(
                <input key={f} placeholder={p} value={form[f]} onChange={e=>setForm({...form,[f]:e.target.value})} style={s.input}/>
              ))}
            </div>
            <input placeholder="Notes" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} style={{...s.input,marginBottom:10}}/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
              <div>
                <label style={{color:"#64748b",fontSize:12,display:"block",marginBottom:4}}>Follow-up Date</label>
                <input type="date" value={form.followUpDate} onChange={e=>setForm({...form,followUpDate:e.target.value})} style={s.input}/>
              </div>
              <div>
                <label style={{color:"#64748b",fontSize:12,display:"block",marginBottom:4}}>Call Time 🔔</label>
                <input type="time" value={form.callTime} onChange={e=>setForm({...form,callTime:e.target.value})} style={s.input}/>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>
              <div>
                <label style={{color:"#64748b",fontSize:12,display:"block",marginBottom:4}}>Status</label>
                <select value={form.status} onChange={e=>setForm({...form,status:e.target.value})} style={s.input}>
                  {STATUSES.map(st=><option key={st} value={st}>{st}</option>)}
                </select>
              </div>
              {user?.role==="admin" && (
                <div>
                  <label style={{color:"#64748b",fontSize:12,display:"block",marginBottom:4}}>Assign To</label>
                  <select value={form.assignedTo} onChange={e=>setForm({...form,assignedTo:e.target.value})} style={s.input}>
                    <option value="">Unassigned</option>
                    {callers.map(c=><option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={addLead} style={{...s.btn("#6366f1"),flex:1,justifyContent:"center"}}>+ Add Lead</button>
              <button onClick={()=>setShowAdd(false)} style={{...s.btn("#1e293b"),flex:1,justifyContent:"center"}}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Lead Modal */}
      {editLead && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.8)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100}}>
          <div style={{...s.card,padding:24,width:"95vw",maxWidth:520,maxHeight:"90vh",overflowY:"auto"}}>
            <h3 style={{margin:"0 0 20px",color:"white"}}>✏️ Edit Lead</h3>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
              {[["name","Name"],["phone","Phone"],["course","Course"],["college","College"]].map(([f,p])=>(
                <input key={f} placeholder={p} value={editLead[f]||""} onChange={e=>setEditLead({...editLead,[f]:e.target.value})} style={s.input}/>
              ))}
            </div>
            <input placeholder="Notes" value={editLead.notes||""} onChange={e=>setEditLead({...editLead,notes:e.target.value})} style={{...s.input,marginBottom:10}}/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
              <div>
                <label style={{color:"#64748b",fontSize:12,display:"block",marginBottom:4}}>Follow-up Date</label>
                <input type="date" value={formatDate(editLead.followUpDate)||""} onChange={e=>setEditLead({...editLead,followUpDate:e.target.value})} style={s.input}/>
              </div>
              <div>
                <label style={{color:"#64748b",fontSize:12,display:"block",marginBottom:4}}>Call Time 🔔</label>
                <input type="time" value={editLead.callTime||""} onChange={e=>setEditLead({...editLead,callTime:e.target.value})} style={s.input}/>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>
              <div>
                <label style={{color:"#64748b",fontSize:12,display:"block",marginBottom:4}}>Status</label>
                <select value={editLead.status} onChange={e=>setEditLead({...editLead,status:e.target.value})} style={s.input}>
                  {STATUSES.map(st=><option key={st} value={st}>{st}</option>)}
                </select>
              </div>
              {user?.role==="admin" && (
                <div>
                  <label style={{color:"#64748b",fontSize:12,display:"block",marginBottom:4}}>Assign To</label>
                  <select value={editLead.assignedTo||""} onChange={e=>setEditLead({...editLead,assignedTo:e.target.value})} style={s.input}>
                    <option value="">Unassigned</option>
                    {callers.map(c=><option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>updateLead(editLead._id,editLead)} style={{...s.btn("#6366f1"),flex:1,justifyContent:"center"}}>Save Changes</button>
              <button onClick={()=>setEditLead(null)} style={{...s.btn("#1e293b"),flex:1,justifyContent:"center"}}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showBulk && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100}}>
          <div style={{...s.card,padding:24,width:"95vw",maxWidth:700,maxHeight:"90vh",overflowY:"auto"}}>
            <h3 style={{margin:"0 0 6px",color:"white"}}>📥 Bulk Import — {bulkLeads.length.toLocaleString()} leads found</h3>
            <p style={{color:"#64748b",fontSize:13,marginBottom:4}}>Review leads, choose a caller to assign all, then import.</p>
            {bulkLeads.length > 500 && (
              <div style={{background:"#78350f22",border:"1px solid #fbbf24",borderRadius:8,padding:"8px 12px",marginBottom:12}}>
                <p style={{margin:0,color:"#fbbf24",fontSize:12}}>
                  ⚡ Large dataset detected ({bulkLeads.length.toLocaleString()} leads). Will upload in {Math.ceil(bulkLeads.length/500)} batches of 500. This may take ~{Math.round(bulkLeads.length/500*0.7/60)} minutes.
                </p>
              </div>
            )}
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16,padding:"12px 16px",background:"#0a0f1e",borderRadius:8,border:"1px solid #1e293b"}}>
              <span style={{color:"#94a3b8",fontSize:13,whiteSpace:"nowrap"}}>Assign all to:</span>
              <select value={bulkAssign} onChange={e=>setBulkAssign(e.target.value)} style={{...s.input,flex:1}}>
                <option value="">Unassigned</option>
                {callers.map(c=><option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>
            <div style={{maxHeight:280,overflowY:"auto",border:"1px solid #1e293b",borderRadius:8,marginBottom:16}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead style={{position:"sticky",top:0,background:"#111827"}}>
                  <tr>{["Name","Phone","Course","Status"].map(h=>(
                    <th key={h} style={{padding:"10px 12px",textAlign:"left",color:"#475569",fontSize:11,borderBottom:"1px solid #1e293b"}}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {bulkLeads.slice(0,100).map((l,i)=>(
                    <tr key={i} style={{borderBottom:"1px solid #0f172a"}}>
                      <td style={{padding:"8px 12px",color:"white",fontSize:13}}>{l.name||"—"}</td>
                      <td style={{padding:"8px 12px",color:"#94a3b8",fontSize:13}}>{l.phone||"—"}</td>
                      <td style={{padding:"8px 12px",color:"#64748b",fontSize:13}}>{l.course||"—"}</td>
                      <td style={{padding:"8px 12px",fontSize:12}}>
                        <span style={{padding:"2px 8px",borderRadius:10,background:(STATUS_COLORS[l.status]||STATUS_COLORS["New Lead"]).bg,color:(STATUS_COLORS[l.status]||STATUS_COLORS["New Lead"]).color}}>{l.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {bulkLeads.length>100&&<p style={{padding:"8px 12px",color:"#475569",fontSize:12}}>...and {(bulkLeads.length-100).toLocaleString()} more rows (showing first 100 preview)</p>}
            </div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={submitBulk} style={{...s.btn("#0f766e"),flex:1,justifyContent:"center"}}>📥 Import {bulkLeads.length.toLocaleString()} Leads</button>
              <button onClick={()=>{setShowBulk(false);setBulkLeads([]);}} style={{...s.btn("#1e293b"),flex:1,justifyContent:"center"}}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Users Modal */}
      {showUsers && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100}}>
          <div style={{...s.card,padding:24,width:"95vw",maxWidth:520,maxHeight:"90vh",overflowY:"auto"}}>
            <h3 style={{margin:"0 0 4px",color:"white"}}>👥 Manage Callers</h3>
            <p style={{color:"#64748b",fontSize:13,marginBottom:20}}>Create new caller accounts for your team.</p>
            <div style={{marginBottom:20,border:"1px solid #1e293b",borderRadius:8,overflow:"hidden"}}>
              <div style={{padding:"10px 14px",background:"#0a0f1e",color:"#64748b",fontSize:11,letterSpacing:1,fontWeight:600}}>EXISTING CALLERS ({callers.length})</div>
              {callers.length===0&&<p style={{padding:"12px 14px",color:"#475569",fontSize:13}}>No callers yet.</p>}
              {callers.map(c=>(
                <div key={c._id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",borderTop:"1px solid #1e293b"}}>
                  <div>
                    <span style={{color:"white",fontSize:13,fontWeight:600}}>{c.name}</span>
                    <span style={{color:"#64748b",fontSize:12,marginLeft:8}}>{c.email}</span>
                  </div>
                  <span style={{padding:"2px 10px",borderRadius:10,fontSize:11,fontWeight:600,
                    background:c.role==="admin"?"#312e81":"#1e293b",
                    color:c.role==="admin"?"#a5b4fc":"#94a3b8"}}>
                    {c.role}
                  </span>
                </div>
              ))}
            </div>
            <h4 style={{margin:"0 0 12px",color:"#a78bfa",fontSize:14}}>➕ Create New Caller</h4>
            <input placeholder="Full Name" value={newUser.name} onChange={e=>setNewUser({...newUser,name:e.target.value})} style={{...s.input,marginBottom:10}}/>
            <input placeholder="Email" value={newUser.email} onChange={e=>setNewUser({...newUser,email:e.target.value})} style={{...s.input,marginBottom:10}}/>
            <input placeholder="Password" type="password" value={newUser.password} onChange={e=>setNewUser({...newUser,password:e.target.value})} style={{...s.input,marginBottom:10}}/>
            <select value={newUser.role} onChange={e=>setNewUser({...newUser,role:e.target.value})} style={{...s.input,marginBottom:16}}>
              <option value="agent">Caller (Agent)</option>
              <option value="admin">Admin</option>
            </select>
            {userMsg && (
              <div style={{padding:"8px 12px",borderRadius:6,marginBottom:12,fontSize:13,fontWeight:600,
                background:userMsg.startsWith("✅")?"#14532d":"#450a0a",
                color:userMsg.startsWith("✅")?"#4ade80":"#f87171"}}>
                {userMsg}
              </div>
            )}
            <div style={{display:"flex",gap:10}}>
              <button onClick={createUser} style={{...s.btn("#7c3aed"),flex:1,justifyContent:"center"}}>Create Account</button>
              <button onClick={()=>setShowUsers(false)} style={{...s.btn("#1e293b"),flex:1,justifyContent:"center"}}>Close</button>
            </div>
            <p style={{color:"#475569",fontSize:11,marginTop:12,textAlign:"center"}}>
              🔐 Callers can also self-register using secret code: <strong style={{color:"#a78bfa"}}>CACRM2024</strong>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
