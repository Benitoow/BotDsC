const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const PROFILES_FILE = path.join(DATA_DIR, 'user-profiles.json');
const TRIGGERS_FILE = path.join(DATA_DIR, 'triggers.json');
const TEMPORAL_FILE = path.join(DATA_DIR, 'temporal-behavior.json');
const MODERATION_FILE = path.join(DATA_DIR, 'moderation.json');
const LOCALIZATION_FILE = path.join(DATA_DIR, 'localization.json');

// Cache en mémoire
let profiles = {};
let triggers = {};
let temporal = {};
let moderation = {};
let localization = {};
let userCooldowns = new Map();
let userMessageCount = new Map();

// Charger les données au démarrage
function loadData() {
    try {
        if (fs.existsSync(PROFILES_FILE)) {
            profiles = JSON.parse(fs.readFileSync(PROFILES_FILE, 'utf8'));
        }
        if (fs.existsSync(TRIGGERS_FILE)) {
            triggers = JSON.parse(fs.readFileSync(TRIGGERS_FILE, 'utf8'));
        }
        if (fs.existsSync(TEMPORAL_FILE)) {
            temporal = JSON.parse(fs.readFileSync(TEMPORAL_FILE, 'utf8'));
        }
        if (fs.existsSync(MODERATION_FILE)) {
            moderation = JSON.parse(fs.readFileSync(MODERATION_FILE, 'utf8'));
        }
        if (fs.existsSync(LOCALIZATION_FILE)) {
            localization = JSON.parse(fs.readFileSync(LOCALIZATION_FILE, 'utf8'));
        }
        console.log('✅ Données contextuelles chargées');
    } catch (error) {
        console.error('❌ Erreur chargement données:', error.message);
    }
}

// Sauvegarder les profils utilisateurs
function saveProfiles() {
    try {
        fs.writeFileSync(PROFILES_FILE, JSON.stringify(profiles, null, 2));
    } catch (error) {
        console.error('❌ Erreur sauvegarde profils:', error.message);
    }
}

// Obtenir ou créer un profil utilisateur
function getUserProfile(userId, userName) {
    if (!profiles.profiles) profiles.profiles = {};
    
    if (!profiles.profiles[userId]) {
        profiles.profiles[userId] = {
            id: userId,
            name: userName,
            first_seen: new Date().toISOString(),
            last_seen: new Date().toISOString(),
            interaction_count: 0,
            preferences: {
                topics: [],
                style: 'unknown',
                humor_level: 'medium'
            },
            learned_facts: [],
            personality_notes: []
        };
        saveProfiles();
    }
    
    return profiles.profiles[userId];
}

// Mettre à jour le profil utilisateur
function updateUserProfile(userId, userName, message) {
    const profile = getUserProfile(userId, userName);
    profile.last_seen = new Date().toISOString();
    profile.interaction_count++;
    
    // Apprendre des faits basiques du message
    const lowerMsg = message.toLowerCase();
    
    // Détection de sujets
    if (lowerMsg.includes('jeu') || lowerMsg.includes('gaming')) {
        if (!profile.preferences.topics.includes('gaming')) {
            profile.preferences.topics.push('gaming');
        }
    }
    if (lowerMsg.includes('musique') || lowerMsg.includes('écoute')) {
        if (!profile.preferences.topics.includes('music')) {
            profile.preferences.topics.push('music');
        }
    }
    if (lowerMsg.includes('politique')) {
        if (!profile.preferences.topics.includes('politics')) {
            profile.preferences.topics.push('politics');
        }
    }
    
    // Détection du style (caps = excited)
    if (message === message.toUpperCase() && message.length > 5) {
        profile.preferences.style = 'excited';
    }
    
    saveProfiles();
    return profile;
}

// Vérifier les triggers de mots-clés
function checkTriggers(message) {
    const results = [];
    const lowerMsg = message.toLowerCase();
    
    if (triggers.keywords) {
        for (const [keyword, data] of Object.entries(triggers.keywords)) {
            if (lowerMsg.includes(keyword)) {
                results.push({
                    type: 'keyword',
                    keyword: keyword,
                    response: data.responses[Math.floor(Math.random() * data.responses.length)],
                    emoji: data.emoji
                });
            }
        }
    }
    
    return results;
}

// Obtenir le comportement temporel actuel
function getTemporalContext() {
    const now = new Date();
    const hour = now.getHours();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const day = dayNames[now.getDay()];
    const dateKey = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    let context = {
        mood: 'normal',
        personality_modifier: '',
        greeting: ''
    };
    
    // Comportement horaire
    if (temporal.hourly) {
        for (const [range, data] of Object.entries(temporal.hourly)) {
            const [start, end] = range.split('-').map(Number);
            if (hour >= start && hour <= end) {
                context.mood = data.mood;
                context.personality_modifier = data.personality_modifier;
                context.greeting = data.greeting_style;
                break;
            }
        }
    }
    
    // Comportement hebdomadaire
    if (temporal.weekly && temporal.weekly[day]) {
        context.day_mood = temporal.weekly[day].mood;
        context.day_modifier = temporal.weekly[day].modifier;
    }
    
    // Dates spéciales
    if (temporal.special_dates && temporal.special_dates[dateKey]) {
        context.special_event = temporal.special_dates[dateKey].event;
        context.special_personality = temporal.special_dates[dateKey].personality;
    }
    
    return context;
}

