import { useEffect, useState } from "react";
import io from "socket.io-client";
import axios from "axios";
import * as XLSX from "xlsx";
import { Phone, MessageSquare, CheckCircle, Clock, Plus, X, Upload, Users, ChevronDown } from "lucide-react";

const API_URL = "http://localhost:5000/api";
const SOCKET_URL = "http://localhost:5000";

const EMPTY_FORM = {
  name: "", phone: "", marks: "", university: "", followUpDate: "", time: "", status: "",
};

const EMPTY_TC = { name: "", phone: "", email: "" };

export default function App() {
  const [leads, setLeads] = useState([]);
  const [telecallers, setTelecallers] = useState([]);
  const [filter, setFilter] = useState("All");
  const [filterTC, setFilterTC] = useState("All");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showTCPanel, setShowTCPanel] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [tcForm, setTcForm] = useState(EMPTY_TC);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [uploadMsg, setUploadMsg] = useState("");

  useEffect(() => {
    fetchLeads();
    fetchTelecallers();

    const socket = io(SOCKET_URL);
    socket.on("leadUpdated", (updated) => {
      setLeads(prev => prev.map(l => l._id === updated._id ? updated : l));
    });
    return () => socket.disconnect();
  }, []);

  const fetchLeads = async () => {
    try {
      const res = await axios.get(`${API_URL}/leads`);
      setLeads(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTelecallers = async () => {
    try {
      const res = await axios.get(`${API_URL}/telecallers`);
      setTelecallers(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await axios.put(`${API_URL}/leads/${id}`, { status });
      setLeads(prev => prev.map(l => l._id === id ? { ...l, status } : l));
    } catch (err) { console.error(err); }
  };

  const assignTelecaller = async (id, assignedTo) => {
    try {
      await axios.put(`${API_URL}/leads/${id}`, { assignedTo });
      setLeads(prev => prev.map(l => l._id === id ? { ...l, assignedTo } : l));
    } catch (err) { console.error(err); }
  };

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError("Name is required."); return; }
    if (!form.phone.trim()) { setError("Phone number is required."); return; }
    setSaving(true);
    try {
      const res = await axios.post(`${API_URL}/leads`, form);
      setLeads(prev => [res.data, ...prev]);
      setForm(EMPTY_FORM);
      setShowForm(false);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save lead.");
    } finally { setSaving(false); }
  };

  // ── Excel Upload ──────────────────────────────────────────
  const handleExcelUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadMsg("Reading file...");
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws);

        const leads = rows.map(row => ({
          name:        row["Name"]        || row["name"]        || "",
          phone:       String(row["Number"] || row["Phone"] || row["phone"] || ""),
          marks:       row["Marks"]       || row["marks"]       || null,
          university:  row["University"]  || row["university"]  || "",
          followUpDate:row["Followup"]    || row["followUpDate"]|| "",
          time:        row["Time"]        || row["time"]        || "",
          status:      row["Status"]      || row["status"]      || "",
        })).filter(l => l.name);

        const res = await axios.post(`${API_URL}/leads/bulk`, { leads });
        setLeads(prev => [...res.data.data, ...prev]);
        setUploadMsg(`✓ ${res.data.count} leads imported successfully!`);
        setTimeout(() => setUploadMsg(""), 4000);
      } catch (err) {
        setUploadMsg("✗ Import failed. Check your Excel columns.");
        setTimeout(() => setUploadMsg(""), 4000);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  // ── Telecaller CRUD ───────────────────────────────────────
  const handleTCSubmit = async (e) => {
    e.preventDefault();
    if (!tcForm.name.trim()) return;
    try {
      const res = await axios.post(`${API_URL}/telecallers`, tcForm);
      setTelecallers(prev => [res.data.data, ...prev]);
      setTcForm(EMPTY_TC);
    } catch (err) { console.error(err); }
  };

  const deleteTelecaller = async (id) => {
    try {
      await axios.delete(`${API_URL}/telecallers/${id}`);
      setTelecallers(prev => prev.filter(t => t._id !== id));
    } catch (err) { console.error(err); }
  };

  const filteredLeads = leads.filter(l => {
    const statusOk = filter === "All" || l.status === filter;
    const tcOk = filterTC === "All" || l.assignedTo === filterTC;
    return statusOk && tcOk;
  });

  if (loading) return (
    <div className="p-6 bg-gray-900 text-white min-h-screen flex items-center justify-center">
      <div className="animate-pulse flex items-center gap-3">
        <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <span>Loading Leads...</span>
      </div>
    </div>
  );

  return (
    <div className="p-8 bg-gray-900 text-white min-h-screen font-sans">
      <div className="max-w-7xl mx-auto">

        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div>
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 mb-2">
              Career Advisor 4U CRM
            </h1>
            <p className="text-gray-400 text-sm font-medium">Manage your student leads efficiently and track conversions.</p>
          </div>
          <div className="flex gap-4 items-center">
            <div className="bg-gray-800 rounded-xl p-4 shadow-xl border border-gray-700/50 flex flex-col items-center">
              <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Total</span>
              <span className="font-bold text-2xl text-white">{leads.length}</span>
            </div>
            <div className="bg-gray-800 rounded-xl p-4 shadow-xl border border-gray-700/50 flex flex-col items-center">
              <span className="text-green-500/80 text-xs font-semibold uppercase tracking-wider mb-1 flex items-center gap-1">
                <CheckCircle size={12} /> Conversions
              </span>
              <span className="font-bold text-2xl text-green-400">{leads.filter(l => l.status === "Converted").length}</span>
            </div>
            <div className="bg-gray-800 rounded-xl p-4 shadow-xl border border-gray-700/50 flex flex-col items-center">
              <span className="text-blue-400/80 text-xs font-semibold uppercase tracking-wider mb-1 flex items-center gap-1">
                <Users size={12} /> Telecallers
              </span>
              <span className="font-bold text-2xl text-blue-400">{telecallers.length}</span>
            </div>
          </div>
        </header>

        {/* TELECALLER PANEL */}
        <div className="bg-gray-800 rounded-2xl border border-gray-700/50 shadow-xl mb-6">
          <button
            onClick={() => setShowTCPanel(!showTCPanel)}
            className="w-full flex justify-between items-center px-6 py-4 text-left"
          >
            <span className="font-bold text-white flex items-center gap-2"><Users size={18} /> Manage Telecallers</span>
            <ChevronDown size={18} className={`text-gray-400 transition-transform ${showTCPanel ? "rotate-180" : ""}`} />
          </button>

          {showTCPanel && (
            <div className="px-6 pb-6">
              {/* Add telecaller form */}
              <form onSubmit={handleTCSubmit} className="flex gap-3 mb-5 flex-wrap">
                <input
                  value={tcForm.name} onChange={e => setTcForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="Telecaller name *"
                  className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500/60 flex-1 min-w-[160px]"
                />
                <input
                  value={tcForm.phone} onChange={e => setTcForm(p => ({ ...p, phone: e.target.value }))}
                  placeholder="Phone (optional)"
                  className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500/60 flex-1 min-w-[160px]"
                />
                <input
                  value={tcForm.email} onChange={e => setTcForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="Email (optional)"
                  className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500/60 flex-1 min-w-[160px]"
                />
                <button type="submit" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-white text-sm font-bold flex items-center gap-2">
                  <Plus size={15} /> Add
                </button>
              </form>

              {/* Telecaller list */}
              {telecallers.length === 0 ? (
                <p className="text-gray-500 text-sm italic">No telecallers added yet.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {telecallers.map(tc => (
                    <div key={tc._id} className="bg-gray-900 rounded-xl px-4 py-3 flex justify-between items-center border border-gray-700/50">
                      <div>
                        <p className="font-medium text-white text-sm">{tc.name}</p>
                        <p className="text-gray-500 text-xs mt-0.5">
                          {leads.filter(l => l.assignedTo === tc.name).length} leads assigned
                        </p>
                      </div>
                      <button onClick={() => deleteTelecaller(tc._id)} className="text-gray-600 hover:text-red-400 transition-colors">
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* CONTROLS */}
        <div className="flex justify-between items-center mb-6 gap-4 flex-wrap">
          <div className="flex gap-3 flex-wrap">
            {/* Status filter */}
            <div className="relative">
              <select
                className="appearance-none bg-gray-800 text-white py-2.5 pl-4 pr-10 rounded-xl border border-gray-700/80 focus:outline-none focus:border-blue-500/50 cursor-pointer text-sm"
                onChange={(e) => setFilter(e.target.value)} value={filter}
              >
                <option value="All">All Status</option>
                <option value="New Lead">New Lead</option>
                <option value="Interested">Interested</option>
                <option value="Follow-up">Follow-up</option>
                <option value="Converted">Converted</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                <svg className="fill-current h-4 w-4" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
              </div>
            </div>

            {/* Telecaller filter */}
            <div className="relative">
              <select
                className="appearance-none bg-gray-800 text-white py-2.5 pl-4 pr-10 rounded-xl border border-gray-700/80 focus:outline-none focus:border-blue-500/50 cursor-pointer text-sm"
                onChange={(e) => setFilterTC(e.target.value)} value={filterTC}
              >
                <option value="All">All Telecallers</option>
                <option value="">Unassigned</option>
                {telecallers.map(tc => (
                  <option key={tc._id} value={tc.name}>{tc.name}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                <svg className="fill-current h-4 w-4" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            {/* Excel Upload */}
            <label className="flex items-center gap-2 px-5 py-2.5 bg-green-700 hover:bg-green-600 rounded-xl text-white font-bold text-sm cursor-pointer transition-all">
              <Upload size={16} /> Upload Excel
              <input type="file" accept=".xlsx,.xls,.csv" onChange={handleExcelUpload} className="hidden" />
            </label>

            {/* Add Lead */}
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-bold text-sm transition-all"
            >
              <Plus size={16} /> Add Lead
            </button>
          </div>
        </div>

        {/* Upload message */}
        {uploadMsg && (
          <div className={`mb-4 px-5 py-3 rounded-xl text-sm font-medium ${uploadMsg.startsWith("✓") ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
            {uploadMsg}
          </div>
        )}

        {/* ADD LEAD FORM */}
        {showForm && (
          <div className="bg-gray-800 rounded-2xl border border-gray-700/50 shadow-2xl p-6 mb-8">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold text-white">New Lead</h2>
              <button onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setError(""); }} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                {[
                  { label: "Name *", name: "name", placeholder: "Full name" },
                  { label: "Number *", name: "phone", placeholder: "+91 99999 00000" },
                  { label: "Marks", name: "marks", placeholder: "850", type: "number" },
                  { label: "University", name: "university", placeholder: "IIT Madras" },
                  { label: "Follow-up Date", name: "followUpDate", type: "date" },
                  { label: "Time", name: "time", type: "time" },
                  { label: "Status", name: "status", placeholder: "Enter status..." },
                ].map(f => (
                  <div key={f.name} className="flex flex-col gap-1.5">
                    <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">{f.label}</label>
                    <input
                      name={f.name} value={form[f.name]} onChange={handleChange}
                      type={f.type || "text"} placeholder={f.placeholder || ""}
                      min={f.name === "marks" ? 0 : undefined}
                      max={f.name === "marks" ? 1000 : undefined}
                      className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 transition-all"
                    />
                  </div>
                ))}

                {/* Assign Telecaller in form */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Assign To</label>
                  <select
                    name="assignedTo" value={form.assignedTo || ""} onChange={handleChange}
                    className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500/60 transition-all"
                  >
                    <option value="">-- Unassigned --</option>
                    {telecallers.map(tc => (
                      <option key={tc._id} value={tc.name}>{tc.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setError(""); }}
                  className="px-5 py-2.5 rounded-xl border border-gray-700 text-gray-400 hover:text-white text-sm font-semibold">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl text-white text-sm font-bold">
                  {saving ? "Saving..." : "Save Lead"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TABLE */}
        <div className="bg-gray-800 rounded-2xl overflow-hidden shadow-2xl border border-gray-700/50">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-900/50 text-gray-400 text-xs uppercase tracking-widest border-b border-gray-700">
                  <th className="p-4 font-semibold">Name</th>
                  <th className="p-4 font-semibold">Number</th>
                  <th className="p-4 font-semibold">Marks</th>
                  <th className="p-4 font-semibold">University</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold">Follow-up</th>
                  <th className="p-4 font-semibold">Time</th>
                  <th className="p-4 font-semibold">Assigned To</th>
                  <th className="p-4 font-semibold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {filteredLeads.map((lead) => (
                  <tr key={lead._id} className="hover:bg-gray-750/80 transition-colors group">
                    <td className="p-4 font-medium text-gray-200">{lead.name || "Unknown"}</td>
                    <td className="p-4 text-gray-400 font-mono text-sm">{lead.phone || "—"}</td>
                    <td className="p-4">
                      {lead.marks != null && lead.marks !== "" ? (
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          lead.marks >= 750 ? "bg-green-500/10 text-green-400 border border-green-500/20" :
                          lead.marks >= 500 ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20" :
                          "bg-red-500/10 text-red-400 border border-red-500/20"
                        }`}>{lead.marks}</span>
                      ) : "—"}
                    </td>
                    <td className="p-4 text-gray-400 text-sm">{lead.university || "—"}</td>
                    <td className="p-4">
                      {lead.status ? (
                        <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                          lead.status === "New Lead"   ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                          lead.status === "Interested" ? "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20" :
                          lead.status === "Follow-up"  ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" :
                          lead.status === "Converted"  ? "bg-green-500/10 text-green-400 border border-green-500/20" :
                          "bg-gray-500/10 text-gray-400 border border-gray-500/20"
                        }`}>{lead.status}</span>
                      ) : "—"}
                    </td>
                    <td className="p-4 text-gray-500 text-sm">
                      {lead.followUpDate
                        ? <span className="flex items-center gap-1.5"><Clock size={13} className="text-blue-400/70" /><span className="text-gray-300">{lead.followUpDate}</span></span>
                        : "—"}
                    </td>
                    <td className="p-4 text-gray-400 text-sm font-mono">
                      {lead.time ? (() => {
                        const [h, m] = lead.time.split(":").map(Number);
                        return `${h % 12 || 12}:${m < 10 ? "0" + m : m} ${h >= 12 ? "PM" : "AM"}`;
                      })() : "—"}
                    </td>
                    {/* Assign telecaller dropdown inline */}
                    <td className="p-4">
                      <select
                        value={lead.assignedTo || ""}
                        onChange={(e) => assignTelecaller(lead._id, e.target.value)}
                        className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-blue-500/60 cursor-pointer w-full max-w-[140px]"
                      >
                        <option value="">Unassigned</option>
                        {telecallers.map(tc => (
                          <option key={tc._id} value={tc.name}>{tc.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-center gap-2 opacity-80 group-hover:opacity-100">
                        <a href={`tel:${lead.phone}`} className="p-2 bg-gray-700 hover:bg-blue-600 rounded-xl text-gray-300 hover:text-white transition-all" title="Call">
                          <Phone size={15} />
                        </a>
                        <a href={`https://wa.me/91${lead.phone}`} target="_blank" rel="noreferrer" className="p-2 bg-gray-700 hover:bg-green-600 rounded-xl text-gray-300 hover:text-white transition-all" title="WhatsApp">
                          <MessageSquare size={15} />
                        </a>
                        {lead.status !== "Interested" && lead.status !== "Converted" && (
                          <button onClick={() => updateStatus(lead._id, "Interested")} className="px-3 py-1.5 bg-gray-700 hover:bg-yellow-600 rounded-xl text-xs font-bold text-gray-300 hover:text-white transition-all">
                            Interest
                          </button>
                        )}
                        {lead.status !== "Converted" && (
                          <button onClick={() => updateStatus(lead._id, "Converted")} className="px-3 py-1.5 bg-gray-700 hover:bg-green-600 rounded-xl text-xs font-bold text-gray-300 hover:text-white transition-all">
                            Convert
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredLeads.length === 0 && (
                  <tr>
                    <td colSpan="9" className="p-10 text-center text-gray-500 italic">No leads found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
