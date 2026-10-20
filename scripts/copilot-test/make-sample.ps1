# Generates steve-sample.wav for the /copilot "Test with sample audio" button.
# Uses Windows' built-in speech synthesizer, so no accounts or downloads.
Add-Type -AssemblyName System.Speech
$out = Join-Path $PSScriptRoot 'steve-sample.wav'
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
$s.SetOutputToWaveFile($out)
$s.Speak("G'day Anurag, thanks for making the time mate.")
$s.Speak("So here's the thing. If C51 is putting our name on this, we'd need exclusive rights for Australia, at least for the NDIS sector. And anything we build together, I'd see as jointly owned. How does that sit with you?")
$s.Speak("Also, where does the data actually live? Is our participants' data staying in Australia?")
$s.Dispose()
Write-Output "Wrote $out"
