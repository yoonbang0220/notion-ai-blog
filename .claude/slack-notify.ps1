# Claude Code Slack 알림 스크립트 (Windows / PowerShell)
# 사용법: stdin으로 hook input JSON을 받고, -type 매개변수로 이벤트 종류를 받음
#   지원 type: permission | stop | subagent_start | subagent_running | subagent_stop
#
# 메시지에 포함되는 정보:
#   - 📁 프로젝트: hook input의 cwd → CLAUDE_PROJECT_DIR → 현재 디렉터리 순으로 fallback
#   - 📊 상태: type을 한국어로 변환
#   - 🕐 시간: KST(Asia/Seoul) HH:mm:ss
#   - 서브에이전트 이벤트일 때는 🤖 에이전트명 + 📋 작업 설명 포함
#
# 마커 파일($env:TEMP\claude-subagent-active.txt):
#   - subagent_start 시 에이전트명을 기록
#   - subagent_running 트리거 시 존재 확인 → 없으면 조용히 종료
#   - subagent_stop 시 제거

param(
    [string]$type = "unknown"
)

$markerFile = Join-Path $env:TEMP "claude-subagent-active.txt"

# subagent_running일 때 마커 없으면 조용히 종료
if ($type -eq "subagent_running" -and -not (Test-Path $markerFile)) {
    exit 0
}

$webhookUrl = $env:SLACK_WEBHOOK_URL
if (-not $webhookUrl) { exit 0 }

# stdin에서 hook input JSON 읽기
try {
    $rawInput = [Console]::In.ReadToEnd()
    if ($rawInput) {
        $json = $rawInput | ConvertFrom-Json -ErrorAction Stop
    } else {
        $json = $null
    }
} catch {
    $json = $null
}

# KST(UTC+9), 초까지
$kst = (Get-Date).ToUniversalTime().AddHours(9)
$timeStr = $kst.ToString("HH:mm:ss")

