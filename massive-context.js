const fs = require('fs');
const path = require('path');

/**
 * 🧠 SYSTÈME DE CONTEXTE MASSIF
 * Gère un contexte illimité avec compression intelligente et recherche sémantique
 */

const CONTEXT_DIR = path.join(__dirname, 'data', 'conversations');
const KNOWLEDGE_BASE_FILE = path.join(__dirname, 'data', 'knowledge-base.json');

// Créer les dossiers nécessaires
if (!fs.existsSync(CONTEXT_DIR)) {
    fs.mkdirSync(CONTEXT_DIR, { recursive: true });
}

// Base de connaissances globale (apprentissage permanent)
let knowledgeBase = {
    facts: new Map(),           // Faits appris (key: concept, value: info)
    conversations: new Map(),   // Résumés de conversations par utilisateur
    topics: new Map(),          // Sujets discutés avec contexte
    relationships: new Map(),   // Relations entre concepts
    lastUpdate: Date.now()
};

/**
 * Charger la base de connaissances
 */
function loadKnowledgeBase() {
    try {
        if (fs.existsSync(KNOWLEDGE_BASE_FILE)) {
            const data = JSON.parse(fs.readFileSync(KNOWLEDGE_BASE_FILE, 'utf8'));
            knowledgeBase.facts = new Map(Object.entries(data.facts || {}));
            knowledgeBase.conversations = new Map(Object.entries(data.conversations || {}));
            knowledgeBase.topics = new Map(Object.entries(data.topics || {}));
            knowledgeBase.relationships = new Map(Object.entries(data.relationships || {}));
            console.log(`✅ Base de connaissances chargée: ${knowledgeBase.facts.size} faits, ${knowledgeBase.topics.size} sujets`);
        }
    } catch (error) {
        console.error('❌ Erreur chargement base de connaissances:', error.message);
    }
}

/**
 * Sauvegarder la base de connaissances
 */
