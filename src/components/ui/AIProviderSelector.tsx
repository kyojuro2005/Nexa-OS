import React, { useState } from "react";
import { useAppStore } from "../../stores/useAppStore";
import { aiService } from "../../lib/aiService";
import type { AIProviderId } from "../../types";

// ── Définition des providers ───────────────────────────────────────────

interface ProviderMeta {
  id: AIProviderId;
  name: string;
  description: string;
  icon: string;           // Material Symbol
  placeholder: string;
  pricing: string;
  pricingDetail: string;
  howToGetKey: string;
  link: string;
  linkLabel: string;
  color: string;          // classe Tailwind pour l'accent
}

const PROVIDERS: ProviderMeta[] = [
  {
    id: "openai",
    name: "ChatGPT",
    description: "Modèle GPT-4o-mini d'OpenAI. Rapide, précis, idéal pour la structuration de projets.",
    icon: "smart_toy",
    placeholder: "sk-...",
    pricing: "Payant (crédit)",
    pricingDetail: "~$0.15 / 1M tokens — très abordable pour un usage personnel",
    howToGetKey: "1. Crée un compte sur platform.openai.com\n2. Va dans API Keys → Create new secret key\n3. Copie la clé (commence par sk-)",
    link: "https://platform.openai.com/api-keys",
    linkLabel: "Obtenir une clé OpenAI",
    color: "text-primary",
  },
  {
    id: "gemini",
    name: "Gemini",
    description: "Modèle Gemini 1.5 Flash de Google. Gratuit avec quota généreux, très capable.",
    icon: "auto_awesome",
    placeholder: "AIzaSy...",
    pricing: "Gratuit (avec limites)",
    pricingDetail: "Tier gratuit disponible — Gemini 1.5 Flash : 15 req/min, 1M tokens/jour",
    howToGetKey: "1. Va sur aistudio.google.com\n2. Clique sur Get API key → Create API key\n3. Copie la clé (commence par AIzaSy)",
    link: "https://aistudio.google.com/app/apikey",
    linkLabel: "Obtenir une clé Gemini",
    color: "text-secondary",
  },
  {
    id: "claude",
    name: "Claude",
    description: "Modèle Claude Haiku d'Anthropic. Excellent pour l'analyse et les retours détaillés.",
    icon: "psychology",
    placeholder: "sk-ant-...",
    pricing: "Payant (crédit)",
    pricingDetail: "Claude Haiku : ~$0.25 / 1M tokens — parmi les moins chers",
    howToGetKey: "1. Crée un compte sur console.anthropic.com\n2. Va dans API Keys → Create Key\n3. Copie la clé (commence par sk-ant-)",
    link: "https://console.anthropic.com/keys",
    linkLabel: "Obtenir une clé Claude",
    color: "text-tertiary",
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    description: "Modèle DeepSeek Chat. Très économique, performances proches de GPT-4.",
    icon: "rocket_launch",
    placeholder: "sk-...",
    pricing: "Payant (très abordable)",
    pricingDetail: "~$0.14 / 1M tokens — l'un des moins chers du marché",
    howToGetKey: "1. Crée un compte sur platform.deepseek.com\n2. Va dans API Keys → Create\n3. Copie la clé",
    link: "https://platform.deepseek.com/api_keys",
    linkLabel: "Obtenir une clé DeepSeek",
    color: "text-on-surface",
  },
];

// ── Composant ──────────────────────────────────────────────────────────

interface Props {
  compact?: boolean; // Mode compact pour l'onboarding
  onConfigured?: () => void;
}

