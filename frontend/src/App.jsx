import { useEffect, useState } from "react";
import io from "socket.io-client";
import axios from "axios";
import { Phone, MessageSquare, CheckCircle, Clock } from "lucide-react";

// Assuming backend runs on 5000
const API_URL = "http://localhost:5000/api";
const SOCKET_URL = "http://localhost:5000";

export default function App() {
  const [leads, setLeads] = useState([]);
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial fetch
    axios.get(`${API_URL}/leads`)
      .then(res => {
        setLeads(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch leads", err);
        setLoading(false);
      });

    // Realtime connection
    const socket = io(SOCKET_URL);
    
    socket.on("leadUpdated", (updatedLead) => {
      setLeads(prev => prev.map(l => l._id === updatedLead._id ? updatedLead : l));
    });

    return () => socket.disconnect();
  }, []);

  const updateStatus = async (id, status) => {
    try {
      await axios.put(`${API_URL}/leads/${id}`, { status });
      // Optimistic update
      setLeads(prev => prev.map(l => l._id === id ? { ...l, status } : l));
    } catch (err) {
      console.error(err);
    }
  };

  const filteredLeads = filter === "All"
    ? leads
    : leads.filter(l => l.status === filter);

  if (loading) {
    return <div className="p-6 bg-gray-900 text-white min-h-screen flex items-center justify-center">
      <div className="animate-pulse flex items-center gap-3">
        <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <span>Loading Leads...</span>
      </div>
    </div>;
  }

  return (
    <div className="p-8 bg-gray-900 text-white min-h-screen font-sans selection:bg-blue-500/30">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div>
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 mb-2 drop-shadow-sm">
              Career Advisor 4U CRM
            </h1>
            <p className="text-gray-400 text-sm md:text-base font-medium">Manage your student leads efficiently and track conversions.</p>
          </div>
          <div className="flex gap-4 items-center">
             <div className="bg-gray-800 rounded-xl p-4 shadow-xl border border-gray-700/50 flex flex-col items-center">
               <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Total</span>
               <span className="font-bold text-2xl text-white">{leads.length}</span>
             </div>
             <div className="bg-gray-800 rounded-xl p-4 shadow-xl border border-gray-700/50 flex flex-col items-center">
               <span className="text-green-500/80 text-xs font-semibold uppercase tracking-wider mb-1 flex items-center gap-1">
                 <CheckCircle size={12}/> Conversions
               </span>
               <span className="font-bold text-2xl text-green-400">{leads.filter(l => l.status === 'Converted').length}</span>
             </div>
          </div>
        </header>

        {/* CONTROLS */}
        <div className="flex justify-between items-center mb-6">
          <div className="relative group">
            <select
              className="appearance-none bg-gray-800 text-white py-2.5 pl-4 pr-12 rounded-xl border border-gray-700/80 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 shadow-lg cursor-pointer transition-all hover:bg-gray-750"
              onChange={(e) => setFilter(e.target.value)}
              value={filter}
            >
              <option value="All">All Leads</option>
              <option value="New Lead">New Lead</option>
              <option value="Interested">Interested</option>
              <option value="Follow-up">Follow-up</option>
              <option value="Converted">Converted</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500 group-hover:text-gray-400 transition-colors">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
            </div>
          </div>
        </div>

        {/* TABLE */}
        <div className="bg-gray-800 rounded-2xl overflow-hidden shadow-2xl border border-gray-700/50">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-900/50 text-gray-400 text-xs uppercase tracking-widest border-b border-gray-700">
                  <th className="p-5 font-semibold">Name</th>
                  <th className="p-5 font-semibold">Phone</th>
                  <th className="p-5 font-semibold">Status</th>
                  <th className="p-5 font-semibold">Follow-up</th>
                  <th className="p-5 font-semibold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {filteredLeads.map((lead) => (
                  <tr key={lead._id} className="hover:bg-gray-750/80 transition-colors duration-200 group">
                    <td className="p-5 font-medium text-gray-200">{lead.name || 'Unknown'}</td>
                    <td className="p-5 text-gray-400 font-mono text-sm">{lead.phone}</td>
                    <td className="p-5">
                      <span className={`px-3 py-1.5 rounded-full text-xs font-bold tracking-wide shadow-sm ${
                        lead.status === 'New Lead' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                        lead.status === 'Interested' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' :
                        lead.status === 'Follow-up' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                        lead.status === 'Converted' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                        'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                      }`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="p-5 text-gray-500 text-sm flex items-center gap-2">
                      {lead.followUpDate ? <><Clock size={14} className="text-blue-400/70"/> <span className="text-gray-300">{lead.followUpDate}</span></> : '-'}
                    </td>
                    <td className="p-5">
                      <div className="flex justify-center gap-2.5 opacity-80 group-hover:opacity-100 transition-opacity">
                        <a href={`tel:${lead.phone}`} className="p-2.5 bg-gray-700 hover:bg-blue-600 rounded-xl text-gray-300 hover:text-white transition-all shadow-sm hover:shadow-blue-500/20" title="Call">
                          <Phone size={16} />
                        </a>
                        <a href={`https://wa.me/91${lead.phone}`} target="_blank" rel="noreferrer" className="p-2.5 bg-gray-700 hover:bg-green-600 rounded-xl text-gray-300 hover:text-white transition-all shadow-sm hover:shadow-green-500/20" title="WhatsApp">
                          <MessageSquare size={16} />
                        </a>
                        
                        {lead.status !== 'Interested' && lead.status !== 'Converted' && (
                          <button onClick={() => updateStatus(lead._id, "Interested")} className="px-4 py-2 bg-gray-700 hover:bg-yellow-600 rounded-xl text-xs font-bold text-gray-300 hover:text-white transition-all shadow-sm hover:shadow-yellow-500/20 tracking-wide">
                            Interest
                          </button>
                        )}
                        {lead.status !== 'Converted' && (
                           <button onClick={() => updateStatus(lead._id, "Converted")} className="px-4 py-2 bg-gray-700 hover:bg-green-600 rounded-xl text-xs font-bold text-gray-300 hover:text-white transition-all shadow-sm hover:shadow-green-500/20 tracking-wide">
                           Convert
                         </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredLeads.length === 0 && (
                  <tr>
                    <td colSpan="5" className="p-10 text-center text-gray-500 italic">No leads match the current filter.</td>
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
