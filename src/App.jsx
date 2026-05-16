import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { LoginPage } from './LoginPage';
import { loadAppData } from './services/appDataService';
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
import { WorkoutModelsTab } from './features/workouts/WorkoutModelsTab';
import { getMoreNavigation, getPrimaryNavigation, isMoreSectionActive } from './appNavigation';

// ==================== THEME COLORS ====================
const THEMES = {
  purple: { name: "Dourado", primary: "#F2CF7C", dark: "#142339", light: "rgba(242, 207, 124, 0.16)", medium: "#4A6388", soft: "#F6E3AA", gradient: "linear-gradient(135deg, #F2CF7C 0%, #243B5C 100%)" },
  blue: { name: "Dourado", primary: "#F2CF7C", dark: "#142339", light: "rgba(242, 207, 124, 0.16)", medium: "#4A6388", soft: "#F6E3AA", gradient: "linear-gradient(135deg, #F2CF7C 0%, #243B5C 100%)" },
  pink: { name: "Dourado", primary: "#F2CF7C", dark: "#142339", light: "rgba(242, 207, 124, 0.16)", medium: "#4A6388", soft: "#F6E3AA", gradient: "linear-gradient(135deg, #F2CF7C 0%, #243B5C 100%)" },
  green: { name: "Dourado", primary: "#F2CF7C", dark: "#142339", light: "rgba(242, 207, 124, 0.16)", medium: "#4A6388", soft: "#F6E3AA", gradient: "linear-gradient(135deg, #F2CF7C 0%, #243B5C 100%)" },
  orange: { name: "Dourado", primary: "#F2CF7C", dark: "#142339", light: "rgba(242, 207, 124, 0.16)", medium: "#4A6388", soft: "#F6E3AA", gradient: "linear-gradient(135deg, #F2CF7C 0%, #243B5C 100%)" },
  red: { name: "Dourado", primary: "#F2CF7C", dark: "#142339", light: "rgba(242, 207, 124, 0.16)", medium: "#4A6388", soft: "#F6E3AA", gradient: "linear-gradient(135deg, #F2CF7C 0%, #243B5C 100%)" },
  teal: { name: "Dourado", primary: "#F2CF7C", dark: "#142339", light: "rgba(242, 207, 124, 0.16)", medium: "#4A6388", soft: "#F6E3AA", gradient: "linear-gradient(135deg, #F2CF7C 0%, #243B5C 100%)" },
  slate: { name: "Dourado", primary: "#F2CF7C", dark: "#142339", light: "rgba(242, 207, 124, 0.16)", medium: "#4A6388", soft: "#F6E3AA", gradient: "linear-gradient(135deg, #F2CF7C 0%, #243B5C 100%)" },
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

function IconMore() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>;
}

function getAppDataErrorMessage(error) {
  if (error?.code === "permission-denied") {
    return "Sem permissao para carregar dados no Firebase. Publique as regras do Firestore para o projeto correto e tente novamente.";
  }
  if (error?.code === "unauthenticated") {
    return "Sua sessao expirou. Entre novamente para carregar os dados.";
  }
  if (error?.code === "unavailable") {
    return "Firebase indisponivel no momento. Verifique a conexao e tente novamente.";
  }
  return "Erro ao carregar dados";
}

function getTabIcon(id) {
  const icons = {
    dashboard: <IconHome />,
    session: <IconDumbbell />,
    agenda: <IconCalendar />,
    students: <IconUsers />,
    more: <IconMore />,
    attendance: <IconClipboard />,
    payments: <IconCreditCard />,
    alerts: <IconBell />,
    communication: <IconMessage />,
    workoutModels: <IconClipboard />,
    reports: <IconChart />,
    settings: <IconSettings />
  };
  return icons[id] || <IconMore />;
}

