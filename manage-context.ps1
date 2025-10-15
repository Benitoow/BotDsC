# Script de gestion du contexte massif
# Usage: .\manage-context.ps1 [command] [args]

param(
    [Parameter(Position=0)]
    [string]$Command = "stats",
    
    [Parameter(Position=1)]
    [string]$UserId = ""
)

$DataDir = ".\data"
$ConversationsDir = "$DataDir\conversations"

function Show-Help {
    Write-Host "🚀 Gestionnaire de Contexte Massif - BotDsC v1.2" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "USAGE:" -ForegroundColor Yellow
    Write-Host "  .\manage-context.ps1 [command] [args]"
    Write-Host ""
    Write-Host "COMMANDES:" -ForegroundColor Yellow
    Write-Host "  stats              - Afficher les statistiques globales"
    Write-Host "  user <userId>      - Afficher les stats d'un utilisateur"
    Write-Host "  top                - Top 10 des utilisateurs les plus actifs"
    Write-Host "  cleanup            - Nettoyer les anciennes conversations"
    Write-Host "  backup             - Sauvegarder toutes les données"
    Write-Host "  export <userId>    - Exporter l'historique d'un utilisateur"
    Write-Host "  help               - Afficher cette aide"
    Write-Host ""
}

function Get-GlobalStats {
    Write-Host "`n📊 STATISTIQUES GLOBALES" -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    
    # Compter les fichiers de conversations
    $conversationFiles = Get-ChildItem -Path $ConversationsDir -Filter "*.json" -ErrorAction SilentlyContinue
    $totalUsers = $conversationFiles.Count
    
    Write-Host "👥 Utilisateurs enregistrés  : $totalUsers" -ForegroundColor Green
    
    # Calculer la taille totale
    if ($totalUsers -gt 0) {
        $totalSize = ($conversationFiles | Measure-Object -Property Length -Sum).Sum
        $totalSizeMB = [math]::Round($totalSize / 1MB, 2)
        Write-Host "💾 Espace utilisé           : $totalSizeMB MB" -ForegroundColor Green
        
        # Compter les messages totaux
        $totalMessages = 0
        $totalSummaries = 0
        
        foreach ($file in $conversationFiles) {
            $data = Get-Content $file.FullName | ConvertFrom-Json
            $totalMessages += $data.totalMessages
            if ($data.summaries) {
                $totalSummaries += $data.summaries.Count
            }
        }
        
        Write-Host "💬 Messages totaux          : $totalMessages" -ForegroundColor Green
        Write-Host "📜 Périodes archivées       : $totalSummaries" -ForegroundColor Green
        Write-Host "📈 Moyenne msgs/utilisateur : $([math]::Round($totalMessages / $totalUsers, 0))" -ForegroundColor Yellow
    }
    
    # Base de connaissances
    $kbFile = "$DataDir\knowledge-base.json"
    if (Test-Path $kbFile) {
        $kb = Get-Content $kbFile | ConvertFrom-Json
        $factCount = ($kb.facts | Get-Member -MemberType NoteProperty).Count
        Write-Host "🧠 Faits en base            : $factCount" -ForegroundColor Green
    }
    
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
}

function Get-UserStats {
    param([string]$UserId)
    
    $userFile = "$ConversationsDir\$UserId.json"
    
    if (-not (Test-Path $userFile)) {
        Write-Host "❌ Utilisateur $UserId introuvable" -ForegroundColor Red
        return
    }
    
    $data = Get-Content $userFile | ConvertFrom-Json
    
    Write-Host "`n👤 STATISTIQUES UTILISATEUR: $UserId" -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    
    Write-Host "💬 Messages totaux          : $($data.totalMessages)" -ForegroundColor Green
    Write-Host "📝 Messages en mémoire      : $($data.messages.Count)" -ForegroundColor Green
    Write-Host "📜 Périodes archivées       : $($data.summaries.Count)" -ForegroundColor Green
    
    if ($data.firstMessage) {
        $firstDate = [DateTimeOffset]::FromUnixTimeMilliseconds($data.firstMessage).LocalDateTime
        $daysSince = ([DateTime]::Now - $firstDate).Days
        Write-Host "📅 Premier message          : $($firstDate.ToString('dd/MM/yyyy HH:mm'))" -ForegroundColor Yellow
        Write-Host "⏱️  Relation depuis          : $daysSince jour(s)" -ForegroundColor Yellow
    }
    
    if ($data.lastMessage) {
        $lastDate = [DateTimeOffset]::FromUnixTimeMilliseconds($data.lastMessage).LocalDateTime
        Write-Host "🕒 Dernier message          : $($lastDate.ToString('dd/MM/yyyy HH:mm'))" -ForegroundColor Yellow
    }
    
    # Afficher les résumés récents
    if ($data.summaries -and $data.summaries.Count -gt 0) {
        Write-Host "`n📜 RÉSUMÉS RÉCENTS:" -ForegroundColor Cyan
        $recentSummaries = $data.summaries | Select-Object -Last 3
        foreach ($summary in $recentSummaries) {
            $summaryDate = [DateTimeOffset]::FromUnixTimeMilliseconds($summary.timestamp).LocalDateTime
            Write-Host "  • $($summaryDate.ToString('dd/MM/yyyy')) - $($summary.messageCount) msgs - Ton: $($summary.emotionalTone)" -ForegroundColor Gray
            if ($summary.topics) {
                Write-Host "    Sujets: $($summary.topics[0..4] -join ', ')" -ForegroundColor DarkGray
            }
        }
    }
    
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
}

