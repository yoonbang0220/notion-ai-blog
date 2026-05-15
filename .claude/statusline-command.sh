#!/bin/sh
input=$(cat)

model=$(echo "$input" | jq -r '.model.display_name // "Unknown"')
model=$(echo "$model" | sed -E 's/ *\([1][Mm] context\)//')

chat_pct=$(echo "$input" | jq -r '.context_window.used_percentage // empty')

cur_input=$(echo "$input" | jq -r '.context_window.current_usage.input_tokens // 0')
cur_output=$(echo "$input" | jq -r '.context_window.current_usage.output_tokens // 0')
cur_cw=$(echo "$input" | jq -r '.context_window.current_usage.cache_creation_input_tokens // 0')
cur_cr=$(echo "$input" | jq -r '.context_window.current_usage.cache_read_input_tokens // 0')

total_input=$(echo "$input" | jq -r '.context_window.total_input_tokens // 0')
total_output=$(echo "$input" | jq -r '.context_window.total_output_tokens // 0')
ctx_size=$(echo "$input" | jq -r '.context_window.context_window_size // 0')

total_used=$((total_input + total_output))

case "$model" in
  *Opus*)   p_in=15.00; p_out=75.00; p_cw=18.75; p_cr=1.50 ;;
  *Haiku*)  p_in=1.00;  p_out=5.00;  p_cw=1.25;  p_cr=0.10 ;;
  *)        p_in=3.00;  p_out=15.00; p_cw=3.75;  p_cr=0.30 ;;
esac

chat_cost=""
if [ "$cur_input" != "0" ] || [ "$cur_output" != "0" ] || [ "$cur_cw" != "0" ] || [ "$cur_cr" != "0" ]; then
  chat_cost=$(awk -v i="$cur_input" -v o="$cur_output" -v cw="$cur_cw" -v cr="$cur_cr" \
    -v pi="$p_in" -v po="$p_out" -v pcw="$p_cw" -v pcr="$p_cr" \
    'BEGIN{printf "$%.4f", (i*pi + o*po + cw*pcw + cr*pcr)/1000000}')
fi

format_tokens() {
  awk -v n="$1" 'BEGIN{
    if (n >= 1000000) printf "%.1fM", n/1000000;
    else if (n >= 1000) printf "%.0fk", n/1000;
    else printf "%d", n;
  }'
}

out=$(printf '🤖 \033[1m%s\033[0m' "$model")

if [ -n "$chat_pct" ]; then
  chat_pct_int=$(printf "%.0f" "$chat_pct")
  out="$out | 💬 $(printf '\033[36m%s%%\033[0m' "$chat_pct_int")"
fi

if [ -n "$chat_cost" ]; then
  out="$out | 💵 $(printf '\033[33m%s\033[0m' "$chat_cost")"
fi

if [ "$ctx_size" -gt 0 ]; then
  used_fmt=$(format_tokens "$total_used")
  max_fmt=$(format_tokens "$ctx_size")
  total_pct=$(awk -v u="$total_used" -v m="$ctx_size" 'BEGIN{printf "%.0f", (u/m)*100}')
  out="$out | 📊 $(printf '\033[35m%s/%s (%s%%)\033[0m' "$used_fmt" "$max_fmt" "$total_pct")"
fi

printf "%s" "$out"