function saveKnowledgeBase() {
    try {
        const data = {
            facts: Object.fromEntries(knowledgeBase.facts),
            conversations: Object.fromEntries(knowledgeBase.conversations),
            topics: Object.fromEntries(knowledgeBase.topics),
            relationships: Object.fromEntries(knowledgeBase.relationships),
            lastUpdate: Date.now()
        };
        fs.writeFileSync(KNOWLEDGE_BASE_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('❌ Erreur sauvegarde base de connaissances:', error.message);
    }
}

/**
 * Obtenir le chemin du fichier de conversation d'un utilisateur
 */
function getUserConversationFile(userId) {
    return path.join(CONTEXT_DIR, `${userId}.json`);
}

/**
 * Charger l'historique complet d'un utilisateur
 */
function loadUserConversation(userId) {
    try {
        const filePath = getUserConversationFile(userId);
        if (fs.existsSync(filePath)) {
            return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        }
    } catch (error) {
        console.error(`❌ Erreur chargement conversation ${userId}:`, error.message);
    }
    
    return {
        userId: userId,
        messages: [],
        summaries: [],
        keyMoments: [],
        totalMessages: 0,
        firstMessage: null,
        lastMessage: null
    };
}

/**
 * Sauvegarder l'historique d'un utilisateur
 */
function saveUserConversation(userId, data) {
    try {
        const filePath = getUserConversationFile(userId);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error(`❌ Erreur sauvegarde conversation ${userId}:`, error.message);
    }
}

/**
 * Ajouter un message à l'historique d'un utilisateur
 */
function addMessage(userId, role, content, metadata = {}) {
    const conversation = loadUserConversation(userId);
    
    const message = {
        role: role,
        content: content,
        timestamp: Date.now(),
        metadata: metadata
    };
    
    conversation.messages.push(message);
    conversation.totalMessages++;
    conversation.lastMessage = Date.now();
    
    if (!conversation.firstMessage) {
        conversation.firstMessage = Date.now();
    }
    
    // Compression automatique si trop de messages (garder les 200 derniers en mémoire)
    if (conversation.messages.length > 200) {
        const toCompress = conversation.messages.splice(0, 100);
        const summary = compressMessages(toCompress);
        conversation.summaries.push(summary);
        console.log(`🗜️ Compression de 100 messages pour utilisateur ${userId}`);
    }
    
    saveUserConversation(userId, conversation);
    return conversation;
}

/**
 * Compresser une liste de messages en un résumé intelligent
 */
function compressMessages(messages) {
    const topics = new Set();
    const keyPhrases = [];
    const emotions = [];
    
    for (const msg of messages) {
        const content = msg.content.toLowerCase();
        
        // Extraire les sujets importants
        const words = content.split(/\s+/).filter(w => w.length > 4);
        words.forEach(w => topics.add(w));
        
        // Détecter les émotions
        if (content.match(/\b(heureux|content|cool|super|génial|excellent)\b/)) {
            emotions.push('positive');
        } else if (content.match(/\b(triste|nul|merde|chiant|horrible)\b/)) {
            emotions.push('negative');
        }
        
        // Garder les phrases importantes (avec ? ou !)
        if (content.match(/[?!]/)) {
            keyPhrases.push(msg.content.substring(0, 100));
        }
    }
    
    return {
        timestamp: Date.now(),
        messageCount: messages.length,
        timeRange: {
            start: messages[0]?.timestamp || Date.now(),
            end: messages[messages.length - 1]?.timestamp || Date.now()
        },
        topics: Array.from(topics).slice(0, 20),
        keyPhrases: keyPhrases.slice(0, 10),
        emotionalTone: emotions.length > 0 ? 
            (emotions.filter(e => e === 'positive').length > emotions.length / 2 ? 'positive' : 'negative') : 
            'neutral'
    };
}

/**
 * Construire un contexte massif pour une réponse
 */
function buildMassiveContext(userId, userName, currentMessage) {
    const conversation = loadUserConversation(userId);
    
    // Récupérer les derniers messages (contexte court terme)
    const recentMessages = conversation.messages.slice(-100);
    
    // Récupérer les résumés (contexte long terme)
    const summaries = conversation.summaries || [];
    
    // Construire le contexte
    let context = `\n📚 CONTEXTE MASSIF DE ${userName.toUpperCase()}:\n`;
    context += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    
    // Statistiques
    context += `📊 STATISTIQUES:\n`;
    context += `• Total messages: ${conversation.totalMessages}\n`;
    context += `• Messages en mémoire: ${conversation.messages.length}\n`;
    context += `• Périodes archivées: ${summaries.length}\n`;
    
    if (conversation.firstMessage) {
        const daysSince = Math.floor((Date.now() - conversation.firstMessage) / (1000 * 60 * 60 * 24));
        context += `• Relation depuis: ${daysSince} jour(s)\n`;
    }
    
    // Résumés des périodes archivées
    if (summaries.length > 0) {
        context += `\n📜 RÉSUMÉ DES CONVERSATIONS PASSÉES:\n`;
        summaries.slice(-3).forEach((summary, idx) => {
            const date = new Date(summary.timestamp).toLocaleDateString('fr-FR');
            context += `\nPériode ${idx + 1} (${date}):\n`;
            context += `• Sujets discutés: ${summary.topics.slice(0, 5).join(', ')}\n`;
            context += `• Ton émotionnel: ${summary.emotionalTone}\n`;
            if (summary.keyPhrases.length > 0) {
                context += `• Moments clés: "${summary.keyPhrases[0]}"\n`;
            }
        });
    }
    
    // Messages récents (contexte immédiat)
    context += `\n💬 CONVERSATION RÉCENTE (${Math.min(recentMessages.length, 50)} derniers messages):\n`;
    const displayMessages = recentMessages.slice(-50);
    displayMessages.forEach(msg => {
        const role = msg.role === 'user' ? userName : 'Bot';
        const preview = msg.content.length > 150 ? msg.content.substring(0, 150) + '...' : msg.content;
        context += `${role}: ${preview}\n`;
    });
    
    context += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    
    return context;
}

/**
 * Recherche sémantique dans l'historique
 */
function searchInHistory(userId, query, maxResults = 10) {
    const conversation = loadUserConversation(userId);
    const results = [];
    
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
    
    // Rechercher dans les messages récents
    for (let i = conversation.messages.length - 1; i >= 0 && results.length < maxResults; i--) {
        const msg = conversation.messages[i];
        const contentLower = msg.content.toLowerCase();
        
        let score = 0;
        queryWords.forEach(word => {
            if (contentLower.includes(word)) score++;
        });
        
        if (score > 0) {
            results.push({
                message: msg,
                score: score,
                age: Date.now() - msg.timestamp
            });
        }
    }
    
    // Trier par score puis par récence
    results.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.age - b.age;
    });
    
    return results.slice(0, maxResults);
}

