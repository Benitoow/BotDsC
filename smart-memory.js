const fs = require('fs');
const path = require('path');

const MEMORY_DIR = path.join(__dirname, 'data');
const SMART_MEMORY_FILE = path.join(MEMORY_DIR, 'smart-memory.json');

// Stockage mémoire intelligente par utilisateur
let smartMemories = {};

// Charger les mémoires au démarrage
function loadSmartMemories() {
    try {
        if (fs.existsSync(SMART_MEMORY_FILE)) {
            smartMemories = JSON.parse(fs.readFileSync(SMART_MEMORY_FILE, 'utf8'));
            console.log('🧠 Mémoires intelligentes chargées');
        } else {
            smartMemories = {};
        }
    } catch (error) {
        console.error('❌ Erreur chargement mémoires:', error.message);
        smartMemories = {};
    }
}

// Sauvegarder les mémoires
function saveSmartMemories() {
    try {
        fs.writeFileSync(SMART_MEMORY_FILE, JSON.stringify(smartMemories, null, 2));
    } catch (error) {
        console.error('❌ Erreur sauvegarde mémoires:', error.message);
    }
}

// Obtenir la mémoire intelligente d'un utilisateur
function getSmartMemory(userId, userName) {
    if (!smartMemories[userId]) {
        smartMemories[userId] = {
            userId: userId,
            userName: userName,
            created: new Date().toISOString(),
            lastUpdate: new Date().toISOString(),
            
            // Catégories de mémoire intelligente
            identity: {
                facts: [],           // Faits sur la personne (max 30)
                preferences: [],     // Préférences (max 20)
                dislikes: []         // Ce qu'il n'aime pas (max 15)
            },
            relationships: {
                people: [],          // Personnes importantes mentionnées (max 20)
                context: []          // Contexte relationnel (max 15)
            },
            timeline: {
                important_events: [], // Événements marquants (max 25)
                recent_topics: []     // Sujets récents importants (max 10)
            },
            emotions: {
                mood_history: [],     // Historique d'humeurs détectées (max 15)
                triggers: []          // Ce qui déclenche des émotions (max 10)
            },
            knowledge: {
                expertise: [],        // Domaines d'expertise (max 15)
                interests: [],        // Centres d'intérêt détaillés (max 20)
                current_projects: []  // Projets en cours (max 10)
            },
            conversationStyle: {
                vocabulary: [],       // Mots/expressions fréquents (max 15)
                humor_type: 'unknown', // Type d'humour
                formality: 'medium'   // Niveau de formalité
            }
        };
    }
    return smartMemories[userId];
}

