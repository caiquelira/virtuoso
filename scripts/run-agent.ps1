# Runs one coding agent for a task: worktree, npm ci, then agy without a terminal. See docs/RUNBOOK.md.
# Usage: scripts/run-agent.ps1 -Id T06 -Name input-sources -Tests a.test.ts,b.test.ts [-ExtraCommands "npm run check"] [-Writes "src/ and docs/tasks/"] [-Note "..."] [-Extra "<failure text>"] [-Suffix retry]
param(
  [Parameter(Mandatory)][string]$Id,
  [Parameter(Mandatory)][string]$Name,
  [string[]]$Tests = @(),
  [string[]]$ExtraCommands = @(),
  [string]$Writes = "src/ and docs/tasks/",
  [string]$Note = "",
  [string]$Extra = "",
  [string]$Suffix = ""
)
$ErrorActionPreference = 'Stop'
$repo = 'C:\Users\Pichau\Projetos\Virtuoso\code'
$runs = Join-Path $repo '.coordination\runs'
$wt = "C:\Users\Pichau\Projetos\Virtuoso\worktrees\$Id"
$agy = "$env:LOCALAPPDATA\agy\bin\agy.exe"
$tag = if ($Suffix) { "$Id.$Suffix" } else { $Id }

function Log($msg) { "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $msg" | Add-Content (Join-Path $runs "$tag.coord.txt") }

if (-not (Test-Path $wt)) {
  Log "worktree add"
  git -C $repo worktree add $wt -b "task/$Id-$Name" main 2>&1 | Out-String | ForEach-Object { Log $_ }
}
if (-not (Test-Path (Join-Path $wt 'node_modules'))) {
  Log "npm ci start"
  Push-Location $wt
  npm ci 2>&1 | Out-String | ForEach-Object { Log $_ }
  Log "npm ci exit $LASTEXITCODE"
  Pop-Location
}

$cmds = @("``npm run check:task -- $Id``") + @($Tests | ForEach-Object { "``npx vitest run $_``" }) + @($ExtraCommands | ForEach-Object { "``$_``" }) + @("``npm run typecheck``", "``npm run lint``", "``npm run format``")
$prompt = "Implement docs/tasks/$Id-$Name.md. Follow AGENTS.md, except that your branch already exists and you don't commit, push or open a pull request: the coordinator does that. Change only the files the task lists, plus Status and the implementer sections of your task file. Stop when ``npm run check:task -- $Id`` passes, or after two honest attempts at the same failure, with your questions written under Questions in the task file.`n`nThis is a headless run: any terminal command outside this list is denied and ends your run at once. The only commands you may run are these, typed exactly as written, with no extra arguments, flags, pipes, ``cd`` or redirection: $($cmds -join ', '). Don't run git or any other command; use your file tools to read, search and edit files. You may write only under $Writes."
if ($Note) { $prompt += "`n`n$Note" }
if ($Extra) { $prompt += "`n`nA previous run left these failures; fix them:`n$Extra" }
Set-Content (Join-Path $runs "$tag.prompt.txt") $prompt -Encoding utf8NoBOM

Log "agent start"
Push-Location $wt
& $agy -p $prompt --output-format stream-json --print-timeout 60m 1> (Join-Path $runs "$tag.out.txt") 2> (Join-Path $runs "$tag.err.txt")
Log "agent exit $LASTEXITCODE"
Pop-Location
