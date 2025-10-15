# 📝 Changelog

Tous les changements notables de ce projet seront documentés dans ce fichier.

## [1.2.0] - 2025-10-15 🚀

### ✨ Ajouté

#### 🧠 Système de Contexte Massif
- **Contexte 32K tokens** : Le bot peut maintenant traiter jusqu'à 32,768 tokens de contexte (équivalent à ~24,000 mots)
- **150 messages en mémoire** : Augmentation drastique de 12 à 150 messages gardés en mémoire active
- **Stockage sur fichiers** : Historique complet illimité stocké dans `data/conversations/`
- **Compression intelligente** : Les anciennes conversations sont automatiquement compressées en résumés
- **Base de connaissances** : Extraction automatique de faits (nom, âge, préférences, etc.)
- **Recherche sémantique** : Recherche rapide dans tout l'historique d'un utilisateur
- **Mémoire à 3 niveaux** : Court terme (RAM), moyen terme (résumés), long terme (disque)

#### 🛠️ Outils de gestion
- **Script `manage-context.ps1`** : Outil CLI pour gérer le contexte
  - `stats` : Statistiques globales
  - `user <id>` : Stats par utilisateur
  - `top` : Top 10 des utilisateurs actifs
  - `cleanup` : Nettoyage des données anciennes
  - `backup` : Sauvegarde complète
  - `export <id>` : Export d'historique

#### 📚 Documentation
- **MASSIVE-CONTEXT.md** : Documentation complète du système de contexte
- Architecture détaillée
- Guide d'utilisation
- Références et troubleshooting

### 🔧 Modifié

- **ollama.js** : Paramètres optimisés pour contextes massifs
  - `num_ctx: 32768` : Support de 32K tokens
  - `num_predict: 256-512` : Réponses plus longues et détaillées
  - `num_thread: 8` : Utilisation de 8 threads
  - `num_gpu: 99` : Tous les GPUs disponibles
  
- **index.js** : Intégration du contexte massif
  - Augmentation de `AI_MEMORY_LENGTH` à 150
  - Appels au système `massive-context`
  - Extraction automatique de connaissances

- **.env.example** : Nouvelles variables
  - `OLLAMA_CONTEXT_SIZE=32768`
  - `AI_MEMORY_LENGTH=150`

- **package.json** : Version 1.2.0
  - Nouveaux scripts npm pour gestion du contexte

### 🎯 Performances

| Métrique | Avant (v1.0) | Maintenant (v1.2) | Amélioration |
|----------|--------------|-------------------|--------------|
| Messages en RAM | 12 | 150 | **+1150%** |
| Contexte tokens | 4K | 32K | **+700%** |
| Historique | ~24 messages | Illimité | **∞** |
| Mémoire par user | ~5 KB | ~100 KB | Optimisé sur disque |

### 📊 Comparaison avec ChatGPT

| Fonctionnalité | BotDsC v1.2 | ChatGPT-4 | ChatGPT-3.5 |
|----------------|-------------|-----------|-------------|
| Contexte tokens | 32K | 128K | 16K |
| Mémoire persistante | ✅ Illimitée | ✅ Limitée | ❌ |
| Recherche historique | ✅ | ❌ | ❌ |
| Base de connaissances | ✅ | ❌ | ❌ |
| Compression auto | ✅ | ✅ | ✅ |

---

## [1.0.0] - 2025-10-14

### ✨ Ajouté (Release initiale)

- 🤖 Bot Discord avec IA locale (Ollama)
- 🧠 Moteur de raisonnement avancé
- 💾 Mémoire intelligente smart-memory.js
- 🎭 Comportement proactif
- 📊 Système de profils utilisateurs
- 🎯 Détection d'intentions
- 🌡️ Analyse émotionnelle
- ⚡ Configuration GPU/CPU automatique
- 🇫🇷 Optimisé pour le français
- 📝 Scripts PowerShell de gestion

### 🔧 Configuration

- Support Mixtral 8x7B et Mistral 7B
- Mémoire contextuelle de 12 messages
- Personnalité libérale et décomplexée
- Multi-serveurs et DM

---

## Format

Ce changelog suit le format [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Semantic Versioning](https://semver.org/lang/fr/).

### Types de changements

- **Ajouté** : pour les nouvelles fonctionnalités
- **Modifié** : pour les changements aux fonctionnalités existantes
- **Déprécié** : pour les fonctionnalités bientôt supprimées
- **Supprimé** : pour les fonctionnalités supprimées
- **Corrigé** : pour les corrections de bugs
- **Sécurité** : en cas de vulnérabilités
