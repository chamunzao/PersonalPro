import { useAuth } from '../../AuthContext';
import { saveThemeKey } from '../../services/settingsService';
// ==================== SETTINGS TAB ====================
function SettingsTab({ themeKey, setThemeKey, themes }) {
  const { user } = useAuth();

  async function changeTheme(key) {
    setThemeKey(key);
    if (user) {
      try {
        await saveThemeKey(user.uid, key);
      } catch (e) {
        console.error("Error saving theme:", e);
      }
    }
  }

  return (
    <div style={{ padding: "16px" }}>
      <h2 style={{ fontSize: "18px", fontWeight: "600", margin: "0 0 16px 0", color: "#1f2937" }}>Configurações</h2>
      <div style={{ marginBottom: "20px" }}>
        <label style={{ fontSize: "13px", fontWeight: "600", color: "#4b5563", display: "block", marginBottom: "10px" }}>Cor do tema</label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
          {Object.entries(themes).map(([key, t]) => (
            <button
              key={key}
              onClick={() => changeTheme(key)}
              style={{
                padding: "12px 8px",
                background: themeKey === key ? t.light : "#f9fafb",
                border: themeKey === key ? `2px solid ${t.primary}` : "1px solid #e5e7eb",
                borderRadius: "10px",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "6px"
              }}
            >
              <div style={{
                width: "32px", height: "32px", borderRadius: "50%",
                background: t.gradient, boxShadow: themeKey === key ? `0 0 0 3px ${t.light}` : "none"
              }} />
              <span style={{ fontSize: "11px", fontWeight: "600", color: themeKey === key ? t.primary : "#6b7280" }}>{t.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export { SettingsTab };