/**
 * Extraire et stocker des faits importants
 */
function extractKnowledge(userId, userName, message, response) {
    // Détecter les déclarations de faits ("je suis", "j'ai", "je m'appelle", etc.)
    const lowerMsg = message.toLowerCase();
    
    // Nom
    const nameMatch = lowerMsg.match(/je m'appelle (\w+)|mon nom est (\w+)|appelle[- ]moi (\w+)/);
    if (nameMatch) {
        const name = nameMatch[1] || nameMatch[2] || nameMatch[3];
        knowledgeBase.facts.set(`${userId}_name`, {
            value: name,
            timestamp: Date.now(),
            confidence: 1.0
        });
    }
    
    // Âge
    const ageMatch = lowerMsg.match(/j'ai (\d+) ans|(\d+) ans/);
    if (ageMatch) {
        const age = ageMatch[1] || ageMatch[2];
        knowledgeBase.facts.set(`${userId}_age`, {
            value: age,
            timestamp: Date.now(),
            confidence: 0.9
        });
    }
    
    // Préférences
    if (lowerMsg.match(/j'aime|j'adore|je kiffe/)) {
        const preference = message.substring(lowerMsg.search(/j'aime|j'adore|je kiffe/)).substring(0, 100);
        const key = `${userId}_likes`;
        const existing = knowledgeBase.facts.get(key) || { value: [], timestamp: Date.now(), confidence: 0.8 };
        if (!Array.isArray(existing.value)) existing.value = [existing.value];
        existing.value.push(preference);
        existing.value = existing.value.slice(-10); // Garder les 10 dernières
        knowledgeBase.facts.set(key, existing);
    }
    
    // Dégoûts
    if (lowerMsg.match(/je déteste|j'aime pas|je hais/)) {
        const dislike = message.substring(lowerMsg.search(/je déteste|j'aime pas|je hais/)).substring(0, 100);
        const key = `${userId}_dislikes`;
        const existing = knowledgeBase.facts.get(key) || { value: [], timestamp: Date.now(), confidence: 0.8 };
        if (!Array.isArray(existing.value)) existing.value = [existing.value];
        existing.value.push(dislike);
        existing.value = existing.value.slice(-10);
        knowledgeBase.facts.set(key, dislike);
    }
    
    saveKnowledgeBase();
}

/**
 * Récupérer les faits connus sur un utilisateur
 */
function getUserKnowledge(userId) {
    const facts = {};
    
    for (const [key, value] of knowledgeBase.facts.entries()) {
        if (key.startsWith(`${userId}_`)) {
            const factType = key.replace(`${userId}_`, '');
            facts[factType] = value;
        }
    }
    
    return facts;
}

// Initialiser au démarrage
loadKnowledgeBase();

module.exports = {
    loadKnowledgeBase,
    saveKnowledgeBase,
    loadUserConversation,
    saveUserConversation,
    addMessage,
    buildMassiveContext,
    searchInHistory,
    extractKnowledge,
    getUserKnowledge,
    compressMessages
};
