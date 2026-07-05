-- Lets a doctor pick WHICH Google Calendar to sync from, instead of always
-- pulling every event off their primary calendar (personal engagements
-- included). Defaults to 'primary' so existing connections keep working
-- exactly as before until the doctor explicitly picks a different calendar.
ALTER TABLE therapists ADD COLUMN IF NOT EXISTS google_calendar_id TEXT DEFAULT 'primary';
