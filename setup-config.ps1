# 🔄 Script de sélection automatique de configuration
# Détecte votre matériel et applique la config optimale

Write-Host "🔍 Détection automatique de votre configuration..." -ForegroundColor Cyan
Write-Host ""

# Fonction pour détecter NVIDIA
function Test-NvidiaGPU {
    try {
        $nvidiaCheck = nvidia-smi 2>&1
        if ($LASTEXITCODE -eq 0) {
            return $true
        }
    } catch {
        return $false
    }
    return $false
}

# Fonction pour obtenir les cartes graphiques
function Get-GPUInfo {
    $gpus = Get-WmiObject Win32_VideoController | Where-Object { $_.Name -notlike "*Virtual*" -and $_.Name -notlike "*Basic*" }
    return $gpus
}

# Détection du matériel
$hasNvidia = Test-NvidiaGPU
$gpus = Get-GPUInfo

Write-Host "📊 Matériel détecté:" -ForegroundColor Yellow
Write-Host ""

foreach ($gpu in $gpus) {
    $vramGB = [math]::Round($gpu.AdapterRAM / 1GB, 2)
    Write-Host "  🎮 $($gpu.Name)" -ForegroundColor White
    if ($vramGB -gt 0) {
        Write-Host "     💾 VRAM: $vramGB GB" -ForegroundColor Gray
    }
}
Write-Host ""

# Déterminer la config optimale
$recommendedConfig = ""
$recommendedModel = ""
$reason = ""

if ($hasNvidia) {
    # Vérifier la VRAM disponible
    try {
        $vramInfo = nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits | Select-Object -First 1
        $vramMB = [int]$vramInfo
        $vramGB = [math]::Round($vramMB / 1024, 1)
        
        Write-Host "  ✅ NVIDIA CUDA détecté" -ForegroundColor Green
        Write-Host "  💾 VRAM totale: $vramGB GB" -ForegroundColor Gray
        Write-Host ""
        
        if ($vramGB -ge 12) {
            $recommendedConfig = "gpu"
            $recommendedModel = "mixtral"
            $reason = "Vous avez $vramGB GB de VRAM. Parfait pour Mixtral 8x7B !"
        } elseif ($vramGB -ge 6) {
            $recommendedConfig = "gpu"
            $recommendedModel = "mistral"
            $reason = "Vous avez $vramGB GB de VRAM. Mistral 7B sera ultra rapide !"
        } else {
            $recommendedConfig = "cpu"
            $recommendedModel = "mistral"
            $reason = "VRAM insuffisante ($vramGB GB). Utilisation du CPU avec Mistral."
        }
    } catch {
        $recommendedConfig = "gpu"
        $recommendedModel = "mixtral"
        $reason = "NVIDIA détecté, configuration GPU par défaut."
    }
} else {
    # Pas de NVIDIA, on vérifie si AMD
    $hasAMD = $false
    foreach ($gpu in $gpus) {
        if ($gpu.Name -like "*AMD*" -or $gpu.Name -like "*Radeon*") {
            $hasAMD = $true
            Write-Host "  ⚠️  GPU AMD détecté: $($gpu.Name)" -ForegroundColor Yellow
            Write-Host "  ℹ️  ROCm non supporté sur Windows" -ForegroundColor Gray
            break
        }
    }
    
    $recommendedConfig = "cpu"
    $recommendedModel = "mistral"
    
    if ($hasAMD) {
        $reason = "GPU AMD détecté mais ROCm non disponible sur Windows. Utilisation CPU avec Mistral (rapide)."
    } else {
        $reason = "Pas de GPU compatible détecté. Utilisation CPU avec Mistral."
    }
}

Write-Host ""
Write-Host "🎯 Configuration recommandée:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  📁 Config: " -NoNewline -ForegroundColor White
Write-Host "$recommendedConfig" -ForegroundColor Yellow
Write-Host "  🤖 Modèle: " -NoNewline -ForegroundColor White
Write-Host "$recommendedModel" -ForegroundColor Yellow
Write-Host ""
Write-Host "  💡 Raison: $reason" -ForegroundColor Gray
Write-Host ""

# Demander confirmation
Write-Host "Voulez-vous appliquer cette configuration ? (Y/n): " -NoNewline -ForegroundColor White
$confirmation = Read-Host

