import { setup, judge, evalUser, cleanupEvalUsers } from '../harness';
(async () => {
  await setup();
  const { generateNote, noteToText } = await import('../../../lib/workspace/generate');
  const { askOnce } = await import('../../../lib/workspace/ask');
  const input = 'met Sarah re lvl 3 pour, moved to Thu (rain). she confirms pump by 10am tmrw.';
  const note = await generateNote({ input, inputMode: 'typed', noteType: 'general', field: 'construction', date: '21 October 2026' });
  const text = noteToText(note);
  const j = await judge('Turn rough notes into a structured note', { faithfulness: 'No facts beyond the input', coverage: 'All input facts captured' }, `INPUT:\n${input}\n\nNOTE:\n${text}`);
  console.log('judge:', j);
  const { userId, admin } = await evalUser('smoke', 'construction');
  await admin.from('ws_notes').insert({ user_id: userId, status: 'completed', note_type: 'general', field: 'construction', input_mode: 'typed', content: note, title: note.title, summary: note.summary, search_text: text });
  const a1 = await askOnce(admin as any, userId, 'When is the level 3 pour?');
  const a2 = await askOnce(admin as any, userId, 'What is the budget for the project?');
  console.log('answerable:', a1.answer.slice(0, 200));
  console.log('not in notes:', a2.answer.slice(0, 200));
  await cleanupEvalUsers();
})().catch(e => { console.error(e); process.exit(1); });
