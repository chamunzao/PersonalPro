import { useAuth } from '../../AuthContext';
import { useState } from 'react';
import { db, doc, setDoc, addDoc, updateDoc, deleteDoc, collection } from '../../firebase';
import {
  LOCATION_FEE_TYPES,
  LOCATION_TYPES,
  getLocationFeeTypeLabel,
  getLocationTypeLabel
} from '../locations/locationCalculations';
// ==================== SETTINGS TAB ====================
function SettingsTab({ themeKey, setThemeKey, themes, locations = [], setLocations, theme }) {
  const { user } = useAuth();
  const [showLocationForm, setShowLocationForm] = useState(false);
  const [editingLocationId, setEditingLocationId] = useState(null);
  const [savingLocation, setSavingLocation] = useState(false);
  const [locationForm, setLocationForm] = useState({
    name: "",
    type: LOCATION_TYPES.gym,
    feeType: LOCATION_FEE_TYPES.perClass,
    feeValue: "",
    monthlyCap: "",
    notes: ""
  });

  async function changeTheme(key) {
    setThemeKey(key);
    if (user) {
      try {
        await setDoc(doc(db, `users/${user.uid}/settings/theme`), { themeKey: key });
      } catch (e) {
        console.error("Error saving theme:", e);
      }
    }
  }

  function resetLocationForm() {
    setLocationForm({
      name: "",
      type: LOCATION_TYPES.gym,
      feeType: LOCATION_FEE_TYPES.perClass,
      feeValue: "",
      monthlyCap: "",
      notes: ""
    });
    setEditingLocationId(null);
    setShowLocationForm(false);
  }

  function startEditLocation(location) {
    setLocationForm({
      name: location.name || "",
      type: location.type || LOCATION_TYPES.gym,
      feeType: location.feeType || LOCATION_FEE_TYPES.none,
      feeValue: location.feeValue === undefined ? "" : String(location.feeValue),
      monthlyCap: location.monthlyCap === undefined ? "" : String(location.monthlyCap),
      notes: location.notes || ""
    });
    setEditingLocationId(location.id);
    setShowLocationForm(true);
  }

  async function saveLocation() {
    if (!user || !locationForm.name.trim()) {
      alert("Informe o nome do local.");
      return;
    }

    setSavingLocation(true);
    try {
      const payload = {
        name: locationForm.name.trim(),
        type: locationForm.type,
        feeType: locationForm.feeType,
        feeValue: locationForm.feeValue ? parseFloat(locationForm.feeValue) : 0,
        monthlyCap: locationForm.monthlyCap ? parseFloat(locationForm.monthlyCap) : 0,
        notes: locationForm.notes.trim(),
        active: true
      };

      if (editingLocationId) {
        await updateDoc(doc(db, `users/${user.uid}/locations/${editingLocationId}`), payload);
        setLocations(prev => prev.map(location => location.id === editingLocationId ? { id: editingLocationId, ...payload } : location));
      } else {
        const docRef = await addDoc(collection(db, `users/${user.uid}/locations`), payload);
        setLocations(prev => [...prev, { id: docRef.id, ...payload }]);
      }
      resetLocationForm();
    } catch (error) {
      console.error("Error saving location:", error);
      alert("Erro ao salvar local.");
    } finally {
      setSavingLocation(false);
    }
  }

  async function removeLocation(locationId) {
    if (!user || !window.confirm("Remover este local? Os alunos antigos ficam sem local vinculado.")) return;
    setSavingLocation(true);
    try {
      await deleteDoc(doc(db, `users/${user.uid}/locations/${locationId}`));
      setLocations(prev => prev.filter(location => location.id !== locationId));
    } catch (error) {
      console.error("Error removing location:", error);
      alert("Erro ao remover local.");
    } finally {
      setSavingLocation(false);
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

      <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center", marginBottom: "12px" }}>
          <div>
            <h3 style={{ fontSize: "15px", fontWeight: "800", color: "#1f2937", margin: "0 0 3px 0" }}>Locais e repasses</h3>
            <p style={{ fontSize: "12px", color: "#6b7280", margin: 0 }}>Academia, estúdio, online ou domiciliar com regra de cobrança.</p>
          </div>
          <button
            onClick={() => setShowLocationForm(true)}
            style={{
              padding: "8px 10px",
              background: theme.primary,
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: "800",
              cursor: "pointer",
              flexShrink: 0
            }}
          >
            + Local
          </button>
        </div>

        {showLocationForm && (
          <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "12px", marginBottom: "12px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "10px", marginBottom: "10px" }}>
              <div>
                <label style={{ fontSize: "11px", fontWeight: "700", color: "#4b5563", display: "block", marginBottom: "4px" }}>Nome</label>
                <input
                  value={locationForm.name}
                  onChange={(e) => setLocationForm(form => ({ ...form, name: e.target.value }))}
                  placeholder="Academia A"
                  style={{ width: "100%", padding: "8px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "12px", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "11px", fontWeight: "700", color: "#4b5563", display: "block", marginBottom: "4px" }}>Tipo</label>
                <select
                  value={locationForm.type}
                  onChange={(e) => setLocationForm(form => ({ ...form, type: e.target.value }))}
                  style={{ width: "100%", padding: "8px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "12px", boxSizing: "border-box", background: "white" }}
                >
                  {Object.values(LOCATION_TYPES).map(type => <option key={type} value={type}>{getLocationTypeLabel(type)}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: "11px", fontWeight: "700", color: "#4b5563", display: "block", marginBottom: "4px" }}>Regra</label>
                <select
                  value={locationForm.feeType}
                  onChange={(e) => setLocationForm(form => ({ ...form, feeType: e.target.value }))}
                  style={{ width: "100%", padding: "8px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "12px", boxSizing: "border-box", background: "white" }}
                >
                  {Object.values(LOCATION_FEE_TYPES).map(type => <option key={type} value={type}>{getLocationFeeTypeLabel(type)}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: "11px", fontWeight: "700", color: "#4b5563", display: "block", marginBottom: "4px" }}>
                  {locationForm.feeType === LOCATION_FEE_TYPES.percentage ? "Percentual (%)" : "Valor (R$)"}
                </label>
                <input
                  type="number"
                  value={locationForm.feeValue}
                  onChange={(e) => setLocationForm(form => ({ ...form, feeValue: e.target.value }))}
                  min="0"
                  step="0.01"
                  disabled={locationForm.feeType === LOCATION_FEE_TYPES.none}
                  style={{ width: "100%", padding: "8px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "12px", boxSizing: "border-box", background: locationForm.feeType === LOCATION_FEE_TYPES.none ? "#f3f4f6" : "white" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "11px", fontWeight: "700", color: "#4b5563", display: "block", marginBottom: "4px" }}>Teto mensal (opcional)</label>
                <input
                  type="number"
                  value={locationForm.monthlyCap}
                  onChange={(e) => setLocationForm(form => ({ ...form, monthlyCap: e.target.value }))}
                  min="0"
                  step="0.01"
                  placeholder="0 = sem teto"
                  style={{ width: "100%", padding: "8px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "12px", boxSizing: "border-box" }}
                />
              </div>
            </div>
            <textarea
              value={locationForm.notes}
              onChange={(e) => setLocationForm(form => ({ ...form, notes: e.target.value }))}
              placeholder="Observações sobre o acordo com a academia..."
              style={{ width: "100%", minHeight: "54px", padding: "8px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "12px", boxSizing: "border-box", resize: "vertical", marginBottom: "10px" }}
            />
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={saveLocation}
                disabled={savingLocation}
                style={{ flex: 1, padding: "9px", background: savingLocation ? "#d1d5db" : theme.primary, color: "white", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: "800", cursor: savingLocation ? "not-allowed" : "pointer" }}
              >
                {editingLocationId ? "Atualizar local" : "Salvar local"}
              </button>
              <button
                onClick={resetLocationForm}
                style={{ padding: "9px 12px", background: "#f3f4f6", color: "#6b7280", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: "800", cursor: "pointer" }}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {locations.length === 0 ? (
          <p style={{ fontSize: "12px", color: "#9ca3af", margin: 0 }}>Nenhum local cadastrado ainda.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {locations.map(location => (
              <div key={location.id} style={{ border: "1px solid #e5e7eb", borderRadius: "8px", padding: "10px", background: "#f9fafb", display: "flex", justifyContent: "space-between", gap: "10px" }}>
                <div>
                  <p style={{ fontSize: "13px", fontWeight: "800", color: "#1f2937", margin: "0 0 3px 0" }}>{location.name}</p>
                  <p style={{ fontSize: "11px", color: "#6b7280", margin: 0 }}>
                    {getLocationTypeLabel(location.type)} · {getLocationFeeTypeLabel(location.feeType)}
                    {location.feeValue ? ` · ${location.feeType === LOCATION_FEE_TYPES.percentage ? `${location.feeValue}%` : `R$ ${Number(location.feeValue).toFixed(2)}`}` : ""}
                    {location.monthlyCap ? ` · teto R$ ${Number(location.monthlyCap).toFixed(2)}` : ""}
                  </p>
                  {location.notes && <p style={{ fontSize: "11px", color: "#6b7280", margin: "4px 0 0 0", fontStyle: "italic" }}>{location.notes}</p>}
                </div>
                <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                  <button onClick={() => startEditLocation(location)} style={{ padding: "7px 9px", background: "white", color: theme.primary, border: `1px solid ${theme.medium}`, borderRadius: "6px", fontSize: "11px", fontWeight: "800", cursor: "pointer" }}>Editar</button>
                  <button onClick={() => removeLocation(location.id)} disabled={savingLocation} style={{ padding: "7px 9px", background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: "6px", fontSize: "11px", fontWeight: "800", cursor: savingLocation ? "not-allowed" : "pointer" }}>Remover</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export { SettingsTab };
