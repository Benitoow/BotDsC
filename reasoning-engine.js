/**
 * 🧠 MOTEUR DE RAISONNEMENT AVANCÉ
 * Analyse, infère et raisonne avant de générer une réponse
 */

const fs = require('fs');
const path = require('path');

const REASONING_CACHE_FILE = path.join(__dirname, 'data', 'reasoning-cache.json');

// Cache des raisonnements pour apprentissage
let reasoningCache = {
    patterns: [],           // Patterns de raisonnement réussis
    inferences: [],         // Inférences faites
    logicalChains: [],      // Chaînes de raisonnement
    conceptMap: {}          // Carte conceptuelle (relations entre concepts)
};

// Charger le cache
function loadReasoningCache() {
    try {
        if (fs.existsSync(REASONING_CACHE_FILE)) {
            reasoningCache = JSON.parse(fs.readFileSync(REASONING_CACHE_FILE, 'utf8'));
            console.log('🧠 Cache de raisonnement chargé');
        }
    } catch (error) {
        console.error('❌ Erreur chargement cache raisonnement:', error.message);
    }
}

// Sauvegarder le cache
function saveReasoningCache() {
    try {
        fs.writeFileSync(REASONING_CACHE_FILE, JSON.stringify(reasoningCache, null, 2));
    } catch (error) {
        console.error('❌ Erreur sauvegarde cache raisonnement:', error.message);
    }
}

/**
 * 🎯 DÉTECTION D'INTENTION
 * Comprend ce que l'utilisateur veut vraiment
 */
