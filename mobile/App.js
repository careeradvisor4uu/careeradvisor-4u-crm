import { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, TextInput, Alert, StyleSheet, SafeAreaView, StatusBar, Linking } from "react-native";
import axios from "axios";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import io from "socket.io-client";

// REPLACE WITH YOUR MACHINE'S LOCAL WIFI IP ADDRESS (Windows: ipconfig)
const API = "http://192.168.1.100:5000"; 
let socket;

export default function App() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [leads, setLeads] = useState([]);

  // ===== LOGIN =====
  const login = async () => {
    try {
      const res = await axios.post(`${API}/api/login`, { email, password });
      setToken(res.data.token);
      setUser(res.data.user);
      Alert.alert("Success", "Welcome to Career Advisor 4U");
    } catch (e) {
      Alert.alert("Login Failed", "Invalid credentials. Ensure backend runs at: " + API);
    }
  };

  // ===== FETCH LEADS & REALTIME (AFTER LOGIN) =====
  useEffect(() => {
    if (!token) return;

    axios.get(`${API}/api/leads`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => setLeads(res.data)).catch(err => console.log(err));

    socket = io(API);
    socket.on("leadUpdated", (data) => {
      setLeads(prev => prev.map(l => l._id === data._id ? data : l));
    });

    return () => socket.disconnect();
  }, [token]);

  // ===== NOTIFICATIONS SETUP =====
  useEffect(() => {
    registerForPushNotificationsAsync();
    const scheduleDaily = async () => {
      await Notifications.scheduleNotificationAsync({
        content: { title: "Daily Follow-ups 📞", body: "Check your leads for today" },
        trigger: { hour: 9, minute: 0, repeats: true }
      });
    };
    scheduleDaily();
  }, []);

  async function registerForPushNotificationsAsync() {
    if (!Device.isDevice) return;
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") return;
  }

  const sendReminder = async () => {
    await Notifications.scheduleNotificationAsync({
      content: { title: "Follow-ups Pending 📞", body: "You have leads to call right now." },
      trigger: { seconds: 2 }
    });
  };

  const callLead = (phone) => {
    Linking.openURL(`tel:${phone}`);
  };

  const updateStatus = async (id, status) => {
    try {
      await axios.put(`${API}/api/leads/${id}`, { status });
      // UI will update optimistically + socket sync
      setLeads(prev => prev.map(l => l._id === id ? { ...l, status } : l));
    } catch(e) {
      console.log(e);
    }
  };

  // ===== UI (LOGIN) =====
  if (!token) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loginCard}>
          <Text style={styles.title}>Career Advisor 4U</Text>
          <Text style={styles.subtitle}>Caller CRM Portal</Text>
          
          <TextInput 
            placeholder="Email Address" 
            placeholderTextColor="#888"
            value={email} 
            onChangeText={setEmail} 
            style={styles.input} 
            autoCapitalize="none"
          />
          <TextInput 
            placeholder="Password" 
            placeholderTextColor="#888"
            secureTextEntry 
            value={password} 
            onChangeText={setPassword} 
            style={styles.input} 
          />
          
          <TouchableOpacity style={styles.loginButton} onPress={login}>
            <Text style={styles.loginButtonText}>LOGIN TO PORTAL</Text>
          </TouchableOpacity>

          <Text style={styles.ipNote}>API: {API}</Text>
          <Text style={styles.ipNoteSub}>Change this in App.js to your actual local Wi-Fi IP to test on physical device.</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ===== UI (DASHBOARD) =====
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Hello, {user?.name}</Text>
          <Text style={styles.statsText}>Total Leads: {leads.length}</Text>
        </View>
        <TouchableOpacity style={styles.reminderBtn} onPress={sendReminder}>
          <Text style={styles.reminderText}>Test Notification</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={leads}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: 15 }}
        renderItem={({ item }) => (
          <View style={styles.leadCard}>
            <View style={styles.leadHeader}>
              <Text style={styles.leadName}>{item.name}</Text>
              <Text style={[styles.statusBadge, 
                item.status === 'New Lead' ? styles.statusNew :
                item.status === 'Interested' ? styles.statusInterested :
                item.status === 'Converted' ? styles.statusConverted : styles.statusFollowUp
              ]}>
                {item.status}
              </Text>
            </View>
            <Text style={styles.leadPhone}>{item.phone}</Text>
            
            <View style={styles.actionRow}>
              <TouchableOpacity style={[styles.actionBtn, styles.callBtn]} onPress={() => callLead(item.phone)}>
                <Text style={styles.actionText}>Call</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.waBtn]} onPress={() => Linking.openURL(`https://wa.me/91${item.phone}`)}>
                <Text style={styles.actionText}>WhatsApp</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.actionRow}>
              {item.status !== 'Interested' && item.status !== 'Converted' && (
                <TouchableOpacity style={[styles.actionBtn, styles.interestBtn]} onPress={() => updateStatus(item._id, "Interested")}>
                  <Text style={styles.actionText}>Mark Interested</Text>
                </TouchableOpacity>
              )}
              {item.status !== 'Converted' && (
                <TouchableOpacity style={[styles.actionBtn, styles.convertBtn]} onPress={() => updateStatus(item._id, "Converted")}>
                  <Text style={styles.actionText}>Mark Converted</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#10141d" },
  loginCard: { flex: 1, justifyContent: "center", padding: 25 },
  title: { fontSize: 32, fontWeight: "bold", color: "#60a5fa", textAlign: "center", marginBottom: 5 },
  subtitle: { fontSize: 16, color: "#9ca3af", textAlign: "center", marginBottom: 40 },
  input: { backgroundColor: "#1f2430", color: "#fff", padding: 15, borderRadius: 10, marginBottom: 15, fontSize: 16, borderWidth: 1, borderColor: "#374151" },
  loginButton: { backgroundColor: "#3b82f6", padding: 15, alignItems: "center", marginTop: 10, borderRadius: 10 },
  loginButtonText: { color: "#fff", fontWeight: "bold", fontSize: 16, letterSpacing: 1 },
  ipNote: { color: "#4b5563", textAlign: "center", marginTop: 25, fontSize: 14, fontWeight: "bold" },
  ipNoteSub: { color: "#4b5563", textAlign: "center", marginTop: 5, fontSize: 12 },
  
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1, borderBottomColor: "#1f2430" },
  welcomeText: { fontSize: 20, fontWeight: "bold", color: "#fff" },
  statsText: { fontSize: 14, color: "#9ca3af", marginTop: 2 },
  reminderBtn: { backgroundColor: "#374151", paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8 },
  reminderText: { color: "#d1d5db", fontSize: 12 },

  leadCard: { backgroundColor: "#1f2430", padding: 20, borderRadius: 15, marginBottom: 15, borderWidth: 1, borderColor: "#374151" },
  leadHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 5 },
  leadName: { fontSize: 18, fontWeight: "bold", color: "#f3f4f6" },
  statusBadge: { fontSize: 11, fontWeight: "bold", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, overflow: "hidden" },
  statusNew: { backgroundColor: "rgba(59, 130, 246, 0.2)", color: "#60a5fa" },
  statusInterested: { backgroundColor: "rgba(234, 179, 8, 0.2)", color: "#facc15" },
  statusFollowUp: { backgroundColor: "rgba(249, 115, 22, 0.2)", color: "#fb923c" },
  statusConverted: { backgroundColor: "rgba(34, 197, 94, 0.2)", color: "#4ade80" },
  leadPhone: { fontSize: 14, color: "#9ca3af", marginBottom: 15 },
  
  actionRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10, gap: 10 },
  actionBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: "center" },
  actionText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  
  callBtn: { backgroundColor: "#2563eb" },
  waBtn: { backgroundColor: "#16a34a" },
  interestBtn: { backgroundColor: "#ca8a04" },
  convertBtn: { backgroundColor: "#059669" },
});
