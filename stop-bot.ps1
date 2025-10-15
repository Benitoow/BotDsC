# Script de vérification et d'arrêt complet pour le Bot Discord avec Ollama
# Ce script vérifie l'état des services et les arrête proprement

Write-Host "🔍 Vérification et arrêt des services Bot Discord + Ollama..." -ForegroundColor Yellow

# Fonction pour tuer un processus par nom
function Stop-ProcessByName {
    param([string]$ProcessName)
    
    $processes = Get-Process -Name $ProcessName -ErrorAction SilentlyContinue
    if ($processes) {
        Write-Host "⚠️ Arrêt des processus $ProcessName..." -ForegroundColor Yellow
        foreach ($process in $processes) {
            try {
                $process.Kill()
                Write-Host "✅ Processus $ProcessName (PID: $($process.Id)) arrêté" -ForegroundColor Green
            } catch {
                Write-Host "❌ Impossible d'arrêter le processus $ProcessName (PID: $($process.Id))" -ForegroundColor Red
            }
        }
        Start-Sleep -Seconds 2
    } else {
        Write-Host "✅ Aucun processus $ProcessName en cours" -ForegroundColor Green
    }
}

# Fonction pour vérifier si un port est utilisé
function Test-Port {
    param([int]$Port)
    
    try {
        $connection = Test-NetConnection -ComputerName "localhost" -Port $Port -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
        return $connection.TcpTestSucceeded
    } catch {
        return $false
    }
}

Write-Host "`n📋 État actuel des services:" -ForegroundColor Cyan

# 1. Vérifier les processus Node.js (Bot Discord)
Write-Host "`n🤖 Vérification du Bot Discord (Node.js):" -ForegroundColor Blue
$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "⚠️ Processus Node.js détectés:" -ForegroundColor Yellow
    foreach ($proc in $nodeProcesses) {
        $commandLine = (Get-WmiObject Win32_Process -Filter "ProcessId = $($proc.Id)").CommandLine
        Write-Host "  - PID: $($proc.Id) | Commande: $commandLine" -ForegroundColor White
    }
} else {
    Write-Host "✅ Aucun processus Node.js en cours" -ForegroundColor Green
}

# 2. Vérifier Ollama
Write-Host "`n🦙 Vérification d'Ollama:" -ForegroundColor Blue
$ollamaProcesses = Get-Process -Name "ollama" -ErrorAction SilentlyContinue
if ($ollamaProcesses) {
    Write-Host "⚠️ Processus Ollama détectés:" -ForegroundColor Yellow
    foreach ($proc in $ollamaProcesses) {
        Write-Host "  - PID: $($proc.Id) | Mémoire: $([math]::Round($proc.WorkingSet64/1MB, 2)) MB" -ForegroundColor White
    }
} else {
    Write-Host "✅ Aucun processus Ollama en cours" -ForegroundColor Green
}

# 3. Vérifier le port 11434 (Ollama API)
Write-Host "`n🔌 Vérification du port 11434 (Ollama API):" -ForegroundColor Blue
if (Test-Port -Port 11434) {
    Write-Host "⚠️ Port 11434 utilisé" -ForegroundColor Yellow
} else {
    Write-Host "✅ Port 11434 libre" -ForegroundColor Green
}

# 4. Vérifier la connectivité Ollama
Write-Host "`n🌐 Test de connectivité Ollama:" -ForegroundColor Blue
try {
    $response = Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -Method GET -TimeoutSec 3 -ErrorAction Stop
    Write-Host "⚠️ API Ollama accessible et active" -ForegroundColor Yellow
} catch {
    Write-Host "✅ API Ollama non accessible (service arrêté)" -ForegroundColor Green
}

Write-Host "`n" -ForegroundColor White
$response = Read-Host "Voulez-vous arrêter tous les services ? (y/N)"

if ($response -eq "y" -or $response -eq "Y" -or $response -eq "yes" -or $response -eq "oui") {
    Write-Host "`n🛑 Arrêt des services..." -ForegroundColor Red
    
    # Arrêter Node.js (Bot Discord)
    Write-Host "`n🤖 Arrêt du Bot Discord:" -ForegroundColor Blue
    Stop-ProcessByName -ProcessName "node"
    
    # Arrêter Ollama
    Write-Host "`n🦙 Arrêt d'Ollama:" -ForegroundColor Blue
    Stop-ProcessByName -ProcessName "ollama"
    
    # Vérification finale
    Write-Host "`n✅ Vérification finale..." -ForegroundColor Cyan
    Start-Sleep -Seconds 3
    
    $nodeStillRunning = Get-Process -Name "node" -ErrorAction SilentlyContinue
    $ollamaStillRunning = Get-Process -Name "ollama" -ErrorAction SilentlyContinue
    $portStillUsed = Test-Port -Port 11434
    
    if (-not $nodeStillRunning -and -not $ollamaStillRunning -and -not $portStillUsed) {
        Write-Host "🎉 Tous les services ont été arrêtés avec succès !" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Certains services peuvent encore être actifs..." -ForegroundColor Yellow
        if ($nodeStillRunning) { Write-Host "  - Node.js encore actif" -ForegroundColor Red }
        if ($ollamaStillRunning) { Write-Host "  - Ollama encore actif" -ForegroundColor Red }
        if ($portStillUsed) { Write-Host "  - Port 11434 encore utilisé" -ForegroundColor Red }
    }
    
} else {
    Write-Host "`n✅ Aucune action effectuée. Services laissés en l'état." -ForegroundColor Green
}

Write-Host "`n📋 Résumé final:" -ForegroundColor Cyan
Write-Host "  - Pour démarrer: .\start-bot.ps1" -ForegroundColor White
Write-Host "  - Pour vérifier/arrêter: .\stop-bot.ps1" -ForegroundColor White
Write-Host "  - Pour surveiller: Get-Process node,ollama" -ForegroundColor White

Write-Host "`n✨ Script terminé." -ForegroundColor Green