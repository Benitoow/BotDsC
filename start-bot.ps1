# Script de démarrage pour le Bot Discord avec Ollama
# Ferme d'abord tout, puis démarre les services proprement

Write-Host "🚀 Demarrage du Bot Discord avec IA LexiFun..." -ForegroundColor Green

# Fonction pour arrêter les processus existants
function Stop-ExistingProcesses {
    Write-Host "🛑 Arret des services existants..." -ForegroundColor Yellow
    
    # Arrêter Node.js
    $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
    if ($nodeProcesses) {
        Write-Host "  - Arret de Node.js..." -ForegroundColor White
        $nodeProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }
    
    # Arrêter Ollama (sauf le service principal si on veut le garder actif)
    # Note: On ne tue pas Ollama car il doit rester actif pour le bot
    
    Write-Host "✅ Services arretes" -ForegroundColor Green
}

# Arrêter les services existants
Stop-ExistingProcesses

# Ajouter Ollama au PATH pour cette session
$env:PATH += ";$env:USERPROFILE\AppData\Local\Programs\Ollama"

# Vérifier si Ollama est accessible
try {
    $ollamaVersion = & ollama --version
    Write-Host "✅ Ollama détecté: $ollamaVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur: Ollama n'est pas accessible" -ForegroundColor Red
    Write-Host "Vérifiez que Ollama est installé dans: $env:USERPROFILE.AppData\\Local\\Programs\\Ollama\\" -ForegroundColor Yellow
    exit 1
}

# Vérifier si le service Ollama est démarré
Write-Host "🔄 Vérification du service Ollama..." -ForegroundColor Blue
try {
    $response = Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -Method GET -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ Service Ollama actif" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Démarrage du service Ollama..." -ForegroundColor Yellow
    Start-Process -FilePath "ollama" -ArgumentList "serve" -WindowStyle Hidden
    Start-Sleep -Seconds 3
}

# Vérifier si le modèle est disponible
Write-Host "🔍 Vérification du modèle IA..." -ForegroundColor Blue
$models = & ollama list
if ($models -match "mixtral") {
    Write-Host "✅ Modèle Mixtral 8x7B trouvé" -ForegroundColor Green
} else {
    Write-Host "❌ Modèle Mixtral non trouvé" -ForegroundColor Red
    Write-Host "🇫🇷 Téléchargement de Mixtral 8x7B (~26GB, meilleur modèle français)..." -ForegroundColor Yellow
    Write-Host "⏳ Cela peut prendre 10-20 minutes..." -ForegroundColor Yellow
    & ollama pull mixtral
}

# Démarrer le bot Discord
Write-Host "🤖 Lancement du bot Discord..." -ForegroundColor Cyan
npm start