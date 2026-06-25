'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { parsePatientFile } from '@/lib/parse-patient-file';
import { ArrowLeft, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, Sparkles, Users } from 'lucide-react';

interface ImportResult {
  imported: number;
  created: number;
  updated: number;
  failed: number;
  total: number;
  mapping: Record<string, string>;
  errors: string[];
}

type Phase = 'idle' | 'reading' | 'importing' | 'done' | 'error';

const FIELD_LABELS: Record<string, string> = {
  display_name: 'Full Name', nickname: 'Preferred Name', date_of_birth: 'Date of Birth',
  age: 'Age', gender: 'Gender', phone: 'Phone', whatsapp_number: 'WhatsApp', email: 'Email',
  emergency_contact_name: 'Emergency Contact', emergency_contact_phone: 'Emergency Phone',
  diagnosis: 'Diagnosis', therapy_modality: 'Therapy Modality', medications: 'Medications',
  presenting_concerns: 'Presenting Concerns', total_sessions: 'Total Sessions',
  session_frequency: 'Session Frequency',
};

export default function ImportPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('idle');
  const [fileName, setFileName] = useState('');
  const [rowCount, setRowCount] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleFile = useCallback(async (file: File) => {
    setFileName(file.name);
    setErrorMsg('');
    setResult(null);
    setPhase('reading');

    try {
      const { headers, rows } = await parsePatientFile(file);
      const cleanRows = rows.filter(r => Object.values(r).some(v => String(v ?? '').trim()));
      setRowCount(cleanRows.length);

      if (!cleanRows.length) {
        setErrorMsg('That file has no data rows.');
        setPhase('error');
        return;
      }
      if (cleanRows.length > 200) {
        setErrorMsg(`That file has ${cleanRows.length} rows — the limit is 200 per import.`);
        setPhase('error');
        return;
      }

      setPhase('importing');
      const res = await fetch('/api/patients/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, headers, rows: cleanRows }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || `Import failed (HTTP ${res.status})`);
        setPhase('error');
        return;
      }
      setResult(data);
      setPhase('done');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Could not read that file.');
      setPhase('error');
    }
  }, []);

  const onDrop = useCallback((files: File[]) => {
    if (files[0]) handleFile(files[0]);
  }, [handleFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    multiple: false,
    disabled: phase === 'reading' || phase === 'importing',
  });

  const reset = () => { setPhase('idle'); setResult(null); setErrorMsg(''); setFileName(''); };

  return (
    <div className="min-h-screen bg-[#0f1a27] text-white p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.back()} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/8 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">Import Patients</h1>
          <p className="text-sm text-gray-400 mt-0.5 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-teal-400" />
            Drop your sheet — AI reads the columns and imports everyone automatically
          </p>
        </div>
      </div>

      {/* ── Idle: just the dropzone ── */}
      {phase === 'idle' && (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-2xl p-16 flex flex-col items-center justify-center cursor-pointer transition-colors ${
            isDragActive ? 'border-teal-500 bg-teal-500/10' : 'border-white/20 hover:border-white/40 bg-white/3'
          }`}
        >
          <input {...getInputProps()} />
          <FileSpreadsheet className="w-16 h-16 text-teal-400 mb-4 opacity-80" />
          <p className="text-lg font-semibold text-white mb-1">
            {isDragActive ? 'Drop your file here' : 'Drag & drop your file here'}
          </p>
          <p className="text-sm text-gray-400 mb-4">or click to browse — up to 200 patients at once</p>
          <div className="flex gap-2 text-xs text-gray-500">
            <span className="px-2 py-1 bg-white/10 rounded">.csv</span>
            <span className="px-2 py-1 bg-white/10 rounded">.xlsx</span>
            <span className="px-2 py-1 bg-white/10 rounded">.xls</span>
          </div>
        </div>
      )}

      {/* ── Working: reading / importing ── */}
      {(phase === 'reading' || phase === 'importing') && (
        <div className="border border-white/10 rounded-2xl p-12 flex flex-col items-center justify-center bg-white/3">
          <Loader2 className="w-12 h-12 text-teal-400 animate-spin mb-5" />
          <p className="text-base font-semibold text-white mb-1">
            {phase === 'reading' ? 'Reading your file…' : 'AI is mapping columns & importing…'}
          </p>
          <p className="text-sm text-gray-400">{fileName}{rowCount ? ` · ${rowCount} rows` : ''}</p>
        </div>
      )}

      {/* ── Error ── */}
      {phase === 'error' && (
        <div className="space-y-4">
          <div className="bg-rose-900/20 border border-rose-700/40 rounded-2xl p-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-rose-300">Couldn’t import</p>
              <p className="text-sm text-gray-400 mt-1">{errorMsg}</p>
            </div>
          </div>
          <button onClick={reset} className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-sm font-medium transition-colors">
            Try another file
          </button>
        </div>
      )}

      {/* ── Done: summary ── */}
      {phase === 'done' && result && (
        <div className="space-y-5">
          <div className="bg-emerald-900/20 border border-emerald-700/40 rounded-2xl p-6 flex items-center gap-4">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 shrink-0" />
            <div>
              <p className="text-lg font-bold text-white">
                Synced {result.imported} of {result.total} patients
              </p>
              <p className="text-sm text-gray-400 mt-0.5">
                {result.created} new · {result.updated} updated
                {result.failed > 0 ? ` · ${result.failed} skipped` : ''} · {fileName}
              </p>
            </div>
          </div>

          {/* What the AI detected */}
          {result.mapping && Object.keys(result.mapping).length > 0 && (
            <div className="bg-[#1a2332] border border-white/8 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-teal-400" /> Columns the AI detected
              </h2>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                {Object.entries(result.mapping).map(([field, col]) => (
                  <div key={field} className="flex items-center justify-between text-sm gap-2">
                    <span className="text-gray-500 shrink-0">{FIELD_LABELS[field] || field}</span>
                    <span className="text-white font-medium truncate">{col}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Anything that failed */}
          {result.failed > 0 && result.errors.length > 0 && (
            <div className="bg-[#1a2332] border border-rose-700/30 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-rose-300 mb-2">{result.failed} rows skipped</h2>
              <ul className="space-y-1 max-h-40 overflow-y-auto">
                {result.errors.map((e, i) => (
                  <li key={i} className="text-xs text-gray-400">• {e}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={reset} className="px-5 py-2 rounded-lg text-gray-300 hover:text-white bg-white/8 hover:bg-white/12 transition-colors text-sm font-medium">
              Import another file
            </button>
            <button
              onClick={() => router.push('/patients')}
              className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Users className="w-4 h-4" /> Go to Patients
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