# 프로젝트명 추출
$projectPath = ""
if ($json -and $json.cwd) {
    $projectPath = [string]$json.cwd
} elseif ($env:CLAUDE_PROJECT_DIR) {
    $projectPath = $env:CLAUDE_PROJECT_DIR
} else {
    $projectPath = (Get-Location).Path
}
$projectName = if ($projectPath) { Split-Path -Leaf $projectPath.TrimEnd('/', '\') } else { "Unknown" }
if (-not $projectName) { $projectName = "Unknown" }

# 상태 라벨(한국어)
$statusLabel = switch ($type) {
    "permission"        { "권한 요청 대기 중" }
    "stop"              { "작업 완료" }
    "subagent_start"    { "서브에이전트 작업 시작" }
    "subagent_running"  { "서브에이전트 실행 중" }
    "subagent_stop"     { "서브에이전트 작업 완료" }
    default             { $type }
}

# 마커 파일에서 에이전트명 읽기 (subagent_running용)
$markerAgentName = ""
if (Test-Path $markerFile) {
    try { $markerAgentName = (Get-Content $markerFile -Raw).Trim() } catch { }
}

# 헬퍼: PSCustomObject에서 여러 필드명 중 첫 번째 값 반환
function Get-FirstField($obj, [string[]]$keys, [string]$default = "") {
    if (-not $obj) { return $default }
    foreach ($k in $keys) {
        $val = $obj.PSObject.Properties[$k]
        if ($val -and $val.Value) { return [string]$val.Value }
    }
    return $default
}

function Get-AgentInfo {
    $agentName = Get-FirstField $json @("subagent_type", "agent_type", "agent_name", "name", "type") "Unknown"
    $description = Get-FirstField $json @("description", "task", "prompt") ""
    if ($agentName -eq "Unknown" -and $json.tool_input) {
        $agentName = Get-FirstField $json.tool_input @("subagent_type", "agent_type", "agent_name", "name") "Unknown"
    }
    if (-not $description -and $json.tool_input) {
        $description = Get-FirstField $json.tool_input @("description", "task", "prompt") ""
    }
    # str 변환 후 길이 체크 — 숫자/bool 입력 방어
    $description = if ($description) { [string]$description } else { "" }
    if ($description.Length -gt 100) {
        $description = $description.Substring(0, 100) + "..."
    }
    return @{ Name = $agentName; Description = $description }
}

# 메시지 본문 빌드
$lines = New-Object System.Collections.Generic.List[string]

switch ($type) {
    "permission"        { $lines.Add(":lock: *권한 요청* [$timeStr]") }
    "stop"              { $lines.Add(":white_check_mark: *작업 완료!* [$timeStr]") }
    "subagent_start"    { $lines.Add(":rocket: *서브에이전트 시작* [$timeStr]") }
    "subagent_running"  { $lines.Add(":arrows_counterclockwise: *서브에이전트 실행 중* [$timeStr]") }
    "subagent_stop"     { $lines.Add(":dart: *서브에이전트 완료* [$timeStr]") }
    default             { $lines.Add(":robot_face: *Claude Code 이벤트* [$timeStr]") }
}

# 권한 요청
if ($type -eq "permission") {
    $toolName = if ($json.tool_name) { [string]$json.tool_name } else { "Unknown" }
    $detail = ""
    if ($json.tool_input) {
        if ($json.tool_input.command) {
            $cmd = [string]$json.tool_input.command
            $detail = if ($cmd.Length -gt 80) { $cmd.Substring(0, 80) + "..." } else { $cmd }
        } elseif ($json.tool_input.file_path) { $detail = [string]$json.tool_input.file_path }
        elseif ($json.tool_input.path)        { $detail = [string]$json.tool_input.path }
        elseif ($json.tool_input.query)       { $detail = [string]$json.tool_input.query }
    }
    $lines.Add("*🔧 도구:* ``$toolName``")
    if ($detail) { $lines.Add("*📝 내용:* ``$detail``") }
}

# 서브에이전트 시작/완료
if ($type -eq "subagent_start" -or $type -eq "subagent_stop") {
    $agent = Get-AgentInfo
    $lines.Add("*🤖 에이전트:* ``$($agent.Name)``")
    if ($agent.Description) { $lines.Add("*📋 작업:* $($agent.Description)") }
}

# 서브에이전트 실행 중: 마커의 에이전트명 + PostToolUse JSON의 도구명/상세
if ($type -eq "subagent_running") {
    $toolName = if ($json.tool_name) { [string]$json.tool_name } else { "Unknown" }
    $detail = ""
    if ($json.tool_input) {
        if ($json.tool_input.command) {
            $cmd = [string]$json.tool_input.command
            $detail = if ($cmd.Length -gt 60) { $cmd.Substring(0, 60) + "..." } else { $cmd }
        } elseif ($json.tool_input.file_path) { $detail = [string]$json.tool_input.file_path }
        elseif ($json.tool_input.path)        { $detail = [string]$json.tool_input.path }
    }
    $agentDisplay = if ($markerAgentName) { $markerAgentName } else { "Unknown" }
    $lines.Add("*🤖 에이전트:* ``$agentDisplay``")
    $lines.Add("*🔧 도구:* ``$toolName``")
    if ($detail) { $lines.Add("*📝 내용:* ``$detail``") }
}

# 공통 푸터
$lines.Add("*📁 프로젝트:* ``$projectName``")
$lines.Add("*📊 상태:* $statusLabel")
$lines.Add("*🕐 시간:* $timeStr (KST)")

$message = $lines -join "`n"

# subagent_start면 마커 파일에 에이전트명 기록
if ($type -eq "subagent_start") {
    $agent = Get-AgentInfo
    try {
        [System.IO.File]::WriteAllText($markerFile, $agent.Name, (New-Object System.Text.UTF8Encoding($false)))
    } catch {}
}

# Slack 전송 (한글 BOM 문제 우회: 임시 파일 + curl.exe)
try {
    $body = @{ text = $message } | ConvertTo-Json -Compress
    $tempFile = [System.IO.Path]::Combine($env:TEMP, "slack-hook-$(Get-Random).json")
    [System.IO.File]::WriteAllText($tempFile, $body, (New-Object System.Text.UTF8Encoding($false)))
    curl.exe -s -X POST -H "Content-Type: application/json" -d "@$tempFile" $webhookUrl | Out-Null
    Remove-Item $tempFile -Force -ErrorAction SilentlyContinue
} catch {}

# subagent_stop이면 마커 파일 제거 (Slack 전송 후)
if ($type -eq "subagent_stop") {
    Remove-Item $markerFile -Force -ErrorAction SilentlyContinue
}

exit 0
