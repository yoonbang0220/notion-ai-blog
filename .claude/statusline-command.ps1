$input_data = $input | Out-String
try { $json = $input_data | ConvertFrom-Json } catch { exit 0 }

$ESC  = [char]27
$BOLD = "$ESC[1m"
$CYAN = "$ESC[36m"
$YEL  = "$ESC[33m"
$MAG  = "$ESC[35m"
$RST  = "$ESC[0m"

$model = if ($json.model.display_name) { $json.model.display_name } else { "Unknown" }
$model = $model -replace ' *\(1[Mm] context\)', ''

$chat_pct = $json.context_window.used_percentage

$cur_input  = if ($json.context_window.current_usage.input_tokens)               { [double]$json.context_window.current_usage.input_tokens }               else { 0 }
$cur_output = if ($json.context_window.current_usage.output_tokens)              { [double]$json.context_window.current_usage.output_tokens }              else { 0 }
$cur_cw     = if ($json.context_window.current_usage.cache_creation_input_tokens){ [double]$json.context_window.current_usage.cache_creation_input_tokens } else { 0 }
$cur_cr     = if ($json.context_window.current_usage.cache_read_input_tokens)    { [double]$json.context_window.current_usage.cache_read_input_tokens }    else { 0 }

$total_input  = if ($json.context_window.total_input_tokens)  { [long]$json.context_window.total_input_tokens }  else { 0 }
$total_output = if ($json.context_window.total_output_tokens) { [long]$json.context_window.total_output_tokens } else { 0 }
$ctx_size     = if ($json.context_window.context_window_size) { [long]$json.context_window.context_window_size } else { 0 }

$total_used = $total_input + $total_output

if ($model -like "*Opus*") {
    $p_in = 15.00; $p_out = 75.00; $p_cw = 18.75; $p_cr = 1.50
} elseif ($model -like "*Haiku*") {
    $p_in = 1.00;  $p_out = 5.00;  $p_cw = 1.25;  $p_cr = 0.10
} else {
    $p_in = 3.00;  $p_out = 15.00; $p_cw = 3.75;  $p_cr = 0.30
}

function Format-Tokens($n) {
    if ($n -ge 1000000) { return ('{0:F1}M' -f ($n / 1000000)) }
    if ($n -ge 1000)    { return ('{0:F0}k' -f ($n / 1000)) }
    return [string]$n
}

$result = "🤖 ${BOLD}${model}${RST}"

if ($chat_pct) {
    $pct = [math]::Round([double]$chat_pct)
    $result += " | 💬 ${CYAN}${pct}%${RST}"
}

if ($cur_input -gt 0 -or $cur_output -gt 0 -or $cur_cw -gt 0 -or $cur_cr -gt 0) {
    $cost = ($cur_input * $p_in + $cur_output * $p_out + $cur_cw * $p_cw + $cur_cr * $p_cr) / 1000000
    $cost_str = '$' + ("{0:F4}" -f $cost)
    $result += " | 💵 ${YEL}${cost_str}${RST}"
}

if ($ctx_size -gt 0) {
    $used_fmt  = Format-Tokens $total_used
    $max_fmt   = Format-Tokens $ctx_size
    $total_pct = [math]::Round(($total_used / $ctx_size) * 100)
    $result += " | 📊 ${MAG}${used_fmt}/${max_fmt} (${total_pct}%)${RST}"
}

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::Write($result)
