const axios = require('axios');

// ⚙️ Configuration pour CPU (AMD RX 6950 XT sans ROCm)
// Optimisé pour: AMD CPU + RAM

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const MODEL_NAME = process.env.OLLAMA_MODEL || 'mixtral'; // Mixtral 8x7B sur CPU

async function getOllamaResponse(prompt, history = [], isComplexReasoning = false) {
    try {
        console.log(`🔵 Ollama: Envoi requête au modèle ${MODEL_NAME} [MODE: CPU]...`);
        const startTime = Date.now();
        
        // 🐌 Paramètres pour CPU - Timeouts généreux car CPU est lent
        const numPredict = isComplexReasoning ? 200 : 100;
        const temperature = isComplexReasoning ? 0.6 : 0.7;
        
        // ⏱️ Timeouts TRÈS généreux pour CPU (Mixtral sur CPU = 60-90s)
        const timeout = isComplexReasoning ? 300000 : 180000; // 3min simple, 5min complexe
        
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
                // CPU uniquement
                num_gpu: 0,
                num_thread: 0 // Auto-detect threads
            }
        }, {
            timeout: timeout
        });
        
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`✅ Ollama: Réponse reçue en ${duration}s [CPU]`);
        
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
            return "Désolé, l'IA met trop de temps à répondre... 😴";
        }
        return "Désolé, je n'arrive pas à joindre l'IA...";
    }
}

module.exports = { getOllamaResponse };
