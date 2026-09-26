// ══════════════════════════════════════════════════════════════════════
// NEXA OS — Service IA multi-provider
// Supporte : OpenAI (ChatGPT), Google Gemini, Anthropic Claude, DeepSeek
// L'IA analyse, décompose, estime, pose des questions, suggère.
// Le moteur de planification place les sessions.
// ══════════════════════════════════════════════════════════════════════

import type { AIAnalysis, Phase, AIProviderId } from "../types";
import { v4 as uuidv4 } from "uuid";

// ── Prompts système ────────────────────────────────────────────────────

const SYSTEM_PROMPT_STRUCTURATION = `Tu es Nexa Kernel, l'architecte IA intégré dans Nexa OS, un Personal Work OS.
Tu analyses des projets décrits en langage naturel et tu produis une structuration complète, actionnable et réaliste.

Tes règles fondamentales :
1. Tu analyses la faisabilité réelle et détectes les failles (manques, contradictions, risques techniques).
2. Tu décomposes en phases claires et en tâches concrètes (15 min – 2h max chacune).
3. Tes estimations de durée sont réalistes : inclure apprentissage, tests, debugging, documentation.
4. Tu identifies toutes les dépendances entre tâches.
5. Tu signales les informations manquantes qui bloqueraient le projet.
6. Tu ne génères jamais de tâches vagues — chaque tâche doit être précise et exécutable immédiatement.
7. Les phases suivent une logique : Analyse → Architecture → Développement → Tests → Déploiement (adapter au projet).

Réponds TOUJOURS en JSON valide, sans markdown, sans commentaires, exactement selon le schéma demandé.`;

const SYSTEM_PROMPT_ASSISTANT = `Tu es Nexa Kernel, l'assistant IA personnel et interactif de Nexa OS, un Personal Work OS dédié à la réussite de projets solo et indépendants.

Ton rôle : Tu es un véritable co-équipier, chef de projet technique et pair-programmeur avec qui l'utilisateur peut discuter librement, pas un simple chatbot passif.

Tes comportements essentiels :
1. Compréhension & Clarification :
   - Si un aspect du projet, une tâche ou une demande de l'utilisateur n'est pas clair, NE SUPPOSE PAS aveuglément : pose-lui des questions précises pour comprendre son intention et ses contraintes.
   - Si tu repères des manques ou des contradictions dans le projet (cf. informations manquantes ou risques), aborde-les avec tact et propose des pistes de clarification.

2. Suggestions, remarques et corrections constructives :
   - Fais des suggestions concrètes d'architecture, de choix de frameworks, de bibliothèques ou d'organisation du travail.
   - N'hésite pas à faire des remarques bienveillantes si une approche semble trop complexe, risquée ou surdimensionnée pour un projet solo (principe du Lean / MVP). Propose des alternatives plus directes.

3. Suivi du temps & Attention aux dépassements :
   - Analyse les temps réels passés par rapport aux estimations dans le contexte du projet.
   - Si une tâche ou un projet prend plus de temps que prévu, demande chaleureusement à l'utilisateur comment ça se passe : "J'ai remarqué que telle tâche a pris plus de temps que prévu, est-ce que tu as rencontré un blocage ou un bug imprévu ?".
   - Propose d'ajuster le planning, d'allonger les échéances ou de redécouper les tâches suivantes.

4. Conseil d'outils, d'agents IA et de pairs :
   - Si une tâche est complexe, répétitive ou sort de la zone de confort de l'utilisateur, recommande proactivement des agents IA spécialisés adaptés :
     * Code / Refactoring : Cursor, Claude Code, GitHub Copilot, Devin.
     * UI / Design / Frontend : v0.dev, Tailwind UI, Bolt.new, Lovable.
     * Recherche / Documentation : Perplexity AI.
   - Si une brique nécessite une expertise humaine très pointue (ex: audit sécurité, légal/RGPD, infrastructure complexe), suggère-lui de solliciter un ami développeur ou de déléguer temporairement à un freelance.

5. Ton et posture :
   - Discussion naturelle, humaine, empathique et encourageante.
   - Réponses concises, structurées et actionnables (évite les tunnels de texte verbeux).
   - Réponds en français.`;

// ── Configuration des endpoints par provider ───────────────────────────

interface ProviderConfig {
  buildUrl: (model: string) => string;
  buildHeaders: (apiKey: string) => Record<string, string>;
  buildBody: (messages: Message[], model: string, jsonMode: boolean) => object;
  extractContent: (data: any) => string;
  defaultModel: string;
  structureModel: string;
}

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