export default function AIProviderSelector({ compact, onConfigured }: Props) {
  const { aiProviders, activeProviderId, setAIProvider, removeAIProvider } = useAppStore();

  const [expandedProvider, setExpandedProvider] = useState<AIProviderId | null>(null);
  const [keyInputs, setKeyInputs] = useState<Partial<Record<AIProviderId, string>>>({});
  const [testing, setTesting] = useState<AIProviderId | null>(null);
  const [testResult, setTestResult] = useState<Partial<Record<AIProviderId, { ok: boolean; msg: string }>>>({});
  const [showKey, setShowKey] = useState<Partial<Record<AIProviderId, boolean>>>({});

  const hasActiveProvider = activeProviderId !== null;
  const activeProvider = aiProviders.find(p => p.id === activeProviderId);

  const handleTest = async (meta: ProviderMeta) => {
    const key = keyInputs[meta.id]?.trim();
    if (!key) return;
    setTesting(meta.id);
    const result = await aiService.testConnection({ providerId: meta.id, apiKey: key });
    setTestResult(prev => ({
      ...prev,
      [meta.id]: {
        ok: result.ok,
        msg: result.ok ? "Connexion réussie" : result.error ?? "Erreur inconnue",
      },
    }));
    setTesting(null);
  };

  const handleSave = (meta: ProviderMeta) => {
    const key = keyInputs[meta.id]?.trim();
    if (!key) return;
    setAIProvider(meta.id, key);
    setKeyInputs(prev => ({ ...prev, [meta.id]: "" }));
    setExpandedProvider(null);
    onConfigured?.();
  };

  const handleRemove = (id: AIProviderId) => {
    removeAIProvider(id);
    setTestResult(prev => { const n = { ...prev }; delete n[id]; return n; });
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Provider actif */}
      {activeProvider && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-tertiary-fixed-dim/20 border border-tertiary-fixed-dim/40">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-tertiary" style={{ fontSize: 18 }}>check_circle</span>
            <div>
              <span className="text-body-sm font-semibold text-on-surface">
                {PROVIDERS.find(p => p.id === activeProvider.id)?.name} actif
              </span>
              <span className="text-label-sm text-outline font-mono block">
                {activeProvider.apiKey.slice(0, 8)}••••••••
              </span>
            </div>
          </div>
          <button
            onClick={() => handleRemove(activeProvider.id)}
            className="text-label-sm text-error hover:bg-error-container px-2 py-1 rounded-lg transition-colors font-mono"
          >
            Supprimer
          </button>
        </div>
      )}

      {/* Liste des providers */}
      {PROVIDERS.map(meta => {
        const isActive = activeProviderId === meta.id;
        const isLocked = hasActiveProvider && !isActive;
        const isExpanded = expandedProvider === meta.id;
        const result = testResult[meta.id];
        const savedProvider = aiProviders.find(p => p.id === meta.id);

        return (
          <div
            key={meta.id}
            className={`rounded-2xl border transition-all ${
              isActive
                ? "border-tertiary-fixed-dim/60 bg-tertiary-fixed-dim/10"
                : isLocked
                ? "border-outline-variant/20 bg-surface-container opacity-50 pointer-events-none"
                : "border-outline-variant/30 bg-surface-container-lowest hover:border-outline-variant/60"
            }`}
          >
            {/* Header du provider */}
            <div className="flex items-center gap-3 p-4">
              <div className={`w-9 h-9 rounded-xl bg-surface-container flex items-center justify-center ${meta.color}`}>
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{meta.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-body-sm font-semibold text-on-surface">{meta.name}</span>
                  {isActive && (
                    <span className="text-label-sm px-2 py-0.5 rounded-full bg-tertiary-fixed-dim/30 text-tertiary font-mono font-semibold">
                      Actif
                    </span>
                  )}
                  <span className={`text-label-sm px-2 py-0.5 rounded-full font-mono font-medium ${
                    meta.pricing.startsWith("Gratuit")
                      ? "bg-tertiary-fixed text-on-tertiary-fixed"
                      : "bg-surface-container text-on-surface-variant"
                  }`}>
                    {meta.pricing.startsWith("Gratuit") ? "Gratuit" : meta.pricing.split(" ")[0]}
                  </span>
                </div>
                <p className="text-label-sm text-on-surface-variant">{meta.description}</p>
              </div>
              {!isLocked && (
                <button
                  onClick={() => setExpandedProvider(isExpanded ? null : meta.id)}
                  className="shrink-0 w-7 h-7 rounded-lg bg-surface-container hover:bg-surface-container-high flex items-center justify-center transition-colors"
                >
                  <span
                    className="material-symbols-outlined text-outline transition-transform"
                    style={{ fontSize: 16, transform: isExpanded ? "rotate(180deg)" : "none" }}
                  >
                    expand_more
                  </span>
                </button>
              )}
            </div>

            {/* Zone dépliable */}
            {isExpanded && !isLocked && (
              <div className="px-4 pb-4 flex flex-col gap-3 border-t border-outline-variant/20 pt-3">
                {/* Prix détaillé */}
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-surface-container-low">
                  <span className="material-symbols-outlined text-secondary shrink-0" style={{ fontSize: 14, marginTop: 2 }}>monetization_on</span>
                  <span className="text-label-sm text-on-surface-variant font-mono">{meta.pricingDetail}</span>
                </div>

                {/* Comment obtenir la clé */}
                <div className="flex flex-col gap-1">
                  <span className="text-label-sm text-on-surface font-semibold font-mono">Comment obtenir une clé :</span>
                  <pre className="text-label-sm text-on-surface-variant bg-surface-container p-2.5 rounded-lg whitespace-pre-wrap font-mono leading-relaxed">
                    {meta.howToGetKey}
                  </pre>
                  <a
                    href={meta.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-label-sm text-primary hover:underline font-mono mt-1"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>open_in_new</span>
                    {meta.linkLabel}
                  </a>
                </div>

                {/* Input clé API */}
                <div>
                  <label className="text-label-md font-mono text-on-surface-variant block mb-1.5">
                    {isActive ? "Remplacer la clé API" : "Entrer la clé API"}
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showKey[meta.id] ? "text" : "password"}
                        value={keyInputs[meta.id] ?? ""}
                        onChange={e => setKeyInputs(prev => ({ ...prev, [meta.id]: e.target.value }))}
                        placeholder={meta.placeholder}
                        className="w-full px-space-md py-2.5 rounded-xl bg-surface-container-low text-on-surface text-body-sm outline-none focus:ring-2 focus:ring-primary/20 font-mono pr-10"
                        onKeyDown={e => { if (e.key === "Enter") handleSave(meta); }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowKey(prev => ({ ...prev, [meta.id]: !prev[meta.id] }))}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                          {showKey[meta.id] ? "visibility_off" : "visibility"}
                        </span>
                      </button>
                    </div>
                    <button
                      onClick={() => handleTest(meta)}
                      disabled={!keyInputs[meta.id]?.trim() || testing === meta.id}
                      className="btn-secondary px-3 py-2 disabled:opacity-40 text-label-sm"
                    >
                      {testing === meta.id ? (
                        <span className="material-symbols-outlined animate-spin" style={{ fontSize: 16 }}>refresh</span>
                      ) : (
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>wifi_tethering</span>
                      )}
                    </button>
                  </div>

                  {/* Résultat du test */}
                  {result && (
                    <div className={`flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-lg text-label-sm font-mono ${
                      result.ok ? "bg-tertiary-fixed-dim/30 text-tertiary" : "bg-error-container text-on-error-container"
                    }`}>
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                        {result.ok ? "check_circle" : "error"}
                      </span>
                      {result.msg}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSave(meta)}
                    disabled={!keyInputs[meta.id]?.trim()}
                    className="btn-primary flex-1 justify-center disabled:opacity-40"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                      {isActive ? "sync" : "power_settings_new"}
                    </span>
                    <span>{isActive ? "Mettre à jour" : "Activer ce provider"}</span>
                  </button>
                  {isActive && (
                    <button
                      onClick={() => handleRemove(meta.id)}
                      className="btn-secondary text-error px-3"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                    </button>
                  )}
                </div>

                {!compact && isActive && (
                  <p className="text-label-sm text-outline font-mono text-center">
                    Pour utiliser un autre provider, supprime d'abord celui-ci.
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Mode démo si aucun provider */}
      {!hasActiveProvider && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-container text-outline text-label-sm font-mono">
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>info</span>
          Mode démonstration actif — structure générée localement, sans IA réelle.
        </div>
      )}
    </div>
  );
}
