# Affiche une ancienne version du site (une étiquette « semaine-AAAA-Sss ») dans le navigateur, sans toucher au travail en cours.
#
#   Double-clic sur « Afficher une version.bat » : une fenêtre propose les semaines, un bouton ouvre la version choisie.
#   En ligne de commande, sans fenêtre : powershell -File afficher-version.ps1 -Version semaine-2026-W40 -SansFenetre
#
# Chaque version est dépliée dans un dossier à part (frère du projet : « equinoxe-versions\<étiquette> », à supprimer quand on
# veut), avec ses propres dépendances (installation de quelques minutes la première fois seulement) et le fichier .env.local
# du projet. Elle se lance sur http://localhost:3100, jamais sur le port 3000 du travail en cours. Une étiquette garde le CODE
# de la semaine, pas les DONNÉES : la version affichée lit la base actuelle.
param(
  [string]$Version = "",
  [switch]$SansFenetre,
  # Pour les essais : ne pas ouvrir le navigateur.
  [switch]$SansNavigateur,
  [string]$Dossier = "",
  [int]$Port = 3100
)

# Les commandes git et npm écrivent sur leur sortie d'erreur sans que ce soit une faute : seuls leurs codes de retour comptent.
$ErrorActionPreference = "Continue"
$projet = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$base = if ($Dossier) { $Dossier } else { Join-Path (Split-Path $projet -Parent) "equinoxe-versions" }
$journal = Join-Path $base "journal.txt"
$script:serveur = $null

function Ecrire-Etat([string]$texte) {
  if ($script:etat) { $script:etat.Text = $texte; [System.Windows.Forms.Application]::DoEvents() }
  else { Write-Host $texte }
}

# Attend la fin d'un processus en gardant la fenêtre réactive.
function Attendre([System.Diagnostics.Process]$processus) {
  while (-not $processus.HasExited) {
    if ($script:etat) { [System.Windows.Forms.Application]::DoEvents() }
    Start-Sleep -Milliseconds 200
  }
}

