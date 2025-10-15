const axios = require('axios');

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
// 🇫🇷 Mixtral 8x7B - Meilleur modèle pour le français (Mistral AI, France)
const MODEL_NAME = process.env.OLLAMA_MODEL || 'mixtral';

async function getOllamaResponse(prompt, history = [], isComplexReasoning = false) {
    try {
        console.log(`🔵 Ollama: Envoi requête au modèle ${MODEL_NAME}...`);
        const startTime = Date.now();
        
        // 🚀 CONTEXTE MASSIF - Paramètres optimisés pour gérer énormément de contexte
        // Mixtral 8x7B peut gérer jusqu'à 32K tokens de contexte (≈ 24K mots)
        const numCtx = parseInt(process.env.OLLAMA_CONTEXT_SIZE) || 32768; // 32K tokens par défaut
        const numPredict = isComplexReasoning ? 512 : 256; // Réponses plus longues et détaillées
        const temperature = isComplexReasoning ? 0.6 : 0.7; // Légèrement plus créatif
        
        // Format messages for Ollama avec timeout adaptatif (Mixtral est plus lent mais meilleur)
        // ⚠️ Avec le contexte massif, Mixtral peut prendre plus de temps
        const timeout = isComplexReasoning ? 300000 : 180000; // 3 minutes simple, 5 minutes complexe
        
        const response = await axios.post(`${OLLAMA_HOST}/api/generate`, {
            model: MODEL_NAME,
            prompt: prompt,
            stream: false,
            options: {
                // 🚀 CONTEXTE MASSIF - Paramètres pour gérer énormément de mémoire
                num_ctx: numCtx,              // 32K tokens de contexte (ÉNORME)
                temperature: temperature,
                top_p: 0.9,
                top_k: 40,
                num_predict: numPredict,
                // 🇫🇷 Paramètres optimisés pour français
                repeat_penalty: 1.1,      // Évite les répétitions (important en français)
                presence_penalty: 0.5,    // Favorise la diversité du vocabulaire
                frequency_penalty: 0.3,   // Réduit les répétitions de mots
                // 🧠 Paramètres de mémoire et performance
                num_thread: 8,            // Utilise 8 threads pour la vitesse
                num_gpu: 99,              // Utilise tous les GPUs disponibles
                stop: ['\n\n', 'User:', 'Utilisateur:', 'Assistant:', 'Bot:', 'Toi:']
            }
        }, {
            timeout: timeout
        });
        
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`✅ Ollama: Réponse reçue en ${duration}s`);
        
        let text = (response.data && response.data.response) ? response.data.response : '';
        if (typeof text !== 'string') text = String(text || '');
        text = text.replace(/^(Bot:|Toi:|Assistant:)/i, '').trim();
        // Ne garder que la première ligne utile
        if (text.includes('\n')) {
            text = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0)[0] || text.trim();
        }
        if (!text) {
            text = "Je n'ai pas compris, reformule.";
        }
        return text;
    } catch (error) {
        console.error('❌ Erreur Ollama:', error.message);
        if (error.code === 'ECONNABORTED') {
            return "Désolé, l'IA met trop de temps à répondre... 😴";
        }
        return "Désolé, je n'arrive pas à joindre l'IA...";
    }
}

module.exports = { getOllamaResponse };
