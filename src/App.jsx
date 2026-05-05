import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { LoginPage } from './LoginPage';
import {
  db,
  doc,
  getDoc,
  collection,
  getDocs
} from './firebase';
import { DashboardTab } from './features/dashboard/DashboardTab';
import { AgendaTab } from './features/schedule/AgendaTab';
import { StudentsTab } from './features/students/StudentsTab';
import { AttendanceTab } from './features/attendance/AttendanceTab';
import { PaymentsTab } from './features/payments/PaymentsTab';
import { ReportsTab } from './features/reports/ReportsTab';
import { AlertsTab } from './features/alerts/AlertsTab';
import { SettingsTab } from './features/settings/SettingsTab';
import { CommunicationTab } from './features/communication/CommunicationTab';
import { SessionTab } from './features/session/SessionTab';

// ==================== THEME COLORS ====================
const THEMES = {
  purple: { name: "Roxo", primary: "#7c3aed", dark: "#6d28d9", light: "#ede9fe", medium: "#c4b5fd", soft: "#a78bfa", gradient: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)" },
  blue: { name: "Azul", primary: "#2563eb", dark: "#1d4ed8", light: "#dbeafe", medium: "#93c5fd", soft: "#60a5fa", gradient: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)" },
  pink: { name: "Rosa", primary: "#db2777", dark: "#be185d", light: "#fce7f3", medium: "#f9a8d4", soft: "#f472b6", gradient: "linear-gradient(135deg, #db2777 0%, #be185d 100%)" },
  green: { name: "Verde", primary: "#059669", dark: "#047857", light: "#d1fae5", medium: "#6ee7b7", soft: "#34d399", gradient: "linear-gradient(135deg, #059669 0%, #047857 100%)" },
  orange: { name: "Laranja", primary: "#ea580c", dark: "#c2410c", light: "#ffedd5", medium: "#fdba74", soft: "#fb923c", gradient: "linear-gradient(135deg, #ea580c 0%, #c2410c 100%)" },
  red: { name: "Vermelho", primary: "#dc2626", dark: "#b91c1c", light: "#fee2e2", medium: "#fca5a5", soft: "#f87171", gradient: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)" },
  teal: { name: "Turquesa", primary: "#0d9488", dark: "#0f766e", light: "#ccfbf1", medium: "#5eead4", soft: "#2dd4bf", gradient: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)" },
  slate: { name: "Cinza", primary: "#475569", dark: "#334155", light: "#f1f5f9", medium: "#94a3b8", soft: "#64748b", gradient: "linear-gradient(135deg, #475569 0%, #334155 100%)" },
};

const ThemeContext = React.createContext(THEMES.purple);

// ==================== ICONS ====================
function IconUsers() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
}
function IconHome() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 10.5 9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>;
}
function IconCalendar() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>;
}
function IconClipboard() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/></svg>;
}
function IconDumbbell() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.4 14.4 9.6 9.6"/><path d="M18.657 21.485a2 2 0 0 1-2.829 0L2.515 8.172a2 2 0 0 1 0-2.829l2.828-2.828a2 2 0 0 1 2.829 0l13.313 13.313a2 2 0 0 1 0 2.829z"/><path d="m21.5 21.5-1.4-1.4"/><path d="m3.9 3.9-1.4-1.4"/><path d="m6.34 10.34-2.83 2.83"/><path d="m13.66 17.66-2.83 2.83"/></svg>;
}
function IconChart() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>;
}
function IconCreditCard() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>;
}
function IconBell() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.3 21a2 2 0 0 0 3.4 0"/><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/></svg>;
}
function IconMessage() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/></svg>;
}
function IconChevron({ direction }) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: direction === "left" ? "rotate(180deg)" : "none" }}><path d="m9 18 6-6-6-6"/></svg>;
}
function IconLogOut() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>;
}

function IconSettings() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
}