const PROVIDERS: Record<AIProviderId, ProviderConfig> = {
  openai: {
    buildUrl: () => "https://api.openai.com/v1/chat/completions",
    buildHeaders: (key) => ({
      "Content-Type": "application/json",
      "Authorization": `Bearer ${key}`,
    }),
    buildBody: (messages, model, jsonMode) => ({
      model,
      messages,
      temperature: 0.3,
      max_tokens: 4000,
      ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
    }),
    extractContent: (data) => data.choices?.[0]?.message?.content ?? "",
    defaultModel: "gpt-4o-mini",
    structureModel: "gpt-4o-mini",
  },

  gemini: {
    buildUrl: (model) =>
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    buildHeaders: (key) => ({
      "Content-Type": "application/json",
      "x-goog-api-key": key,
    }),
    buildBody: (messages, _model, _jsonMode) => {
      // Gemini utilise un format différent : systemInstruction + contents
      const systemMsg = messages.find(m => m.role === "system");
      const userMsgs = messages.filter(m => m.role !== "system");
      return {
        systemInstruction: systemMsg ? { parts: [{ text: systemMsg.content }] } : undefined,
        contents: userMsgs.map(m => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 4000,
        },
      };
    },
    extractContent: (data) => data.candidates?.[0]?.content?.parts?.[0]?.text ?? "",
    defaultModel: "gemini-1.5-flash",
    structureModel: "gemini-1.5-flash",
  },

  claude: {
    buildUrl: () => "https://api.anthropic.com/v1/messages",
    buildHeaders: (key) => ({
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    }),
    buildBody: (messages, model, _jsonMode) => {
      const systemMsg = messages.find(m => m.role === "system");
      const otherMsgs = messages.filter(m => m.role !== "system");
      return {
        model,
        max_tokens: 4000,
        temperature: 0.3,
        ...(systemMsg ? { system: systemMsg.content } : {}),
        messages: otherMsgs.map(m => ({ role: m.role, content: m.content })),
      };
    },
    extractContent: (data) => data.content?.[0]?.text ?? "",
    defaultModel: "claude-3-haiku-20240307",
    structureModel: "claude-3-5-sonnet-20241022",
  },

  deepseek: {
    buildUrl: () => "https://api.deepseek.com/v1/chat/completions",
    buildHeaders: (key) => ({
      "Content-Type": "application/json",
      "Authorization": `Bearer ${key}`,
    }),
    buildBody: (messages, model, jsonMode) => ({
      model,
      messages,
      temperature: 0.3,
      max_tokens: 4000,
      ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
    }),
    extractContent: (data) => data.choices?.[0]?.message?.content ?? "",
    defaultModel: "deepseek-chat",
    structureModel: "deepseek-chat",
  },
};

// ── Types ──────────────────────────────────────────────────────────────

export interface AIServiceConfig {
  providerId: AIProviderId;
  apiKey: string;
}

export interface GenerateStructureResult {
  analysis: AIAnalysis;
  phases: Omit<Phase, "projectId">[];
  projectTitle: string;
  projectDescription: string;
  projectType: string;
}

// ── Classe principale ──────────────────────────────────────────────────

class AIService {
  /**
   * Appel générique à n'importe quel provider.
   */
  private async callProvider(
    messages: Message[],
    config: AIServiceConfig,
    jsonMode = false
  ): Promise<string> {
    const { providerId, apiKey } = config;
    const provider = PROVIDERS[providerId];

    const model = jsonMode ? provider.structureModel : provider.defaultModel;
    const url = provider.buildUrl(model);
    const headers = provider.buildHeaders(apiKey);
    const body = provider.buildBody(messages, model, jsonMode);

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      let errorMsg = `Erreur ${providerId} : ${response.status}`;
      try {
        const err = await response.json();
        // Chaque provider a un format d'erreur différent
        errorMsg =
          err?.error?.message ??
          err?.message ??
          err?.error?.code ??
          errorMsg;
      } catch {}
      throw new Error(errorMsg);
    }

