# Synthesises each dialogue in scripts.json to audio/<id>.wav (16 kHz mono PCM,
# same format the live recorder streams). Speaker A = David, Speaker B = Zira.
#   powershell -ExecutionPolicy Bypass -File scripts/workspace-eval/recording/synth.ps1
Add-Type -AssemblyName System.Speech
$dir = $PSScriptRoot
$audio = Join-Path $dir 'audio'
New-Item -ItemType Directory -Force $audio | Out-Null
$scripts = Get-Content (Join-Path $dir 'scripts.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$fmt = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(16000, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
foreach ($sc in $scripts) {
  $out = Join-Path $audio "$($sc.id).wav"
  $s = New-Object System.Speech.Synthesis.SpeechSynthesizer
  $s.SetOutputToWaveFile($out, $fmt)
  foreach ($t in $sc.turns) {
    $voice = if ($t[0] -eq 'A') { 'Microsoft David Desktop' } else { 'Microsoft Zira Desktop' }
    $s.SelectVoice($voice)
    $pb = New-Object System.Speech.Synthesis.PromptBuilder
    $pb.AppendText([string]$t[1])
    $pb.AppendBreak([TimeSpan]::FromMilliseconds(450))
    $s.Speak($pb)
  }
  $s.Dispose()
  $bytes = (Get-Item $out).Length
  Write-Output ("{0}: {1:N1}s" -f $sc.id, (($bytes - 44) / 32000))
}
