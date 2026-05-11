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
    <div className="settings-page">
      <section className="app-card settings-hero-panel">
        <p className="dashboard-kicker">PREFERÊNCIAS</p>
        <h2 className="app-page-title">Configurações</h2>
        <p className="app-page-kicker">Ajuste a aparência do app para trabalhar com mais conforto no dia a dia.</p>
      </section>

      <section className="app-card settings-section">
        <div className="settings-section-header">
          <div>
            <p>Cor do tema</p>
            <span>Escolha a identidade visual principal do PersonalPro.</span>
          </div>
          <strong>{themes[themeKey]?.name}</strong>
        </div>
        <div className="settings-theme-grid">
          {Object.entries(themes).map(([key, t]) => (
            <button
              key={key}
              onClick={() => changeTheme(key)}
              className={`settings-theme-button ${themeKey === key ? "settings-theme-button-active" : ""}`}
            >
              <div className="settings-theme-swatch" style={{ background: t.gradient }} />
              <span>{t.name}</span>
              {themeKey === key && <small>Ativo</small>}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

export { SettingsTab };