if ($confirmation -eq "" -or $confirmation -eq "y" -or $confirmation -eq "Y") {
    Write-Host ""
    Write-Host "🔧 Application de la configuration..." -ForegroundColor Cyan
    
    # Copier le fichier de config
    $sourceFile = ".\configs\ollama-$recommendedConfig.js"
    $destFile = ".\ollama.js"
    
    if (Test-Path $sourceFile) {
        Copy-Item $sourceFile $destFile -Force
        Write-Host "  ✅ Configuration copiée: ollama-$recommendedConfig.js → ollama.js" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Erreur: $sourceFile introuvable" -ForegroundColor Red
        exit 1
    }
    
    # Vérifier si le modèle est déjà téléchargé
    Write-Host ""
    Write-Host "🔍 Vérification du modèle $recommendedModel..." -ForegroundColor Cyan
    $modelCheck = ollama list 2>&1 | Select-String $recommendedModel
    
    if ($modelCheck) {
        Write-Host "  ✅ Modèle $recommendedModel déjà installé" -ForegroundColor Green
    } else {
        Write-Host "  📥 Téléchargement du modèle $recommendedModel..." -ForegroundColor Yellow
        Write-Host "     (Cela peut prendre plusieurs minutes)" -ForegroundColor Gray
        ollama pull $recommendedModel
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✅ Modèle $recommendedModel téléchargé avec succès" -ForegroundColor Green
        } else {
            Write-Host "  ❌ Erreur lors du téléchargement" -ForegroundColor Red
            exit 1
        }
    }
    
    # Définir la variable d'environnement
    Write-Host ""
    Write-Host "⚙️  Configuration de l'environnement..." -ForegroundColor Cyan
    
    # Vérifier si .env existe
    if (Test-Path ".env") {
        $envContent = Get-Content ".env"
        $newContent = @()
        $modelFound = $false
        
        foreach ($line in $envContent) {
            if ($line -like "OLLAMA_MODEL=*") {
                $newContent += "OLLAMA_MODEL=$recommendedModel"
                $modelFound = $true
            } else {
                $newContent += $line
            }
        }
        
        if (-not $modelFound) {
            $newContent += "OLLAMA_MODEL=$recommendedModel"
        }
        
        $newContent | Out-File -Encoding UTF8 ".env"
    } else {
        "OLLAMA_MODEL=$recommendedModel" | Out-File -Encoding UTF8 ".env"
    }
    
    Write-Host "  ✅ Variable OLLAMA_MODEL=$recommendedModel définie dans .env" -ForegroundColor Green
    
    # Récapitulatif
    Write-Host ""
    Write-Host "✨ Configuration terminée avec succès !" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Résumé:" -ForegroundColor Cyan
    Write-Host "  • Configuration: " -NoNewline; Write-Host "ollama-$recommendedConfig.js" -ForegroundColor Yellow
    Write-Host "  • Modèle: " -NoNewline; Write-Host "$recommendedModel" -ForegroundColor Yellow
    
    if ($recommendedConfig -eq "gpu") {
        Write-Host "  • Vitesse attendue: " -NoNewline
        if ($recommendedModel -eq "mixtral") {
            Write-Host "5-10 secondes ⚡" -ForegroundColor Green
        } else {
            Write-Host "1-3 secondes ⚡⚡" -ForegroundColor Green
        }
    } else {
        Write-Host "  • Vitesse attendue: " -NoNewline
        if ($recommendedModel -eq "mixtral") {
            Write-Host "60-90 secondes 🐌" -ForegroundColor Yellow
        } else {
            Write-Host "8-15 secondes 🐌" -ForegroundColor Yellow
        }
    }
    
    Write-Host ""
    Write-Host "🚀 Pour démarrer le bot:" -ForegroundColor Cyan
    Write-Host "   .\start-bot.ps1" -ForegroundColor White
    Write-Host ""
    
    # Option de pré-chargement
    Write-Host "💡 Voulez-vous pré-charger le modèle maintenant ? (recommandé) (Y/n): " -NoNewline -ForegroundColor White
    $preload = Read-Host
    
    if ($preload -eq "" -or $preload -eq "y" -or $preload -eq "Y") {
        Write-Host ""
        Write-Host "🔥 Pré-chargement du modèle en mémoire..." -ForegroundColor Cyan
        ollama run $recommendedModel "Bonjour, réponds juste 'ok'" | Out-Null
        Write-Host "  ✅ Modèle pré-chargé et prêt !" -ForegroundColor Green
        Write-Host ""
    }
    
} else {
    Write-Host ""
    Write-Host "❌ Configuration annulée" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "💡 Pour choisir manuellement:" -ForegroundColor Cyan
    Write-Host "   Copy-Item .\configs\ollama-gpu.js .\ollama.js -Force    # Pour GPU NVIDIA" -ForegroundColor Gray
    Write-Host "   Copy-Item .\configs\ollama-cpu.js .\ollama.js -Force    # Pour CPU/AMD" -ForegroundColor Gray
    Write-Host ""
}