function detectIntent(message) {
    const lowerMsg = message.toLowerCase();
    const intent = {
        type: 'unknown',
        subtype: null,
        confidence: 0,
        keywords: [],
        requiresReasoning: false,
        complexity: 'simple'
    };

    // Questions explicites
    if (message.includes('?')) {
        intent.type = 'question';
        
        // Questions complexes nécessitant raisonnement
        if (lowerMsg.match(/pourquoi|comment (faire|ça marche|fonctionne)|explique|quelle différence|qu'est-ce que/)) {
            intent.subtype = 'explanation';
            intent.requiresReasoning = true;
            intent.complexity = 'complex';
            intent.confidence = 0.9;
        }
        // Questions d'opinion/conseil
        else if (lowerMsg.match(/tu penses|avis|conseil|recommand|suggère|meilleur|préférable/)) {
            intent.subtype = 'advice';
            intent.requiresReasoning = true;
            intent.complexity = 'medium';
            intent.confidence = 0.85;
        }
        // ⚠️ CHOIX SIMPLE A ou B - DOIT ÊTRE TESTÉ AVANT "comparison" !
        // Ex: "homme ou femme ?", "oui ou non dcp ?", "A ou B donc ?"
        else if (lowerMsg.match(/^[\w\s]{1,20}\s+ou\s+[\w\s]{1,20}(\s*(dcp|donc|alors|,|\?)\s*)?$/)) {
            intent.subtype = 'choice';
            intent.requiresReasoning = false;
            intent.complexity = 'simple';
            intent.confidence = 0.9;
        }
        // Questions de comparaison (vraies comparaisons complexes)
        else if (lowerMsg.match(/différence entre|comparer|versus|vs|plutôt|mieux que/)) {
            intent.subtype = 'comparison';
            intent.requiresReasoning = true;
            intent.complexity = 'medium';
            intent.confidence = 0.8;
        }
        // Questions causales
        else if (lowerMsg.match(/cause|raison|pourquoi|comment se fait|d'où vient/)) {
            intent.subtype = 'causal';
            intent.requiresReasoning = true;
            intent.complexity = 'complex';
            intent.confidence = 0.9;
        }
        // Questions simples (fait, oui/non)
        else {
            intent.subtype = 'factual';
            intent.complexity = 'simple';
            intent.confidence = 0.7;
        }
    }
    // Demandes d'action
    else if (lowerMsg.match(/^(peux-tu|pourrais-tu|fais|fait|aide|aide-moi|explique|raconte|donne|trouve|cherche)/)) {
        intent.type = 'request';
        intent.subtype = 'action';
        intent.requiresReasoning = lowerMsg.match(/explique|analyse|compare|trouve/) !== null;
        intent.complexity = intent.requiresReasoning ? 'medium' : 'simple';
        intent.confidence = 0.8;
    }
    // Affirmations avec implication (besoin de valider/inférer)
    else if (lowerMsg.match(/je pense que|selon moi|à mon avis|il me semble|peut-être|probablement/)) {
        intent.type = 'statement';
        intent.subtype = 'opinion';
        intent.requiresReasoning = true;
        intent.complexity = 'medium';
        intent.confidence = 0.75;
    }
    // Problèmes/plaintes
    else if (lowerMsg.match(/problème|bug|marche pas|fonctionne pas|erreur|aide|bloqué|comprends pas/)) {
        intent.type = 'problem';
        intent.subtype = 'troubleshooting';
        intent.requiresReasoning = true;
        intent.complexity = 'complex';
        intent.confidence = 0.85;
    }
    // Déclarations simples
    else {
        intent.type = 'statement';
        intent.subtype = 'simple';
        intent.complexity = 'simple';
        intent.confidence = 0.6;
    }

    // Extraire les mots-clés importants
    const keywords = message.match(/\b[a-zàâäéèêëïîôùûüÿœæç]{4,}\b/gi) || [];
    intent.keywords = [...new Set(keywords.slice(0, 5))]; // 5 mots-clés uniques max

    return intent;
}

/**
 * 🔗 INFÉRENCE ET DÉDUCTION
 * Fait des déductions logiques basées sur le contexte
 */
function makeInferences(message, userProfile, smartMemory) {
    const inferences = {
        implicit_needs: [],      // Besoins implicites détectés
        assumptions: [],         // Hypothèses sur le contexte
        related_topics: [],      // Sujets connexes pertinents
        user_state: null,        // État probable de l'utilisateur
        next_likely_topic: null, // Sujet probable suivant
        contradictions: []       // 🆕 Contradictions détectées avec la mémoire
    };

    const lowerMsg = message.toLowerCase();

    // 🆕 VÉRIFIER LES CONTRADICTIONS avec la mémoire existante
    if (smartMemory && smartMemory.identity && smartMemory.identity.facts) {
        for (const fact of smartMemory.identity.facts) {
            const lowerFact = fact.toLowerCase();
            
            // Vérifier les contradictions de genre
            if (lowerFact.includes('je suis un mec') || lowerFact.includes('je suis un homme') || lowerFact.includes('homme')) {
                // Détection étendue des mentions féminines
                if (lowerMsg.match(/une fille|une femme|prénom de fille|prénom féminin|prénom de femme|féminin/)) {
                    inferences.contradictions.push({
                        type: 'gender',
                        memorized: fact,
                        current: message,
                        warning: 'ATTENTION: La mémoire indique que cet utilisateur est un homme. Ne PAS le traiter comme une femme.'
                    });
                }
            }
            // Vérifier aussi l'inverse (si mémorisé comme femme)
            else if (lowerFact.includes('je suis une fille') || lowerFact.includes('je suis une femme') || lowerFact.includes('femme')) {
                if (lowerMsg.match(/un mec|un homme|masculin|prénom masculin/)) {
                    inferences.contradictions.push({
                        type: 'gender',
                        memorized: fact,
                        current: message,
                        warning: 'ATTENTION: La mémoire indique que cet utilisateur est une femme. Ne PAS le traiter comme un homme.'
                    });
                }
            }
            
            // Vérifier les contradictions d'identité
            if (lowerFact.match(/je m'appelle|mon prénom|je suis [A-Z]/)) {
                // Extraire le prénom mémorisé si possible
                const nameMatch = lowerFact.match(/je m'appelle (\w+)|mon prénom (?:est|c'est) (\w+)/i);
                if (nameMatch) {
                    const memorizedName = nameMatch[1] || nameMatch[2];
                    inferences.assumptions.push(`User's name is ${memorizedName} (from memory)`);
                }
            }
        }
    }

    // Inférer les besoins implicites
    if (lowerMsg.match(/comment|aide|explique/)) {
        inferences.implicit_needs.push('need_explanation');
    }
    if (lowerMsg.match(/problème|marche pas|erreur/)) {
        inferences.implicit_needs.push('need_solution');
        inferences.implicit_needs.push('need_support');
    }
    if (lowerMsg.match(/tu penses|avis|conseil/)) {
        inferences.implicit_needs.push('need_opinion');
        inferences.implicit_needs.push('need_validation');
    }

    // Inférer l'état de l'utilisateur basé sur le langage
    if (lowerMsg.match(/putain|bordel|chiant|nul/)) {
        inferences.user_state = 'frustrated';
        inferences.assumptions.push('User is experiencing frustration, may need calmer approach');
    } else if (lowerMsg.match(/génial|super|cool|merci|top/)) {
        inferences.user_state = 'positive';
        inferences.assumptions.push('User is satisfied, can be more casual');
    } else if (lowerMsg.match(/triste|dur|difficile|mal/)) {
        inferences.user_state = 'negative';
        inferences.assumptions.push('User may need emotional support');
    } else if (lowerMsg.match(/\?{2,}|!!!|aide/)) {
        inferences.user_state = 'confused_or_urgent';
        inferences.assumptions.push('User needs clear, direct answer');
    } else {
        inferences.user_state = 'neutral';
    }

    // Relier aux sujets du profil utilisateur
    if (smartMemory && smartMemory.knowledge && smartMemory.knowledge.interests) {
        const msgWords = lowerMsg.split(/\s+/);
        for (const interest of smartMemory.knowledge.interests) {
            if (msgWords.some(word => interest.toLowerCase().includes(word))) {
                inferences.related_topics.push(interest);
            }
        }
    }

    // Détecter les topics connexes par association conceptuelle
    const conceptAssociations = {
        'code': ['programmation', 'bug', 'développement', 'tech'],
        'jeu': ['gaming', 'console', 'pc', 'fps'],
        'musique': ['écouter', 'concert', 'album', 'artiste'],
        'film': ['série', 'netflix', 'cinéma', 'regarder'],
        'problème': ['solution', 'aide', 'résoudre', 'fix']
    };

    for (const [concept, related] of Object.entries(conceptAssociations)) {
        if (lowerMsg.includes(concept)) {
            inferences.related_topics.push(...related.filter(r => !inferences.related_topics.includes(r)));
        }
    }

    return inferences;
}

/**
 * 🧩 DÉCOMPOSITION DE PROBLÈME
 * Décompose les questions complexes en sous-questions
 */
function decomposeQuestion(message, intent) {
    if (!intent.requiresReasoning) {
        return { subQuestions: [], needsDecomposition: false };
    }

    const decomposition = {
        mainQuestion: message,
        subQuestions: [],
        reasoningSteps: [],
        needsDecomposition: true
    };

    const lowerMsg = message.toLowerCase();

    // Questions "comment"
    if (lowerMsg.includes('comment')) {
        decomposition.subQuestions.push('Quel est le contexte ?');
        decomposition.subQuestions.push('Quelles sont les étapes ?');
        decomposition.subQuestions.push('Quels sont les prérequis ?');
        decomposition.reasoningSteps.push('1. Identifier le contexte');
        decomposition.reasoningSteps.push('2. Lister les étapes séquentiellement');
        decomposition.reasoningSteps.push('3. Mentionner les points d\'attention');
    }
    // Questions "pourquoi"
    else if (lowerMsg.includes('pourquoi')) {
        decomposition.subQuestions.push('Quelle est la cause ?');
        decomposition.subQuestions.push('Quelles sont les conséquences ?');
        decomposition.subQuestions.push('Y a-t-il des alternatives ?');
        decomposition.reasoningSteps.push('1. Identifier la cause principale');
        decomposition.reasoningSteps.push('2. Expliquer le mécanisme causal');
        decomposition.reasoningSteps.push('3. Contextualiser avec exemples');
    }
    // Comparaisons
    else if (lowerMsg.match(/ou|versus|vs|mieux|plutôt|différence entre/)) {
        decomposition.subQuestions.push('Quels sont les critères de comparaison ?');
        decomposition.subQuestions.push('Avantages de chaque option ?');
        decomposition.subQuestions.push('Inconvénients de chaque option ?');
        decomposition.reasoningSteps.push('1. Lister les options');
        decomposition.reasoningSteps.push('2. Comparer sur critères clés');
        decomposition.reasoningSteps.push('3. Donner une recommandation basée sur le contexte');
    }
    // Demandes de conseil
    else if (lowerMsg.match(/conseil|recommand|suggère|avis/)) {
        decomposition.subQuestions.push('Quel est le contexte/objectif ?');
        decomposition.subQuestions.push('Quelles sont les contraintes ?');
        decomposition.subQuestions.push('Quelle est la meilleure approche ?');
        decomposition.reasoningSteps.push('1. Comprendre l\'objectif');
        decomposition.reasoningSteps.push('2. Évaluer les options');
        decomposition.reasoningSteps.push('3. Recommander avec justification');
    }
    // Problèmes/troubleshooting
    else if (lowerMsg.match(/problème|bug|marche pas|erreur/)) {
        decomposition.subQuestions.push('Quel est le symptôme exact ?');
        decomposition.subQuestions.push('Quelles sont les causes possibles ?');
        decomposition.subQuestions.push('Quelles sont les solutions ?');
        decomposition.reasoningSteps.push('1. Diagnostiquer le problème');
        decomposition.reasoningSteps.push('2. Identifier les causes probables');
        decomposition.reasoningSteps.push('3. Proposer solutions ordonnées par probabilité');
    }

    return decomposition;
}

/**
 * 🎓 GÉNÉRATION DE CONTEXTE DE RAISONNEMENT
 * Crée un prompt enrichi pour guider l'IA vers un raisonnement structuré
 */
function buildReasoningContext(message, intent, inferences, decomposition, userProfile) {
    let reasoningPrompt = '\n\n🧠 CONTEXTE DE RAISONNEMENT:\n';

    // 🆕 AVERTISSEMENT CRITIQUE SI CONTRADICTIONS DÉTECTÉES
    if (inferences.contradictions && inferences.contradictions.length > 0) {
        reasoningPrompt += `\n⛔ CONTRADICTIONS DÉTECTÉES - LECTURE OBLIGATOIRE:\n`;
        for (const contradiction of inferences.contradictions) {
            reasoningPrompt += `   ⚠️ ${contradiction.warning}\n`;
            reasoningPrompt += `   📝 Mémoire: "${contradiction.memorized}"\n`;
            reasoningPrompt += `   ❌ Ne PAS assumer le contraire de ce fait mémorisé.\n`;
        }
        reasoningPrompt += `\n`;
    }

    // 🆕 GESTION SPÉCIALE POUR LES CHOIX SIMPLES
    if (intent.subtype === 'choice') {
        reasoningPrompt += `📋 Type de question: CHOIX SIMPLE\n`;
        reasoningPrompt += `💡 INSTRUCTIONS STRICTES:\n`;
        reasoningPrompt += `   - Regarde l'HISTORIQUE de conversation et la MÉMOIRE utilisateur\n`;
        reasoningPrompt += `   - Si l'info est dans la mémoire ou l'historique, réponds DIRECTEMENT avec le fait\n`;
        reasoningPrompt += `   - NE DIS JAMAIS "je ne sais pas" si tu peux déduire du contexte\n`;
        reasoningPrompt += `   - Format: Une phrase courte et directe\n`;
        reasoningPrompt += `   - Exemple: "T'es un mec" ou "Tu as 25 ans" (pas de "je pense que..." ou "il est possible")\n\n`;
        return reasoningPrompt;
    }

    // 1. Intention détectée
    reasoningPrompt += `- Type: ${intent.type}`;
    if (intent.subtype) {
        reasoningPrompt += ` (${intent.subtype})`;
    }
    reasoningPrompt += `\n- Complexité: ${intent.complexity}\n`;

    // 2. Besoins implicites
    if (inferences.implicit_needs.length > 0) {
        reasoningPrompt += `- Besoins détectés: ${inferences.implicit_needs.join(', ')}\n`;
    }

    // 3. État de l'utilisateur
    if (inferences.user_state && inferences.user_state !== 'neutral') {
        reasoningPrompt += `- État utilisateur: ${inferences.user_state}\n`;
    }
    
    // 🆕 3.5. Instructions spéciales pour questions factuelles simples
    if (intent.subtype === 'factual' && intent.complexity === 'simple') {
        reasoningPrompt += `\n💡 RÉPONSE FACTUELLE ATTENDUE:\n`;
        reasoningPrompt += `   - Consulte la mémoire utilisateur et l'historique\n`;
        reasoningPrompt += `   - Si l'info existe, réponds avec CERTITUDE (pas "peut-être", "possible")\n`;
        reasoningPrompt += `   - Si l'info n'existe PAS, demande ou déduis du contexte\n`;
        reasoningPrompt += `   - Sois direct et affirmatif\n\n`;
    }

    // 4. Décomposition si nécessaire
    if (decomposition.needsDecomposition && decomposition.reasoningSteps.length > 0) {
        reasoningPrompt += `\n📋 ÉTAPES DE RAISONNEMENT À SUIVRE:\n`;
        for (const step of decomposition.reasoningSteps) {
            reasoningPrompt += `   ${step}\n`;
        }
    }

    // 5. Sujets connexes
    if (inferences.related_topics.length > 0) {
        reasoningPrompt += `\n🔗 Concepts liés: ${inferences.related_topics.slice(0, 5).join(', ')}\n`;
    }

    // 6. Directives de réponse basées sur l'analyse
    reasoningPrompt += `\n💡 DIRECTIVES DE RÉPONSE:\n`;
    
    if (intent.complexity === 'complex') {
        reasoningPrompt += `   - Structurer la réponse en étapes claires\n`;
        reasoningPrompt += `   - Expliquer le raisonnement sous-jacent\n`;
    }
    
    if (inferences.user_state === 'frustrated') {
        reasoningPrompt += `   - Rester calme et constructif\n`;
        reasoningPrompt += `   - Proposer des solutions concrètes\n`;
    } else if (inferences.user_state === 'confused_or_urgent') {
        reasoningPrompt += `   - Être direct et clair\n`;
        reasoningPrompt += `   - Éviter les détails superflus\n`;
    } else if (inferences.user_state === 'positive') {
        reasoningPrompt += `   - Maintenir le ton positif\n`;
        reasoningPrompt += `   - Peut être plus décontracté\n`;
    }

    if (intent.subtype === 'comparison') {
        reasoningPrompt += `   - Présenter les options de manière équilibrée\n`;
        reasoningPrompt += `   - Donner une recommandation finale\n`;
    }

    if (intent.type === 'problem') {
        reasoningPrompt += `   - Proposer des solutions concrètes et testables\n`;
        reasoningPrompt += `   - Prioriser par probabilité de succès\n`;
    }

    reasoningPrompt += `\n⚠️ IMPORTANT: Raisonne avant de répondre. Ta réponse doit montrer que tu as analysé la question en profondeur.\n`;

    return reasoningPrompt;
}

/**
 * 🚀 FONCTION PRINCIPALE: Analyser et enrichir le message
 */
function analyzeAndReason(message, userProfile = null, smartMemory = null) {
    console.log(`\n🧠 === DÉBUT ANALYSE RAISONNEMENT ===`);
    console.log(`📝 Message: "${message.substring(0, 80)}..."`);

    // 1. Détecter l'intention
    const intent = detectIntent(message);
    console.log(`🎯 Intention: ${intent.type} (${intent.subtype || 'none'}) - Complexité: ${intent.complexity}`);

    // 2. Faire des inférences
    const inferences = makeInferences(message, userProfile, smartMemory);
    console.log(`🔍 Inférences: État=${inferences.user_state}, Besoins=${inferences.implicit_needs.length}`);
    
    // 🆕 Logger les contradictions si détectées
    if (inferences.contradictions && inferences.contradictions.length > 0) {
        console.log(`⛔ CONTRADICTIONS DÉTECTÉES: ${inferences.contradictions.length}`);
        for (const contradiction of inferences.contradictions) {
            console.log(`   ⚠️ ${contradiction.type}: ${contradiction.warning}`);
        }
    }

    // 3. Décomposer si nécessaire
    const decomposition = decomposeQuestion(message, intent);
    if (decomposition.needsDecomposition) {
        console.log(`🧩 Décomposition: ${decomposition.subQuestions.length} sous-questions`);
    }

    // 4. Construire le contexte de raisonnement
    const reasoningContext = buildReasoningContext(message, intent, inferences, decomposition, userProfile);

    // 5. Sauvegarder le pattern de raisonnement pour apprentissage
    if (intent.requiresReasoning) {
        reasoningCache.patterns.push({
            timestamp: new Date().toISOString(),
            message: message.substring(0, 100),
            intent: intent.type + '/' + intent.subtype,
            complexity: intent.complexity,
            user_state: inferences.user_state
        });

        // Garder seulement les 100 derniers patterns
        if (reasoningCache.patterns.length > 100) {
            reasoningCache.patterns = reasoningCache.patterns.slice(-100);
        }

        saveReasoningCache();
    }

    console.log(`✅ Contexte de raisonnement généré (${reasoningContext.length} caractères)`);
    console.log(`🧠 === FIN ANALYSE RAISONNEMENT ===\n`);

    return {
        intent,
        inferences,
        decomposition,
        reasoningContext,
        shouldUseAdvancedReasoning: intent.requiresReasoning || intent.complexity !== 'simple'
    };
}

/**
 * 📊 STATISTIQUES DE RAISONNEMENT
 */
function getReasoningStats() {
    const stats = {
        totalPatterns: reasoningCache.patterns.length,
        complexityDistribution: {},
        intentDistribution: {},
        recentPatterns: reasoningCache.patterns.slice(-10)
    };

    for (const pattern of reasoningCache.patterns) {
        // Distribution par complexité
        stats.complexityDistribution[pattern.complexity] = 
            (stats.complexityDistribution[pattern.complexity] || 0) + 1;
        
        // Distribution par intention
        stats.intentDistribution[pattern.intent] = 
            (stats.intentDistribution[pattern.intent] || 0) + 1;
    }

    return stats;
}

// Initialisation
loadReasoningCache();

module.exports = {
    analyzeAndReason,
    detectIntent,
    makeInferences,
    decomposeQuestion,
    buildReasoningContext,
    getReasoningStats
};
