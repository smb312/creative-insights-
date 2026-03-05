-- Add onboarding token and completion tracking to clients
ALTER TABLE clients ADD COLUMN onboarding_token uuid DEFAULT gen_random_uuid();
ALTER TABLE clients ADD COLUMN onboarding_completed_at timestamptz;

-- Fast lookup by token
CREATE UNIQUE INDEX clients_onboarding_token_idx ON clients(onboarding_token);

-- Allow public access to clients by onboarding token (for the public form)
CREATE POLICY "Public onboarding token access" ON clients
  FOR SELECT USING (onboarding_token IS NOT NULL);

-- Allow public upsert on onboarding_responses (the public form saves without auth)
CREATE POLICY "Public can upsert onboarding responses" ON onboarding_responses
  FOR ALL USING (true) WITH CHECK (true);

-- Allow public to update onboarding_completed_at on clients
CREATE POLICY "Public can mark onboarding complete" ON clients
  FOR UPDATE USING (onboarding_token IS NOT NULL)
  WITH CHECK (onboarding_token IS NOT NULL);