    const data = await response.json();
    const content = provider.extractContent(data);
    if (!content) throw new Error("La réponse IA est vide.");
    return content;
  }

  /**
   * Génère la structuration complète d'un projet.
   */
  async generateProjectStructure(
    description: string,
    config: AIServiceConfig
  ): Promise<GenerateStructureResult> {
    const prompt = `Analyse ce projet et produis une structuration complète en JSON.

DESCRIPTION DU PROJET :
${description}

Produis un JSON avec exactement cette structure (sans rien d'autre) :
{
  "projectTitle": "Titre court et précis",
  "projectDescription": "Description en 1-2 phrases",
  "projectType": "Type court (ex: PWA Mobile, SaaS B2B, API Backend, Script Python...)",
  "analysis": {
    "objective": "Objectif principal en 2-3 phrases",
    "features": ["Feature 1", "Feature 2"],
    "constraints": ["Contrainte 1"],
    "technologies": ["Tech 1", "Tech 2"],
    "dependencies": ["Dépendance 1"],
    "risks": [{ "title": "Titre", "description": "Détail", "severity": "blocking|important|optional" }],
    "missingInfo": ["Info manquante 1"],
    "complexity": "low|medium|high|very_high",
    "estimatedTotalHours": 40,
    "generatedAt": "${new Date().toISOString()}"
  },
  "phases": [
    {
      "title": "Nom de la phase",
      "order": 1,
      "status": "pending",
      "tasks": [
        {
          "id": "unique-id-1",
          "phaseId": "will-be-set",
          "projectId": "will-be-set",
          "title": "Titre précis et actionnable",
          "description": "Ce que cette tâche accomplit concrètement",
          "status": "todo",
          "priority": "high|medium|low|critical",
          "estimatedMinutes": 90,
          "actualMinutes": 0,
          "dependencies": [],
          "tags": ["backend"],
          "createdAt": "${new Date().toISOString()}",
          "updatedAt": "${new Date().toISOString()}",
          "subtasks": []
        }
      ]
    }
  ]
}`;

    const messages: Message[] = [
      { role: "system", content: SYSTEM_PROMPT_STRUCTURATION },
      { role: "user", content: prompt },
    ];

    const raw = await this.callProvider(messages, config, true);

    // Nettoyer si le modèle a quand même ajouté du markdown
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
    const parsed = JSON.parse(cleaned);

    const phases = (parsed.phases ?? []).map((ph: any, phIdx: number) => ({
      ...ph,
      id: uuidv4(),
      order: ph.order ?? phIdx + 1,
      tasks: (ph.tasks ?? []).map((t: any) => ({
        ...t,
        id: uuidv4(),
        actualMinutes: 0,
        subtasks: t.subtasks ?? [],
        dependencies: t.dependencies ?? [],
        tags: t.tags ?? [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })),
    }));

    return {
      projectTitle: parsed.projectTitle ?? "Nouveau projet",
      projectDescription: parsed.projectDescription ?? description.slice(0, 120),
      projectType: parsed.projectType ?? "Projet",
      analysis: { ...parsed.analysis, generatedAt: new Date().toISOString() },
      phases,
    };
  }

  /**
   * Chat conversationnel avec contexte projet.
   * Utilisé dans la page projet pour discuter avec l'IA.
   */
  async chat(
    history: Message[],
    userMessage: string,
    projectContext: string,
    config: AIServiceConfig
  ): Promise<string> {
    const contextualSystem = SYSTEM_PROMPT_ASSISTANT + `\n\nCONTEXTE DU PROJET ACTUEL :\n${projectContext}`;

    const messages: Message[] = [
      { role: "system", content: contextualSystem },
      ...history.slice(-10), // garder les 10 derniers messages pour le contexte
      { role: "user", content: userMessage },
    ];

    return this.callProvider(messages, config, false);
  }

  /**
   * Question rapide de suivi sur un projet (sans historique long).
   */
  async askFollowUp(
    projectContext: string,
    question: string,
    config: AIServiceConfig
  ): Promise<string> {
    const messages: Message[] = [
      { role: "system", content: SYSTEM_PROMPT_ASSISTANT },
      { role: "user", content: `Contexte projet :\n${projectContext}\n\nQuestion : ${question}` },
    ];
    return this.callProvider(messages, config, false);
  }

  /**
   * Test de connexion : vérifie que la clé API est valide.
   */
  async testConnection(config: AIServiceConfig): Promise<{ ok: boolean; error?: string }> {
    try {
      const messages: Message[] = [
        { role: "user", content: "Réponds uniquement : OK" },
      ];
      const result = await this.callProvider(messages, config, false);
      return { ok: result.length > 0 };
    } catch (err: any) {
      return { ok: false, error: err?.message ?? "Erreur inconnue" };
    }
  }

  /**
   * Mode hors-ligne : structure de démonstration sans API.
   */
  generateDemoStructure(description: string): GenerateStructureResult {
    const now = new Date().toISOString();
    const uid = () => uuidv4();

    const desc = description.toLowerCase();
    const isPWA = desc.includes("pwa") || desc.includes("mobile") || desc.includes("application");
    const isSaaS = desc.includes("saas") || desc.includes("b2b") || desc.includes("abonnement");
    const isData = desc.includes("data") || desc.includes("pipeline") || desc.includes("python");

    const projectType = isPWA ? "PWA Mobile" : isSaaS ? "SaaS B2B" : isData ? "Data / Automation" : "Projet Web";

    const ph1 = uid(), ph2 = uid(), ph3 = uid(), ph4 = uid();
    const t1 = uid(), t2 = uid(), t3 = uid(), t4 = uid();
    const t5 = uid(), t6 = uid(), t7 = uid(), t8 = uid();

    return {
      projectTitle: "Nouveau projet",
      projectDescription: description.slice(0, 150),
      projectType,
      analysis: {
        objective: `Développer ${projectType.toLowerCase()} selon la description fournie, de manière itérative.`,
        features: ["Interface utilisateur principale", "Gestion des données", "Authentification sécurisée", "API adaptée"],
        constraints: ["Ressources limitées à un développeur", "Délais à définir selon les disponibilités"],
        technologies: isPWA
          ? ["React", "TypeScript", "Supabase", "Tailwind CSS"]
          : isSaaS
          ? ["Next.js", "Supabase", "Stripe", "TypeScript"]
          : ["Python", "PostgreSQL", "TypeScript"],
        dependencies: ["Configuration de l'environnement requise avant développement"],
        risks: [
          { title: "Complexité sous-estimée", description: "Les fonctionnalités peuvent nécessiter plus de temps que prévu.", severity: "important" as const },
          { title: "Informations manquantes", description: "La description ne précise pas toutes les exigences techniques. Active un provider IA pour une analyse approfondie.", severity: "important" as const },
        ],
        missingInfo: ["Stack préférée non précisée", "Hébergement cible non défini", "Nombre d'utilisateurs cibles"],
        complexity: "medium" as const,
        estimatedTotalHours: 32,
        generatedAt: now,
      },
      phases: [
        {
          id: ph1, title: "Analyse et Architecture", order: 1, status: "pending" as const,
          tasks: [
            { id: t1, projectId: "", phaseId: ph1, title: "Définir les exigences fonctionnelles détaillées", description: "Lister précisément toutes les fonctionnalités, flux utilisateur et contraintes techniques.", status: "todo" as const, priority: "high" as const, estimatedMinutes: 90, actualMinutes: 0, dependencies: [], tags: ["analyse"], createdAt: now, updatedAt: now, subtasks: [] },
            { id: t2, projectId: "", phaseId: ph1, title: "Choisir et configurer la stack technique", description: "Sélectionner les technologies adaptées et initialiser l'environnement de développement.", status: "todo" as const, priority: "high" as const, estimatedMinutes: 60, actualMinutes: 0, dependencies: [t1], tags: ["setup"], createdAt: now, updatedAt: now, subtasks: [] },
          ],
        },
        {
          id: ph2, title: "Infrastructure et Base de données", order: 2, status: "pending" as const,
          tasks: [
            { id: t3, projectId: "", phaseId: ph2, title: "Concevoir le schéma de base de données", description: "Créer les tables, relations et index optimaux.", status: "todo" as const, priority: "high" as const, estimatedMinutes: 75, actualMinutes: 0, dependencies: [t2], tags: ["db"], createdAt: now, updatedAt: now, subtasks: [] },
            { id: t4, projectId: "", phaseId: ph2, title: "Configurer l'authentification", description: "Mettre en place le système d'authentification sécurisé avec les règles d'accès.", status: "todo" as const, priority: "high" as const, estimatedMinutes: 90, actualMinutes: 0, dependencies: [t3], tags: ["auth"], createdAt: now, updatedAt: now, subtasks: [] },
          ],
        },
        {
          id: ph3, title: "Développement Principal", order: 3, status: "pending" as const,
          tasks: [
            { id: t5, projectId: "", phaseId: ph3, title: "Développer les fonctionnalités principales", description: "Implémenter le cœur fonctionnel de l'application selon les exigences définies.", status: "todo" as const, priority: "high" as const, estimatedMinutes: 180, actualMinutes: 0, dependencies: [t4], tags: ["dev"], createdAt: now, updatedAt: now, subtasks: [] },
            { id: t6, projectId: "", phaseId: ph3, title: "Développer l'interface utilisateur", description: "Construire les composants UI, les vues et les interactions.", status: "todo" as const, priority: "medium" as const, estimatedMinutes: 180, actualMinutes: 0, dependencies: [t4], tags: ["ui"], createdAt: now, updatedAt: now, subtasks: [] },
            { id: t7, projectId: "", phaseId: ph3, title: "Intégration des services externes", description: "Connecter les APIs tierces, services cloud ou services de paiement.", status: "todo" as const, priority: "medium" as const, estimatedMinutes: 120, actualMinutes: 0, dependencies: [t5], tags: ["intégration"], createdAt: now, updatedAt: now, subtasks: [] },
          ],
        },
        {
          id: ph4, title: "Tests et Déploiement", order: 4, status: "pending" as const,
          tasks: [
            { id: t8, projectId: "", phaseId: ph4, title: "Tests fonctionnels et corrections", description: "Tester tous les flux utilisateur, corriger les bugs et valider les performances.", status: "todo" as const, priority: "high" as const, estimatedMinutes: 120, actualMinutes: 0, dependencies: [t5, t6, t7], tags: ["tests"], createdAt: now, updatedAt: now, subtasks: [] },
          ],
        },
      ],
    };
  }
}

export const aiService = new AIService();