// ==================== MAIN APP ====================
export default function App() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState([]);
  const [payments, setPayments] = useState([]);
  const [scheduleOverrides, setScheduleOverrides] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [themeKey, setThemeKey] = useState("purple");
  const theme = THEMES[themeKey] || THEMES.purple;

  // Load data from Firestore
  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      setLoadingData(true);
      try {
        // Load theme
        const themeSnap = await getDoc(doc(db, `users/${user.uid}/settings/theme`));
        if (themeSnap.exists() && themeSnap.data().themeKey) {
          setThemeKey(themeSnap.data().themeKey);
        }

        // Load students
        const studentsSnap = await getDocs(collection(db, `users/${user.uid}/students`));
        const studentsData = studentsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setStudents(studentsData);

        // Load records
        const recordsSnap = await getDocs(collection(db, `users/${user.uid}/records`));
        const recordsData = recordsSnap.docs.map(doc => ({
          key: doc.data().key || decodeURIComponent(doc.id),
          status: doc.data().status,
          activity: doc.data().activity || null,
          customPrice: doc.data().customPrice || null,
          sessionNote: doc.data().sessionNote || null,
          exerciseNotes: doc.data().exerciseNotes || {},
          exerciseLogs: doc.data().exerciseLogs || {}
        }));
        setRecords(recordsData);

        // Load payments
        const paymentsSnap = await getDocs(collection(db, `users/${user.uid}/payments`));
        const paymentsData = paymentsSnap.docs.map(doc => ({
          key: doc.id,
          ...doc.data()
        }));
        setPayments(paymentsData);

        // Load service locations
        const locationsSnap = await getDocs(collection(db, `users/${user.uid}/locations`));
        const locationsData = locationsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setLocations(locationsData);

        // Load schedule overrides
        const overridesSnap = await getDocs(collection(db, `users/${user.uid}/scheduleOverrides`));
        const overridesData = overridesSnap.docs.map(doc => ({
          key: doc.id,
          date: doc.id.split("_")[0],
          studentId: doc.id.split("_")[1],
          ...doc.data()
        }));
        setScheduleOverrides(overridesData);
      } catch (error) {
        console.error("Error loading data:", error);
        alert("Erro ao carregar dados");
      } finally {
        setLoadingData(false);
      }
    };

    loadData();
  }, [user]);

  const { logout } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: theme.gradient,
        fontFamily: "system-ui, -apple-system, sans-serif"
      }}>
        <p style={{ color: "white", fontSize: "16px" }}>Carregando...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <ThemeContext.Provider value={theme}>
        <LoginPage />
      </ThemeContext.Provider>
    );
  }

  const handleLogout = async () => {
    if (window.confirm("Tem certeza que deseja sair?")) {
      try {
        await logout();
      } catch (error) {
        console.error("Error logging out:", error);
      }
    }
  };

  return (
    <ThemeContext.Provider value={theme}>
    <div style={{
      minHeight: "100vh",
      background: "#f9fafb",
      fontFamily: "system-ui, -apple-system, sans-serif",
      display: "flex",
      flexDirection: "column"
    }}>
      {/* Header */}
      <div style={{
        background: theme.gradient,
        color: "white",
        padding: "16px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)"
      }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: "700", margin: "0 0 4px 0" }}>PersonalPro</h1>
          <p style={{ fontSize: "12px", margin: "0", opacity: 0.9 }}>{user.email}</p>
        </div>
        <button
          onClick={handleLogout}
          style={{
            padding: "8px 12px",
            background: "rgba(255, 255, 255, 0.2)",
            color: "white",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "12px",
            fontWeight: "600",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            transition: "all 0.2s"
          }}
          onMouseEnter={(e) => {
            e.target.style.background = "rgba(255, 255, 255, 0.3)";
          }}
          onMouseLeave={(e) => {
            e.target.style.background = "rgba(255, 255, 255, 0.2)";
          }}
        >
          <IconLogOut /> Sair
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", paddingBottom: "8px" }}>
        {activeTab === "dashboard" && <DashboardTab students={students} records={records} setRecords={setRecords} payments={payments} scheduleOverrides={scheduleOverrides} locations={locations} loadingData={loadingData} theme={theme} />}
        {activeTab === "students" && <StudentsTab students={students} setStudents={setStudents} records={records} scheduleOverrides={scheduleOverrides} setScheduleOverrides={setScheduleOverrides} locations={locations} loadingData={loadingData} theme={theme} />}
        {activeTab === "agenda" && <AgendaTab students={students} records={records} setRecords={setRecords} scheduleOverrides={scheduleOverrides} setScheduleOverrides={setScheduleOverrides} locations={locations} theme={theme} />}
        {activeTab === "session" && <SessionTab students={students} records={records} setRecords={setRecords} payments={payments} scheduleOverrides={scheduleOverrides} locations={locations} loadingData={loadingData} theme={theme} />}
        {activeTab === "attendance" && <AttendanceTab students={students} records={records} setRecords={setRecords} scheduleOverrides={scheduleOverrides} loadingData={loadingData} theme={theme} />}
        {activeTab === "payments" && <PaymentsTab students={students} records={records} payments={payments} setPayments={setPayments} scheduleOverrides={scheduleOverrides} loadingData={loadingData} theme={theme} />}
        {activeTab === "alerts" && <AlertsTab students={students} records={records} payments={payments} scheduleOverrides={scheduleOverrides} loadingData={loadingData} theme={theme} />}
        {activeTab === "communication" && <CommunicationTab students={students} records={records} payments={payments} loadingData={loadingData} theme={theme} />}
        {activeTab === "reports" && <ReportsTab students={students} records={records} payments={payments} scheduleOverrides={scheduleOverrides} locations={locations} loadingData={loadingData} theme={theme} />}
        {activeTab === "settings" && <SettingsTab themeKey={themeKey} setThemeKey={setThemeKey} themes={THEMES} locations={locations} setLocations={setLocations} theme={theme} />}
      </div>

      {/* Bottom Tab Navigation */}
      <div style={{
        background: "white",
        borderTop: "1px solid #e5e7eb",
        display: "flex",
        gap: "0",
        padding: "8px",
        boxShadow: "0 -2px 8px rgba(0, 0, 0, 0.05)",
        overflowX: "auto",
        WebkitOverflowScrolling: "touch"
      }}>
        {[
          { id: "dashboard", icon: <IconHome />, label: "Início" },
          { id: "students", icon: <IconUsers />, label: "Alunos" },
          { id: "agenda", icon: <IconCalendar />, label: "Agenda" },
          { id: "session", icon: <IconDumbbell />, label: "Aula" },
          { id: "attendance", icon: <IconClipboard />, label: "Registro" },
          { id: "payments", icon: <IconCreditCard />, label: "Pagamentos" },
          { id: "alerts", icon: <IconBell />, label: "Alertas" },
          { id: "communication", icon: <IconMessage />, label: "Contato" },
          { id: "reports", icon: <IconChart />, label: "Relatório" },
          { id: "settings", icon: <IconSettings />, label: "Config" }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: "0 0 76px",
              padding: "12px 8px",
              background: activeTab === tab.id ? "#f3f4f6" : "transparent",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "4px",
              fontSize: "11px",
              fontWeight: "600",
              color: activeTab === tab.id ? theme.primary : "#9ca3af",
              transition: "all 0.2s"
            }}
          >
            <span style={{ fontSize: "18px" }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>
    </div>
    </ThemeContext.Provider>
  );
}
