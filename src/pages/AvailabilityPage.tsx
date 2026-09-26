import React, { useState } from "react";
import { useAppStore } from "../stores/useAppStore";
import type { DayAvailability, TimeSlot } from "../types";

const DAY_LABELS: Record<string, string> = {
  lun: "Lundi", mar: "Mardi", mer: "Mercredi", jeu: "Jeudi",
  ven: "Vendredi", sam: "Samedi", dim: "Dimanche",
};

const SLOT_TYPE_LABELS: Record<string, string> = {
  available: "Disponible",
  busy: "Occupé",
  break: "Pause / Repos",
  blocked: "Bloqué",
};

const SLOT_TYPE_COLORS: Record<string, string> = {
  available: "bg-primary-fixed text-on-primary-fixed-variant",
  busy: "bg-error-container text-on-error-container",
  break: "bg-tertiary-fixed text-on-tertiary-fixed",
  blocked: "bg-surface-container text-on-surface-variant",
};

export default function AvailabilityPage() {
  const { workPreferences, setWorkPreferences, blockedPeriods, addBlockedPeriod, removeBlockedPeriod } = useAppStore();
  const [editedPrefs, setEditedPrefs] = useState(workPreferences);
  const [saving, setSaving] = useState(false);

  const toggleDay = (day: string) => {
    setEditedPrefs(p => ({
      ...p,
      availability: p.availability.map(d =>
        d.day === day ? { ...d, enabled: !d.enabled } : d
      ),
    }));
  };

  const updateSlot = (day: string, slotIdx: number, patch: Partial<TimeSlot>) => {
    setEditedPrefs(p => ({
      ...p,
      availability: p.availability.map(d =>
        d.day === day
          ? { ...d, slots: d.slots.map((s, i) => i === slotIdx ? { ...s, ...patch } : s) }
          : d
      ),
    }));
  };

  const addSlot = (day: string) => {
    setEditedPrefs(p => ({
      ...p,
      availability: p.availability.map(d =>
        d.day === day
          ? { ...d, slots: [...d.slots, { start: "09:00", end: "12:00", type: "available" as const }] }
          : d
      ),
    }));
  };

  const removeSlot = (day: string, slotIdx: number) => {
    setEditedPrefs(p => ({
      ...p,
      availability: p.availability.map(d =>
        d.day === day
          ? { ...d, slots: d.slots.filter((_, i) => i !== slotIdx) }
          : d
      ),
    }));
  };

  const handleSave = () => {
    setSaving(true);
    setWorkPreferences(editedPrefs);
    setTimeout(() => setSaving(false), 800);
  };

  return (
    <div className="flex flex-col gap-space-lg max-w-4xl">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-space-md">
        <div>
          <h1 className="text-headline-lg font-semibold text-on-surface">Disponibilités & Repos</h1>
          <p className="text-body-md text-on-surface-variant mt-1">
            Le moteur de planification respecte strictement ces créneaux. Tes pauses ne seront jamais utilisées.
          </p>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn-primary self-start sm:self-end">
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{saving ? "check_circle" : "save"}</span>
          <span>{saving ? "Sauvegardé !" : "Sauvegarder"}</span>
        </button>
      </div>

      {/* ── Préférences générales ── */}
      <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-xs">
        <h2 className="text-headline-sm font-semibold text-on-surface mb-space-md">Préférences de rythme</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-space-md">
          <div>
            <label className="text-label-md font-mono text-on-surface-variant block mb-2">
              Durée préférée d'une session : <strong>{editedPrefs.preferredSessionDuration}m</strong>
            </label>
            <input
              type="range" min={30} max={150} step={15}
              value={editedPrefs.preferredSessionDuration}
              onChange={e => setEditedPrefs(p => ({ ...p, preferredSessionDuration: Number(e.target.value) }))}
              className="w-full accent-primary"
            />
          </div>
          <div>
            <label className="text-label-md font-mono text-on-surface-variant block mb-2">
              Max heures / jour : <strong>{editedPrefs.maxDailyWorkHours}h</strong>
            </label>
            <input
              type="range" min={2} max={10} step={0.5}
              value={editedPrefs.maxDailyWorkHours}
              onChange={e => setEditedPrefs(p => ({ ...p, maxDailyWorkHours: Number(e.target.value) }))}
              className="w-full accent-primary"
            />
          </div>
          <div>
            <label className="text-label-md font-mono text-on-surface-variant block mb-2">
              Pause entre sessions : <strong>{editedPrefs.breakBetweenSessions}m</strong>
            </label>
            <input
              type="range" min={5} max={60} step={5}
              value={editedPrefs.breakBetweenSessions}
              onChange={e => setEditedPrefs(p => ({ ...p, breakBetweenSessions: Number(e.target.value) }))}
              className="w-full accent-primary"
            />
          </div>
          <div>
            <label className="text-label-md font-mono text-on-surface-variant block mb-1.5">Début pic d'énergie</label>
            <input
              type="time" value={editedPrefs.peakHoursStart}
              onChange={e => setEditedPrefs(p => ({ ...p, peakHoursStart: e.target.value }))}
              className="w-full px-space-md py-2.5 rounded-xl bg-surface-container-low text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="text-label-md font-mono text-on-surface-variant block mb-1.5">Fin pic d'énergie</label>
            <input
              type="time" value={editedPrefs.peakHoursEnd}
              onChange={e => setEditedPrefs(p => ({ ...p, peakHoursEnd: e.target.value }))}
              className="w-full px-space-md py-2.5 rounded-xl bg-surface-container-low text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="flex items-center justify-between p-space-sm rounded-xl bg-surface-container-low">
            <div>
              <div className="text-body-sm font-semibold text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-tertiary" style={{ fontSize: 16 }}>shield</span>
                Repos strict
              </div>
              <div className="text-label-sm text-outline font-mono">Aucune session dans les pauses</div>
            </div>
            <button
              onClick={() => setEditedPrefs(p => ({ ...p, strictRestMode: !p.strictRestMode }))}
              className={`w-12 h-6 rounded-full p-0.5 transition-colors ${editedPrefs.strictRestMode ? "bg-primary-container" : "bg-surface-container-high"}`}
            >
              <span className={`block w-5 h-5 rounded-full bg-on-primary shadow-xs transform transition-transform ${editedPrefs.strictRestMode ? "translate-x-6" : "translate-x-0"}`} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Disponibilités par jour ── */}
      <div className="flex flex-col gap-space-md">
        <h2 className="text-headline-sm font-semibold text-on-surface">Horaires par jour</h2>
        {editedPrefs.availability.map(dayAvail => (
          <div key={dayAvail.day} className={`bg-surface-container-lowest rounded-2xl shadow-xs overflow-hidden ${!dayAvail.enabled ? "opacity-60" : ""}`}>
            <div className="flex items-center justify-between p-space-md bg-surface-container-low/50">
              <div className="flex items-center gap-space-sm">
                <button
                  onClick={() => toggleDay(dayAvail.day)}
                  className={`w-10 h-5 rounded-full p-0.5 transition-colors ${dayAvail.enabled ? "bg-primary-container" : "bg-surface-container-high"}`}
                >
                  <span className={`block w-4 h-4 rounded-full bg-on-primary shadow-xs transform transition-transform ${dayAvail.enabled ? "translate-x-5" : "translate-x-0"}`} />
                </button>
                <h3 className="text-headline-sm font-semibold text-on-surface">{DAY_LABELS[dayAvail.day]}</h3>
              </div>
              {dayAvail.enabled && (
                <button onClick={() => addSlot(dayAvail.day)} className="btn-ghost text-label-sm">
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
                  <span>Ajouter créneau</span>
                </button>
              )}
            </div>
            {dayAvail.enabled && (
              <div className="p-space-md flex flex-col gap-2">
                {dayAvail.slots.length === 0 && (
                  <p className="text-body-sm text-outline">Aucun créneau défini.</p>
                )}
                {dayAvail.slots.map((slot, si) => (
                  <div key={si} className="flex flex-wrap items-center gap-2">
                    <select
                      value={slot.type}
                      onChange={e => updateSlot(dayAvail.day, si, { type: e.target.value as any })}
                      className={`px-2 py-1.5 rounded-lg text-label-sm font-medium font-mono border-0 outline-none ${SLOT_TYPE_COLORS[slot.type]}`}
                    >
                      {Object.entries(SLOT_TYPE_LABELS).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                    <input
                      type="time" value={slot.start}
                      onChange={e => updateSlot(dayAvail.day, si, { start: e.target.value })}
                      className="px-2 py-1.5 rounded-lg bg-surface-container-low text-on-surface text-body-sm outline-none focus:ring-2 focus:ring-primary/20 font-mono"
                    />
                    <span className="text-outline">–</span>
                    <input
                      type="time" value={slot.end}
                      onChange={e => updateSlot(dayAvail.day, si, { end: e.target.value })}
                      className="px-2 py-1.5 rounded-lg bg-surface-container-low text-on-surface text-body-sm outline-none focus:ring-2 focus:ring-primary/20 font-mono"
                    />
                    {slot.type === "break" && (
                      <input
                        type="text" placeholder="Label (ex: Déjeuner)" value={slot.label ?? ""}
                        onChange={e => updateSlot(dayAvail.day, si, { label: e.target.value })}
                        className="px-2 py-1.5 rounded-lg bg-surface-container-low text-on-surface text-body-sm outline-none flex-1 min-w-[120px]"
                      />
                    )}
                    <button onClick={() => removeSlot(dayAvail.day, si)} className="p-1.5 rounded-lg text-outline hover:text-error hover:bg-error-container transition-colors">
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Périodes bloquées ── */}
      <div className="flex flex-col gap-space-md">
        <div className="flex items-center justify-between">
          <h2 className="text-headline-sm font-semibold text-on-surface">Périodes bloquées</h2>
          <button
            onClick={() => {
              const date = prompt("Date (YYYY-MM-DD) :");
              const label = prompt("Label (ex: Vacances, RDV médical) :");
              if (date && label) addBlockedPeriod({ date, label, type: "personal" });
            }}
            className="btn-secondary"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
            <span>Bloquer une journée</span>
          </button>
        </div>
        {blockedPeriods.length === 0 ? (
          <p className="text-body-sm text-outline bg-surface-container-lowest rounded-xl p-space-md">
            Aucune période bloquée. Le moteur peut planifier des sessions tous les jours disponibles.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {blockedPeriods.map(bp => (
              <div key={bp.id} className="flex items-center justify-between p-space-md bg-surface-container-lowest rounded-xl shadow-xs">
                <div>
                  <span className="text-body-sm font-semibold text-on-surface">{bp.label}</span>
                  <span className="text-label-sm text-outline font-mono ml-2">{bp.date}</span>
                </div>
                <button onClick={() => removeBlockedPeriod(bp.id)} className="p-1.5 rounded-lg text-outline hover:text-error hover:bg-error-container transition-colors">
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
