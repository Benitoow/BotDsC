const axios = require('axios');

// 🚀 Configuration pour GPU NVIDIA (RTX 4080 Super, etc.)
// Optimisé pour: NVIDIA GPU avec CUDA

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const MODEL_NAME = process.env.OLLAMA_MODEL || 'mixtral'; // Mixtral 8x7B sur GPU

async function getOllamaResponse(prompt, history = [], isComplexReasoning = false) {
    try {
        console.log(`🔵 Ollama: Envoi requête au modèle ${MODEL_NAME} [MODE: GPU NVIDIA]...`);
        const startTime = Date.now();
        
        // ⚡ Paramètres pour GPU - On peut être plus généreux en tokens
        const numPredict = isComplexReasoning ? 300 : 150; // 50% plus de tokens qu'en CPU
        const temperature = isComplexReasoning ? 0.6 : 0.7;
        
        // ⏱️ Timeouts courts car GPU est RAPIDE (5-10s)
        const timeout = isComplexReasoning ? 60000 : 30000; // 30s simple, 60s complexe
        
        const response = await axios.post(`${OLLAMA_HOST}/api/generate`, {
            model: MODEL_NAME,
            prompt: prompt,
            stream: false,
            options: {
                temperature: temperature,
                top_p: 0.9,
                top_k: 40,
                num_predict: numPredict,
                // Paramètres optimisés pour français
                repeat_penalty: 1.1,
                presence_penalty: 0.5,
                frequency_penalty: 0.3,
                stop: ['\n\n', 'User:', 'Utilisateur:', 'Assistant:', 'Bot:', 'Toi:'],
                // GPU - Utilisation maximale
                num_gpu: -1, // Utiliser tout le GPU disponible
                num_thread: 4 // Moins de threads CPU nécessaires
            }
        }, {
            timeout: timeout
        });
        
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`✅ Ollama: Réponse reçue en ${duration}s [GPU] 🚀`);
        
        let text = (response.data && response.data.response) ? response.data.response : '';
        if (typeof text !== 'string') text = String(text || '');
        text = text.replace(/^(Bot:|Toi:|Assistant:)/i, '').trim();
        
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
            return "Désolé, l'IA met trop de temps à répondre (timeout GPU)... 😴";
        }
        return "Désolé, je n'arrive pas à joindre l'IA...";
    }
}

module.exports = { getOllamaResponse };
