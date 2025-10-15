// proactive-behavior.js - Comportement proactif intelligent du bot
const fs = require('fs');
const path = require('path');

class ProactiveBehavior {
    constructor() {
        this.dataPath = path.join(__dirname, 'data', 'proactive-data.json');
        this.data = this.loadData();
        
        // Configuration
        this.config = {
            minSilenceMinutes: 120,      // 2h de silence minimum avant d'agir
            maxSilenceMinutes: 360,      // 6h max (après ça, ne pas ping)
            cooldownHours: 3,            // 3h entre chaque message proactif
            maxDailyMessages: 4,         // Max 4 messages proactifs par jour
            minActiveUsers: 2,           // Min 2 users actifs dans les 24h
            reactionThreshold: 0.3,      // 30% de chance de réagir aux messages
        };
    }

    loadData() {
        try {
            if (fs.existsSync(this.dataPath)) {
                return JSON.parse(fs.readFileSync(this.dataPath, 'utf8'));
            }
        } catch (error) {
            console.error('❌ Erreur chargement données proactives:', error);
        }
        
        return {
            lastProactiveMessage: 0,
            dailyCount: 0,
            lastResetDate: new Date().toISOString().split('T')[0],
            channelActivity: {},
            userLastSeen: {},
            proactiveHistory: []
        };
    }