// Extraire les informations importantes d'un message
function extractImportantInfo(message, userName) {
    const lowerMsg = message.toLowerCase();
    const extracted = {
        facts: [],
        preferences: [],
        dislikes: [],
        people: [],
        events: [],
        topics: [],
        emotions: [],
        expertise: [],
        interests: []
    };
    
    // 🔍 FILTRE : Ignorer les messages trop courts ou sans sens
    if (message.length < 10 || lowerMsg.match(/^(oui|non|ok|d'accord|ah|oh|hmm|euh)$/)) {
        return extracted; // Ne rien mémoriser
    }
    
    // Détection de faits personnels (je suis, je m'appelle, j'ai)
    if (lowerMsg.match(/je suis|je m'appelle|j'ai \d+|je travaille|j'étudie|je vis|j'habite/)) {
        // Extraire la phrase complète pour contexte
        const sentence = message.match(/[^.!?]+[.!?]?/)?.[0] || message;
        extracted.facts.push(sentence.substring(0, 150).trim());
    }
    
    // Détection de préférences (j'adore, j'aime, je préfère)
    if (lowerMsg.match(/j'adore|j'aime beaucoup|j'aime|je préfère|je kiffe|c'est génial|c'est super|c'est cool|fan de/)) {
        const sentence = message.match(/[^.!?]+[.!?]?/)?.[0] || message;
        extracted.preferences.push(sentence.substring(0, 120).trim());
    }
    
    // Détection de dislikes (je déteste, je n'aime pas)
    if (lowerMsg.match(/je déteste|je n'aime pas|je hais|c'est nul|ça craint|c'est chiant|insupportable/)) {
        const sentence = message.match(/[^.!?]+[.!?]?/)?.[0] || message;
        extracted.dislikes.push(sentence.substring(0, 120).trim());
    }
    
    // Détection de personnes mentionnées (@mentions ou noms propres)
    const mentionMatches = message.match(/@(\w+)/g);
    if (mentionMatches) {
        extracted.people.push(...mentionMatches.map(m => m.substring(0, 50)));
    }
    
    // Détection d'événements importants avec contexte temporel
    if (lowerMsg.match(/hier|aujourd'hui|demain|cette semaine|le mois|l'année|récemment|bientôt|viens de|va|nouveau/)) {
        // Uniquement si le message contient une action ou un événement significatif
        if (lowerMsg.match(/commencé|fini|obtenu|rencontré|acheté|créé|lancé|déménagé|changé|décidé/)) {
            const sentence = message.match(/[^.!?]+[.!?]?/)?.[0] || message;
            extracted.events.push(sentence.substring(0, 150).trim());
        }
    }
    
    // Détection d'expertise (compétences réelles)
    if (lowerMsg.match(/je maîtrise|expert en|je code en|je développe en|je parle|je pratique depuis|spécialisé|professionnel/)) {
        const sentence = message.match(/[^.!?]+[.!?]?/)?.[0] || message;
        extracted.expertise.push(sentence.substring(0, 120).trim());
    }
    
    // Détection d'intérêts (gaming, musique, politique, tech, sport, etc.)
    const interestKeywords = {
        'gaming': ['jeu', 'gaming', 'gamer', 'joue', 'console', 'pc gaming'],
        'music': ['musique', 'écoute', 'chante', 'instrument', 'concert', 'album'],
        'politics': ['politique', 'élection', 'gouvernement'],
        'tech': ['tech', 'technologie', 'code', 'dev', 'programmation', 'informatique'],
        'sport': ['sport', 'foot', 'basket', 'fitness', 'course', 'gym'],
        'cinema': ['film', 'cinéma', 'série', 'netflix', 'regarder'],
        'reading': ['livre', 'lecture', 'lire', 'roman', 'bouquin'],
        'art': ['art', 'dessin', 'peinture', 'créatif'],
        'cooking': ['cuisine', 'cuisiner', 'recette', 'plat'],
        'travel': ['voyage', 'voyager', 'pays', 'destination']
    };
    
    for (const [category, keywords] of Object.entries(interestKeywords)) {
        for (const keyword of keywords) {
            if (lowerMsg.includes(keyword)) {
                if (!extracted.interests.includes(category)) {
                    extracted.interests.push(category);
                }
                break;
            }
        }
    }
    
    // Détection d'émotions fortes avec contexte
    const emotionPatterns = {
        joy: /super content|trop content|heureux|génial|excellent|parfait|top|cool|love/,
        sadness: /triste|déprimé|déçu|mal|dur|difficile/,
        anger: /énervé|en colère|furieux|putain|bordel|merde/,
        fear: /peur|inquiet|angoisse|stress|flippé/,
        surprise: /surpris|choqué|incroyable|pas croire/
    };
    
    for (const [emotion, pattern] of Object.entries(emotionPatterns)) {
        if (lowerMsg.match(pattern)) {
            extracted.emotions.push({
                emotion: emotion,
                context: message.substring(0, 100).trim()
            });
            break; // Une seule émotion par message
        }
    }
    
    // 🎯 Détection de sujets importants (affirmations fortes, questions significatives, problèmes)
    // Ignorer les questions triviales
    if (message.includes('?')) {
        // Garder seulement les questions significatives (> 15 caractères)
        if (message.length > 15 && !lowerMsg.match(/^(quoi|pourquoi|comment|qui|où) \?$/)) {
            // Question avec substance
            if (lowerMsg.match(/comment|pourquoi|qu'est-ce|quel|quelle|penses-tu|avis|conseil/)) {
                extracted.topics.push(message.substring(0, 120).trim());
            }
        }
    } else if (lowerMsg.match(/important|crucial|essentiel|problème|besoin|cherche|voudrais|aimerais|projet/)) {
        // Affirmation importante
        const sentence = message.match(/[^.!?]+[.!?]?/)?.[0] || message;
        extracted.topics.push(sentence.substring(0, 120).trim());
    }
    
    return extracted;
}

// Mettre à jour la mémoire intelligente avec un nouveau message
function updateSmartMemory(userId, userName, message) {
    const memory = getSmartMemory(userId, userName);
    const extracted = extractImportantInfo(message, userName);
    
    memory.lastUpdate = new Date().toISOString();
    
    // Ajouter les faits (limité à 30)
    for (const fact of extracted.facts) {
        if (!memory.identity.facts.includes(fact)) {
            memory.identity.facts.push(fact);
            if (memory.identity.facts.length > 30) {
                memory.identity.facts.shift(); // Retirer le plus ancien
            }
        }
    }
    
    // Ajouter les préférences (limité à 20)
    for (const pref of extracted.preferences) {
        if (!memory.identity.preferences.includes(pref)) {
            memory.identity.preferences.push(pref);
            if (memory.identity.preferences.length > 20) {
                memory.identity.preferences.shift();
            }
        }
    }
    
    // Ajouter les dislikes (limité à 15)
    for (const dislike of extracted.dislikes) {
        if (!memory.identity.dislikes.includes(dislike)) {
            memory.identity.dislikes.push(dislike);
            if (memory.identity.dislikes.length > 15) {
                memory.identity.dislikes.shift();
            }
        }
    }
    
    // Ajouter les personnes (limité à 20)
    for (const person of extracted.people) {
        if (!memory.relationships.people.includes(person)) {
            memory.relationships.people.push(person);
            if (memory.relationships.people.length > 20) {
                memory.relationships.people.shift();
            }
        }
    }
    
    // Ajouter les événements (limité à 25)
    for (const event of extracted.events) {
        memory.timeline.important_events.push({
            date: new Date().toISOString(),
            event: event
        });
        if (memory.timeline.important_events.length > 25) {
            memory.timeline.important_events.shift();
        }
    }
    
    // Ajouter les sujets récents (limité à 10, les plus récents)
    for (const topic of extracted.topics) {
        memory.timeline.recent_topics.unshift(topic); // Ajouter au début
        if (memory.timeline.recent_topics.length > 10) {
            memory.timeline.recent_topics.pop(); // Retirer le plus ancien
        }
    }
    
    // Ajouter les émotions (limité à 15)
    for (const emotion of extracted.emotions) {
        memory.emotions.mood_history.push({
            date: new Date().toISOString(),
            ...emotion
        });
        if (memory.emotions.mood_history.length > 15) {
            memory.emotions.mood_history.shift();
        }
    }
    
    // Ajouter l'expertise (limité à 15)
    for (const exp of extracted.expertise) {
        if (!memory.knowledge.expertise.includes(exp)) {
            memory.knowledge.expertise.push(exp);
            if (memory.knowledge.expertise.length > 15) {
                memory.knowledge.expertise.shift();
            }
        }
    }
    
    // Ajouter les intérêts (limité à 20)
    for (const interest of extracted.interests) {
        if (!memory.knowledge.interests.includes(interest)) {
            memory.knowledge.interests.push(interest);
            if (memory.knowledge.interests.length > 20) {
                memory.knowledge.interests.shift();
            }
        }
    }
    
    saveSmartMemories();
    return memory;
}

// Construire un résumé de mémoire pour le contexte IA
function buildMemorySummary(userId) {
    const memory = smartMemories[userId];
    if (!memory) return '';
    
    // Ne rien afficher si presque vide
    const totalItems = memory.identity.facts.length + 
                       memory.identity.preferences.length + 
                       memory.knowledge.expertise.length +
                       memory.knowledge.interests.length;
    
    if (totalItems === 0) return '';
    
    let summary = `\n[MÉMOIRE LONG TERME de ${memory.userName}]`;
    
    // 🔹 Identité (les plus récents et pertinents)
    if (memory.identity.facts.length > 0) {
        const recentFacts = memory.identity.facts.slice(-3).filter(f => f && f.length > 10);
        if (recentFacts.length > 0) {
            summary += `\n• Profil: ${recentFacts.join('. ')}`;
        }
    }
    
    // 💚 Préférences (les plus importantes)
    if (memory.identity.preferences.length > 0) {
        const topPrefs = memory.identity.preferences.slice(-3).filter(p => p && p.length > 10);
        if (topPrefs.length > 0) {
            summary += `\n• Aime: ${topPrefs.join(', ')}`;
        }
    }
    
    // 💔 Dislikes
    if (memory.identity.dislikes.length > 0) {
        const topDislikes = memory.identity.dislikes.slice(-2).filter(d => d && d.length > 10);
        if (topDislikes.length > 0) {
            summary += `\n• N'aime pas: ${topDislikes.join(', ')}`;
        }
    }
    
    // 👥 Relations (personnes importantes)
    if (memory.relationships.people.length > 0) {
        summary += `\n• Connaît: ${memory.relationships.people.slice(-5).join(', ')}`;
    }
    
    // 🎓 Expertise et compétences
    if (memory.knowledge.expertise.length > 0) {
        const skills = memory.knowledge.expertise.slice(-3).filter(e => e && e.length > 10);
        if (skills.length > 0) {
            summary += `\n• Compétences: ${skills.join('; ')}`;
        }
    }
    
    // 🎯 Intérêts (catégories)
    if (memory.knowledge.interests.length > 0) {
        const interests = memory.knowledge.interests.map(i => {
            const labels = {
                'gaming': 'Jeux vidéo',
                'music': 'Musique',
                'politics': 'Politique',
                'tech': 'Tech/Dev',
                'sport': 'Sport',
                'cinema': 'Films/Séries',
                'reading': 'Lecture',
                'art': 'Art',
                'cooking': 'Cuisine',
                'travel': 'Voyages'
            };
            return labels[i] || i;
        });
        summary += `\n• Centres d'intérêt: ${interests.join(', ')}`;
    }
    
    // 💬 Contexte récent (seulement si vraiment pertinent)
    if (memory.timeline.recent_topics.length > 0) {
        const meaningfulTopics = memory.timeline.recent_topics
            .slice(0, 2)
            .filter(t => t && t.length > 20); // Au moins 20 caractères
        
        if (meaningfulTopics.length > 0) {
            summary += `\n• Discussions récentes: ${meaningfulTopics.join('; ')}`;
        }
    }
    
    // 📅 Événements marquants récents
    if (memory.timeline.important_events.length > 0) {
        const recentEvents = memory.timeline.important_events
            .slice(-2)
            .filter(e => e && e.event && e.event.length > 15);
        
        if (recentEvents.length > 0) {
            const eventTexts = recentEvents.map(e => e.event);
            summary += `\n• Événements: ${eventTexts.join('; ')}`;
        }
    }
    
    // 😊 Humeur/émotions récentes (si pertinent)
    if (memory.emotions.mood_history.length > 0) {
        const recentMood = memory.emotions.mood_history[memory.emotions.mood_history.length - 1];
        const moodLabels = {
            'joy': 'content/heureux',
            'sadness': 'triste',
            'anger': 'énervé',
            'fear': 'inquiet',
            'surprise': 'surpris'
        };
        if (recentMood && recentMood.emotion) {
            summary += `\n• Humeur récente: ${moodLabels[recentMood.emotion] || recentMood.emotion}`;
        }
    }
    
    return summary;
}

// Obtenir statistiques mémoire
function getMemoryStats(userId) {
    const memory = smartMemories[userId];
    if (!memory) return null;
    
    return {
        facts: memory.identity.facts.length,
        preferences: memory.identity.preferences.length,
        dislikes: memory.identity.dislikes.length,
        people: memory.relationships.people.length,
        events: memory.timeline.important_events.length,
        topics: memory.timeline.recent_topics.length,
        emotions: memory.emotions.mood_history.length,
        expertise: memory.knowledge.expertise.length,
        interests: memory.knowledge.interests.length,
        total: memory.identity.facts.length + 
               memory.identity.preferences.length + 
               memory.identity.dislikes.length +
               memory.relationships.people.length +
               memory.timeline.important_events.length +
               memory.knowledge.expertise.length +
               memory.knowledge.interests.length
    };
}

module.exports = {
    loadSmartMemories,
    saveSmartMemories,
    getSmartMemory,
    updateSmartMemory,
    buildMemorySummary,
    getMemoryStats
};