function MoreTab({ onSelectTab, theme }) {
  return (
    <div className="app-page more-page">
      <section className="app-card more-hero-panel">
        <p className="more-page-kicker">ATALHOS DO APP</p>
        <h2 className="app-page-title">Mais</h2>
        <p className="app-page-kicker">Acesse cobranças, registros, mensagens e relatórios sem lotar a barra principal.</p>
      </section>

      <div className="more-menu-grid">
        {getMoreNavigation().map(item => (
          <button
            key={item.id}
            type="button"
            className="more-menu-item"
            onClick={() => onSelectTab(item.id)}
          >
            <span className="more-menu-icon" style={{ color: theme.primary }}>{getTabIcon(item.id)}</span>
            <span>
              <strong>{item.label}</strong>
              <small>{item.description}</small>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ==================== MAIN APP ====================
export default function App() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState([]);
  const [payments, setPayments] = useState([]);
  const [scheduleOverrides, setScheduleOverrides] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [themeKey, setThemeKey] = useState("purple");
  const theme = THEMES[themeKey] || THEMES.purple;

  // Load data from Firestore
  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      setLoadingData(true);
      try {
        const data = await loadAppData(user.uid, user.email);

        if (data.themeKey) setThemeKey(data.themeKey);
        setStudents(data.students);
        setRecords(data.records);
        setPayments(data.payments);
        setScheduleOverrides(data.scheduleOverrides);
      } catch (error) {
        console.error("Error loading data:", error);
        alert(getAppDataErrorMessage(error));
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
  const primaryNavigation = getPrimaryNavigation();

  return (
    <ThemeContext.Provider value={theme}>
    <div
      className="app-shell"
      style={{
        "--app-brand": theme.primary,
        "--app-brand-dark": theme.dark,
        "--app-brand-soft": theme.light
      }}
    >
      {/* Header */}
      <div className="app-header">
        <div className="app-header-inner">
        <div className="app-header-brand">
          <div className="app-brand-mark">PP</div>
          <div className="app-brand-copy">
            <h1>PersonalPro</h1>
            <p>{user.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="app-logout-button"
        >
          <IconLogOut /> Sair
        </button>
        </div>
      </div>

      {/* Content */}
      <main className={`app-main ${activeTab === "session" ? "app-main-session" : ""}`}>
        {activeTab === "dashboard" && <DashboardTab students={students} records={records} setRecords={setRecords} payments={payments} scheduleOverrides={scheduleOverrides} loadingData={loadingData} theme={theme} onOpenSession={() => setActiveTab("session")} onSelectTab={setActiveTab} />}
        {activeTab === "students" && <StudentsTab students={students} setStudents={setStudents} records={records} scheduleOverrides={scheduleOverrides} setScheduleOverrides={setScheduleOverrides} loadingData={loadingData} theme={theme} />}
        {activeTab === "agenda" && <AgendaTab students={students} records={records} setRecords={setRecords} scheduleOverrides={scheduleOverrides} setScheduleOverrides={setScheduleOverrides} theme={theme} />}
        {activeTab === "session" && <SessionTab students={students} records={records} setRecords={setRecords} payments={payments} scheduleOverrides={scheduleOverrides} setScheduleOverrides={setScheduleOverrides} loadingData={loadingData} theme={theme} />}
        {activeTab === "attendance" && <AttendanceTab students={students} records={records} setRecords={setRecords} scheduleOverrides={scheduleOverrides} loadingData={loadingData} theme={theme} />}
        {activeTab === "payments" && <PaymentsTab students={students} records={records} payments={payments} setPayments={setPayments} scheduleOverrides={scheduleOverrides} loadingData={loadingData} theme={theme} />}
        {activeTab === "alerts" && <AlertsTab students={students} records={records} setRecords={setRecords} payments={payments} setPayments={setPayments} scheduleOverrides={scheduleOverrides} loadingData={loadingData} theme={theme} />}
        {activeTab === "communication" && <CommunicationTab students={students} records={records} payments={payments} loadingData={loadingData} theme={theme} />}
        {activeTab === "workoutModels" && <WorkoutModelsTab theme={theme} />}
        {activeTab === "reports" && <ReportsTab students={students} records={records} payments={payments} loadingData={loadingData} theme={theme} />}
        {activeTab === "settings" && <SettingsTab themeKey={themeKey} setThemeKey={setThemeKey} themes={THEMES} />}
        {activeTab === "more" && <MoreTab onSelectTab={setActiveTab} theme={theme} />}
      </main>

      {/* Bottom Tab Navigation */}
      <nav className="bottom-nav">
        <div className="bottom-nav-inner">
        {primaryNavigation.map(tab => {
          const active = tab.id === "more" ? isMoreSectionActive(activeTab) : activeTab === tab.id;
          return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`nav-item ${active ? "nav-item-active" : ""}`}
          >
            <span style={{ fontSize: "18px" }}>{getTabIcon(tab.id)}</span>
            {tab.label}
          </button>
          );
        })}
        </div>
      </nav>
    </div>
    </ThemeContext.Provider>
  );
}