    saveData() {
        try {
            const dir = path.dirname(this.dataPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(this.dataPath, JSON.stringify(this.data, null, 2));
        } catch (error) {
            console.error('❌ Erreur sauvegarde données proactives:', error);
        }
    }

    // Enregistre l'activité du canal
    recordActivity(channelId, userId, messageContent) {
        const now = Date.now();
        
        // Reset compteur quotidien si nouveau jour
        const today = new Date().toISOString().split('T')[0];
        if (this.data.lastResetDate !== today) {
            this.data.dailyCount = 0;
            this.data.lastResetDate = today;
        }
        
        // Enregistre activité canal
        if (!this.data.channelActivity[channelId]) {
            this.data.channelActivity[channelId] = {
                lastMessage: 0,
                messageCount: 0,
                activeUsers: []
            };
        }
        
        const channel = this.data.channelActivity[channelId];
        channel.lastMessage = now;
        channel.messageCount++;
        
        if (!channel.activeUsers.includes(userId)) {
            channel.activeUsers.push(userId);
        }
        
        // Garde seulement les 10 derniers users actifs
        if (channel.activeUsers.length > 10) {
            channel.activeUsers.shift();
        }
        
        // Enregistre dernière activité user
        this.data.userLastSeen[userId] = now;
        
        this.saveData();
    }

    // Vérifie si le bot peut envoyer un message proactif
    canSendProactiveMessage(channelId) {
        const now = Date.now();
        
        // Reset compteur quotidien
        const today = new Date().toISOString().split('T')[0];
        if (this.data.lastResetDate !== today) {
            this.data.dailyCount = 0;
            this.data.lastResetDate = today;
        }
        
        // Vérifications de sécurité
        const checks = {
            dailyLimit: this.data.dailyCount < this.config.maxDailyMessages,
            cooldown: (now - this.data.lastProactiveMessage) > (this.config.cooldownHours * 60 * 60 * 1000),
            channelExists: !!this.data.channelActivity[channelId],
            silence: false,
            activeUsers: false
        };
        
        if (!checks.channelExists) {
            return { allowed: false, reason: 'Canal non enregistré', checks };
        }
        
        const channel = this.data.channelActivity[channelId];
        const silenceMinutes = (now - channel.lastMessage) / (60 * 1000);
        
        checks.silence = silenceMinutes >= this.config.minSilenceMinutes && 
                        silenceMinutes <= this.config.maxSilenceMinutes;
        
        // Vérifie nombre d'users actifs dans les dernières 24h
        const activeUsersLast24h = Object.entries(this.data.userLastSeen)
            .filter(([_, lastSeen]) => (now - lastSeen) < (24 * 60 * 60 * 1000))
            .length;
        
        checks.activeUsers = activeUsersLast24h >= this.config.minActiveUsers;
        
        const allowed = Object.values(checks).every(v => v === true);
        
        return {
            allowed,
            checks,
            silenceMinutes: Math.floor(silenceMinutes),
            activeUsersLast24h,
            dailyCount: this.data.dailyCount
        };
    }

    // Génère un prompt proactif basé sur le contexte
    generateProactivePrompt(channel, smartMemory, contextManager) {
        const hour = new Date().getHours();
        const activeUsers = channel.activeUsers.slice(-5); // 5 derniers users actifs
        
        // Moment de la journée
        let timeContext = '';
        if (hour >= 6 && hour < 12) {
            timeContext = 'C\'est le matin';
        } else if (hour >= 12 && hour < 18) {
            timeContext = 'C\'est l\'après-midi';
        } else if (hour >= 18 && hour < 23) {
            timeContext = 'C\'est la soirée';
        } else {
            timeContext = 'C\'est la nuit';
        }
        
        // Récupère mémoires des users actifs
        let userMemories = '';
        if (smartMemory && activeUsers.length > 0) {
            const randomUser = activeUsers[Math.floor(Math.random() * activeUsers.length)];
            const memory = smartMemory.buildMemorySummary(randomUser);
            
            if (memory && memory !== '[Aucune mémoire enregistrée]') {
                userMemories = `\n\nMémoire sur un utilisateur actif:\n${memory}`;
            }
        }
        
        // Contexte temporel
        let temporalContext = '';
        if (contextManager) {
            const temporal = contextManager.getTemporalContext();
            temporalContext = `\nContexte temporel: ${temporal}`;
        }
        
        const prompt = `${timeContext}. Le canal Discord est silencieux depuis un moment.${temporalContext}${userMemories}

Tu dois INITIER une conversation de manière naturelle et engageante:
- Pose une question intéressante basée sur ce que tu sais des utilisateurs
- OU partage une réflexion/observation pertinente
- OU mentionne un sujet qui pourrait les intéresser
- Reste naturel, pas trop enthousiaste
- IMPORTANT: Garde un ton décontracté, français familier
- IMPORTANT: Ne ping (@) personne directement, parle au canal
- Maximum 2-3 phrases

Exemples de bonnes initiations:
- "Quelqu'un a vu les nouvelles sur [sujet tech/gaming pertinent] ?"
- "Je réfléchissais à [concept intéressant], vous en pensez quoi ?"
- "Bon, personne pour parler de [sujet d'intérêt commun] ?"
- "Tiens, [observation basée sur mémoire utilisateur]"

ÉVITE:
- Les "Bonjour tout le monde !" artificiels
- Les "Comment ça va ?" génériques
- Les questions fermées oui/non
- D'être trop formel ou robotique`;

        return prompt;
    }

    // Enregistre qu'un message proactif a été envoyé
    recordProactiveMessage(channelId, message) {
        this.data.lastProactiveMessage = Date.now();
        this.data.dailyCount++;
        
        this.data.proactiveHistory.push({
            timestamp: Date.now(),
            channelId,
            message: message.substring(0, 100), // Garde seulement 100 premiers chars
            dailyCount: this.data.dailyCount
        });
        
        // Garde seulement les 50 derniers messages proactifs
        if (this.data.proactiveHistory.length > 50) {
            this.data.proactiveHistory = this.data.proactiveHistory.slice(-50);
        }
        
        this.saveData();
    }

    // Chance de réagir spontanément à un message (sans être mentionné)
    shouldReactSpontaneously(message, contextManager) {
        // Ne réagit jamais aux messages du bot lui-même
        if (message.author.bot) return false;
        
        const lowerContent = message.content.toLowerCase();
        
        // Réagit toujours aux triggers configurés
        if (contextManager && contextManager.triggers) {
            try {
                const triggers = contextManager.triggers.keywords || [];
                const hasTrigger = triggers.some(trigger => 
                    lowerContent.includes(trigger.toLowerCase())
                );
                if (hasTrigger) return true;
            } catch (error) {
                console.error('⚠️ Erreur lecture triggers:', error.message);
            }
        }
        
        // Réaction probabiliste (30% de chance)
        if (Math.random() < this.config.reactionThreshold) {
            // Seulement si message intéressant (question, opinion, etc.)
            const interestingPatterns = [
                /\?$/,                          // Se termine par ?
                /vous pensez|tu penses|avis/,   // Demande d'avis
                /intéressant|cool|génial/,      // Positif
                /merde|problème|erreur/,        // Négatif (peut aider)
            ];
            
            return interestingPatterns.some(pattern => pattern.test(lowerContent));
        }
        
        return false;
    }

    // Stats pour debug
    getStats() {
        const now = Date.now();
        const stats = {
            dailyCount: this.data.dailyCount,
            lastProactive: this.data.lastProactiveMessage ? 
                Math.floor((now - this.data.lastProactiveMessage) / (60 * 1000)) : null,
            channels: Object.keys(this.data.channelActivity).length,
            totalUsers: Object.keys(this.data.userLastSeen).length,
            historySize: this.data.proactiveHistory.length
        };
        
        return `📊 Stats proactives:
- Messages proactifs aujourd'hui: ${stats.dailyCount}/${this.config.maxDailyMessages}
- Dernier message proactif: ${stats.lastProactive ? `il y a ${stats.lastProactive}min` : 'jamais'}
- Canaux surveillés: ${stats.channels}
- Utilisateurs connus: ${stats.totalUsers}
- Historique: ${stats.historySize} messages`;
    }
}

module.exports = new ProactiveBehavior();