// Vérifier le cooldown utilisateur
function checkCooldown(userId) {
    if (!moderation.cooldown || !moderation.cooldown.enabled) {
        return { allowed: true };
    }
    
    const lastCall = userCooldowns.get(userId);
    const now = Date.now();
    const cooldownMs = (moderation.cooldown.seconds_between_ai_calls || 3) * 1000;
    
    if (lastCall && (now - lastCall) < cooldownMs) {
        const remaining = Math.ceil((cooldownMs - (now - lastCall)) / 1000);
        return {
            allowed: false,
            remaining: remaining,
            message: moderation.cooldown.message.replace('{seconds}', remaining)
        };
    }
    
    userCooldowns.set(userId, now);
    return { allowed: true };
}

// Détecter le spam
function checkSpam(userId) {
    const now = Date.now();
    const rules = moderation.server_rules?.default || {};
    const limit = rules.spam_limit || 5;
    const window = (rules.spam_window_seconds || 10) * 1000;
    
    if (!userMessageCount.has(userId)) {
        userMessageCount.set(userId, []);
    }
    
    const timestamps = userMessageCount.get(userId);
    // Nettoyer les anciens timestamps
    const recent = timestamps.filter(t => (now - t) < window);
    recent.push(now);
    userMessageCount.set(userId, recent);
    
    if (recent.length > limit) {
        return {
            isSpam: true,
            message: moderation.auto_responses?.spam_detected?.[0] || "Doucement sur les messages !"
        };
    }
    
    return { isSpam: false };
}

// Obtenir un emoji aléatoire selon l'humeur
function getRandomEmoji(mood = 'happy') {
    const emojis = localization.internet_speak?.emojis_mood?.[mood] || ['😊'];
    return emojis[Math.floor(Math.random() * emojis.length)];
}

// Enrichir le contexte avec expressions locales
function getLocalExpression(type = 'agreement') {
    const slang = localization.french_slang?.[type];
    if (slang && slang.length > 0) {
        return slang[Math.floor(Math.random() * slang.length)];
    }
    return '';
}

// Construire un contexte enrichi pour l'IA
function buildEnrichedContext(userId, userName, message) {
    updateUserProfile(userId, userName, message);
    const profile = getUserProfile(userId, userName);
    const temporalCtx = getTemporalContext();
    const triggeredKeywords = checkTriggers(message);
    
    let enrichment = '';
    
    // Informations temporelles
    if (temporalCtx.personality_modifier) {
        enrichment += `\n[Humeur du moment: ${temporalCtx.mood}. ${temporalCtx.personality_modifier}]`;
    }
    if (temporalCtx.special_event) {
        enrichment += `\n[Aujourd'hui: ${temporalCtx.special_event}. ${temporalCtx.special_personality}]`;
    }
    
    // Informations sur l'utilisateur
    if (profile.interaction_count > 5) {
        enrichment += `\n[Tu connais ${userName} depuis ${profile.interaction_count} interactions.`;
        if (profile.preferences.topics.length > 0) {
            enrichment += ` Intérêts: ${profile.preferences.topics.join(', ')}.`;
        }
        if (profile.learned_facts.length > 0) {
            enrichment += ` Faits: ${profile.learned_facts.slice(-3).join('; ')}.`;
        }
        enrichment += `]`;
    }
    
    // Triggers détectés
    if (triggeredKeywords.length > 0) {
        enrichment += `\n[Mots-clés détectés: ${triggeredKeywords.map(t => t.keyword).join(', ')}]`;
    }
    
    return {
        enrichment,
        profile,
        temporal: temporalCtx,
        triggers: triggeredKeywords,
        emoji: getRandomEmoji(temporalCtx.mood)
    };
}

// Ajouter un fait appris sur un utilisateur
function learnUserFact(userId, fact) {
    if (!profiles.profiles[userId]) return;
    
    if (!profiles.profiles[userId].learned_facts.includes(fact)) {
        profiles.profiles[userId].learned_facts.push(fact);
        // Limiter à 20 faits max
        if (profiles.profiles[userId].learned_facts.length > 20) {
            profiles.profiles[userId].learned_facts.shift();
        }
        saveProfiles();
    }
}

module.exports = {
    loadData,
    getUserProfile,
    updateUserProfile,
    checkTriggers,
    getTemporalContext,
    checkCooldown,
    checkSpam,
    getRandomEmoji,
    getLocalExpression,
    buildEnrichedContext,
    learnUserFact,
    saveProfiles
};