function Lancer-Commande([string]$commande, [string]$dossierTravail) {
  New-Item -ItemType Directory -Force $base | Out-Null
  $p = Start-Process cmd.exe -ArgumentList "/c $commande >> `"$journal`" 2>&1" -WorkingDirectory $dossierTravail -PassThru -WindowStyle Hidden
  Attendre $p
  return $p.ExitCode
}

function Lister-Versions {
  & git -C $projet fetch --tags --quiet 2>$null
  $noms = & git -C $projet tag -l "semaine-*" --sort=-creatordate
  foreach ($nom in $noms) {
    $date = (& git -C $projet log -1 --format=%ad --date=short $nom)
    [pscustomobject]@{ Nom = $nom; Libelle = "$nom   (fin de semaine : $date)" }
  }
}

function Arreter-Serveur {
  if ($script:serveur -and -not $script:serveur.HasExited) {
    & taskkill /PID $script:serveur.Id /T /F 2>&1 | Out-Null
  }
  $script:serveur = $null
}

function Afficher-Version([string]$nom) {
  if ($nom -notmatch '^semaine-\d{4}-W\d{2}$') { throw "Étiquette inattendue : $nom" }
  Arreter-Serveur
  $copie = Join-Path $base $nom

  if (-not (Test-Path $copie)) {
    Ecrire-Etat "Préparation de $nom…"
    New-Item -ItemType Directory -Force $base | Out-Null
    if ((Lancer-Commande "git -C `"$projet`" worktree add --detach `"$copie`" $nom" $projet) -ne 0) { throw "Impossible de déplier $nom (voir $journal)." }
  }
  $reglages = Join-Path $projet ".env.local"
  if (Test-Path $reglages) { Copy-Item $reglages (Join-Path $copie ".env.local") -Force }

  if (-not (Test-Path (Join-Path $copie "node_modules"))) {
    Ecrire-Etat "Installation des dépendances de $nom (quelques minutes, une seule fois)…"
    if ((Lancer-Commande "npm ci --no-audit --no-fund" $copie) -ne 0) { throw "L'installation a échoué (voir $journal)." }
  }

  Ecrire-Etat "Démarrage de $nom…"
  $script:serveur = Start-Process cmd.exe -ArgumentList "/c npx next dev -p $Port >> `"$journal`" 2>&1" -WorkingDirectory $copie -PassThru -WindowStyle Hidden

  # Prêt dès que le port est ouvert : la première page d'une version met un moment à se construire (elle va chercher ses
  # données), inutile de l'attendre ici, le navigateur s'en charge.
  $url = "http://localhost:$Port"
  for ($i = 0; $i -lt 150; $i++) {
    if ($script:serveur.HasExited) { throw "Le serveur s'est arrêté (voir $journal)." }
    $client = New-Object System.Net.Sockets.TcpClient
    try {
      $client.Connect("127.0.0.1", $Port)
      $client.Close()
      if (-not $SansNavigateur) { Start-Process $url }
      Ecrire-Etat "$nom affichée sur $url (la première page peut mettre une minute à s'afficher). Clique sur « Arrêter » quand tu as fini."
      return
    } catch {
      if ($script:etat) { [System.Windows.Forms.Application]::DoEvents() }
      Start-Sleep -Milliseconds 800
    } finally {
      $client.Dispose()
    }
  }
  throw "Le serveur ne démarre pas sur le port $Port (voir $journal)."
}

if ($SansFenetre) {
  if (-not $Version) { throw "Indique -Version semaine-AAAA-Sss." }
  try { Afficher-Version $Version; Write-Host "Ctrl+C pour arrêter."; Wait-Process -Id $script:serveur.Id }
  finally { Arreter-Serveur }
  return
}

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()

$versions = @(Lister-Versions)
$fenetre = New-Object System.Windows.Forms.Form
$fenetre.Text = "Équinoxe — revoir une ancienne version"
$fenetre.StartPosition = "CenterScreen"
$fenetre.ClientSize = New-Object System.Drawing.Size(520, 200)
$fenetre.FormBorderStyle = "FixedDialog"
$fenetre.MaximizeBox = $false

$consigne = New-Object System.Windows.Forms.Label
$consigne.Text = "Choisis la semaine à revoir :"
$consigne.Location = New-Object System.Drawing.Point(16, 16)
$consigne.AutoSize = $true

$liste = New-Object System.Windows.Forms.ComboBox
$liste.DropDownStyle = "DropDownList"
$liste.Location = New-Object System.Drawing.Point(16, 44)
$liste.Size = New-Object System.Drawing.Size(488, 28)
foreach ($v in $versions) { [void]$liste.Items.Add($v.Libelle) }
if ($liste.Items.Count -gt 0) { $liste.SelectedIndex = 0 }

$bouton = New-Object System.Windows.Forms.Button
$bouton.Text = "Afficher cette version"
$bouton.Location = New-Object System.Drawing.Point(16, 86)
$bouton.Size = New-Object System.Drawing.Size(240, 34)

$arret = New-Object System.Windows.Forms.Button
$arret.Text = "Arrêter"
$arret.Location = New-Object System.Drawing.Point(264, 86)
$arret.Size = New-Object System.Drawing.Size(120, 34)
$arret.Enabled = $false

$script:etat = New-Object System.Windows.Forms.Label
$script:etat.Text = if ($versions.Count -gt 0) { "Prêt." } else { "Aucune étiquette « semaine-… » trouvée dans le projet." }
$script:etat.Location = New-Object System.Drawing.Point(16, 136)
$script:etat.Size = New-Object System.Drawing.Size(488, 50)

$bouton.Add_Click({
  if ($liste.SelectedIndex -lt 0) { return }
  $nom = ($versions[$liste.SelectedIndex]).Nom
  $bouton.Enabled = $false; $liste.Enabled = $false; $arret.Enabled = $false
  try { Afficher-Version $nom; $arret.Enabled = $true }
  catch { Ecrire-Etat "Échec : $($_.Exception.Message)"; Arreter-Serveur }
  finally { $bouton.Enabled = $true; $liste.Enabled = $true }
})
$arret.Add_Click({ Arreter-Serveur; $arret.Enabled = $false; Ecrire-Etat "Version arrêtée." })
$fenetre.Add_FormClosing({ Arreter-Serveur })

$fenetre.Controls.AddRange(@($consigne, $liste, $bouton, $arret, $script:etat))
[void]$fenetre.ShowDialog()