function Get-TopUsers {
    Write-Host "`n🏆 TOP 10 UTILISATEURS LES PLUS ACTIFS" -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    
    $conversationFiles = Get-ChildItem -Path $ConversationsDir -Filter "*.json" -ErrorAction SilentlyContinue
    
    $users = @()
    foreach ($file in $conversationFiles) {
        $data = Get-Content $file.FullName | ConvertFrom-Json
        $users += [PSCustomObject]@{
            UserId = $data.userId
            TotalMessages = $data.totalMessages
            InMemory = $data.messages.Count
            Summaries = if ($data.summaries) { $data.summaries.Count } else { 0 }
        }
    }
    
    $topUsers = $users | Sort-Object -Property TotalMessages -Descending | Select-Object -First 10
    
    $rank = 1
    foreach ($user in $topUsers) {
        $medal = switch ($rank) {
            1 { "🥇" }
            2 { "🥈" }
            3 { "🥉" }
            default { "  " }
        }
        Write-Host "$medal #$rank - User $($user.UserId): $($user.TotalMessages) messages ($($user.InMemory) actifs, $($user.Summaries) archives)" -ForegroundColor Green
        $rank++
    }
    
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
}

function Invoke-Cleanup {
    Write-Host "`n🧹 NETTOYAGE DES DONNÉES ANCIENNES" -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    
    $conversationFiles = Get-ChildItem -Path $ConversationsDir -Filter "*.json" -ErrorAction SilentlyContinue
    $cutoffDate = (Get-Date).AddDays(-90) # 90 jours
    
    $cleaned = 0
    foreach ($file in $conversationFiles) {
        $data = Get-Content $file.FullName | ConvertFrom-Json
        
        if ($data.lastMessage) {
            $lastDate = [DateTimeOffset]::FromUnixTimeMilliseconds($data.lastMessage).LocalDateTime
            
            if ($lastDate -lt $cutoffDate) {
                Write-Host "  🗑️  Suppression: User $($data.userId) (inactif depuis $($lastDate.ToString('dd/MM/yyyy')))" -ForegroundColor Yellow
                Remove-Item $file.FullName -Force
                $cleaned++
            }
        }
    }
    
    Write-Host "`n✅ Nettoyage terminé: $cleaned fichier(s) supprimé(s)" -ForegroundColor Green
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
}

function Invoke-Backup {
    Write-Host "`n💾 SAUVEGARDE DES DONNÉES" -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupDir = ".\backups\context_$timestamp"
    
    Write-Host "📂 Création du dossier de sauvegarde..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
    
    Write-Host "📋 Copie des conversations..." -ForegroundColor Yellow
    Copy-Item -Path "$ConversationsDir\*" -Destination $backupDir -Recurse -Force
    
    Write-Host "🧠 Copie de la base de connaissances..." -ForegroundColor Yellow
    Copy-Item -Path "$DataDir\knowledge-base.json" -Destination $backupDir -Force -ErrorAction SilentlyContinue
    Copy-Item -Path "$DataDir\smart-memory.json" -Destination $backupDir -Force -ErrorAction SilentlyContinue
    
    $backupSize = (Get-ChildItem -Path $backupDir -Recurse | Measure-Object -Property Length -Sum).Sum
    $backupSizeMB = [math]::Round($backupSize / 1MB, 2)
    
    Write-Host "`n✅ Sauvegarde terminée!" -ForegroundColor Green
    Write-Host "📍 Emplacement: $backupDir" -ForegroundColor Cyan
    Write-Host "💾 Taille: $backupSizeMB MB" -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
}

function Export-UserHistory {
    param([string]$UserId)
    
    $userFile = "$ConversationsDir\$UserId.json"
    
    if (-not (Test-Path $userFile)) {
        Write-Host "❌ Utilisateur $UserId introuvable" -ForegroundColor Red
        return
    }
    
    Write-Host "`n📤 EXPORT DE L'HISTORIQUE UTILISATEUR" -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $exportFile = ".\exports\user_${UserId}_$timestamp.json"
    
    New-Item -ItemType Directory -Path ".\exports" -Force -ErrorAction SilentlyContinue | Out-Null
    Copy-Item -Path $userFile -Destination $exportFile -Force
    
    Write-Host "✅ Export terminé!" -ForegroundColor Green
    Write-Host "📍 Fichier: $exportFile" -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
}

# Main
switch ($Command.ToLower()) {
    "stats" { Get-GlobalStats }
    "user" { 
        if ($UserId) { Get-UserStats -UserId $UserId }
        else { Write-Host "❌ Usage: .\manage-context.ps1 user <userId>" -ForegroundColor Red }
    }
    "top" { Get-TopUsers }
    "cleanup" { Invoke-Cleanup }
    "backup" { Invoke-Backup }
    "export" {
        if ($UserId) { Export-UserHistory -UserId $UserId }
        else { Write-Host "❌ Usage: .\manage-context.ps1 export <userId>" -ForegroundColor Red }
    }
    "help" { Show-Help }
    default { Show-Help }
}
