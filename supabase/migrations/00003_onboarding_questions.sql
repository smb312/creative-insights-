-- Onboarding questions table — customizable per client
CREATE TABLE public.onboarding_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  section text NOT NULL CHECK (section IN ('performance', 'creative')),
  question_text text NOT NULL,
  question_key text NOT NULL,
  order_index integer NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_onboarding_questions_client_section
  ON public.onboarding_questions(client_id, section, order_index);

-- RLS
ALTER TABLE public.onboarding_questions ENABLE ROW LEVEL SECURITY;

-- Agency users can read/write all questions
CREATE POLICY "Agency staff can manage onboarding questions"
  ON public.onboarding_questions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('agency_admin', 'agency_member')
    )
  );

-- Public onboarding token can read questions for their client
CREATE POLICY "Public can read onboarding questions"
  ON public.onboarding_questions FOR SELECT
  USING (true);

-- Function to seed default questions for a new client
CREATE OR REPLACE FUNCTION public.seed_default_onboarding_questions(p_client_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO public.onboarding_questions (client_id, section, question_key, question_text, order_index)
  VALUES
    -- Performance questions (18)
    (p_client_id, 'performance', 'perf_1',  'How should we prioritize success across your business units (D2C, Loyalty Programs, Subscriptions, Retail, etc.) during this engagement?', 1),
    (p_client_id, 'performance', 'perf_2',  'If tradeoffs arise, is there a primary business unit we should optimize for, or should we evaluate each independently?', 2),
    (p_client_id, 'performance', 'perf_3',  'What is the current narrative on paid media this year? Are we achieving goals or falling behind? Please provide as much detail as possible.', 3),
    (p_client_id, 'performance', 'perf_4',  'What are your short term and/or long term goals moving forward that would define success for this engagement?', 4),
    (p_client_id, 'performance', 'perf_5',  'What KPIs are most important for us to track? Do you have any specific KPI targets we should aim for?', 5),
    (p_client_id, 'performance', 'perf_6',  'What is your current monthly budget for the ad platforms we''ll be managing?', 6),
    (p_client_id, 'performance', 'perf_7',  'What is your target monthly budget for those platforms over the next few months/year?', 7),
    (p_client_id, 'performance', 'perf_8',  'Ideally we would be able to move budget between platforms to maximize performance. Does this work for your team?', 8),
    (p_client_id, 'performance', 'perf_9',  'In order to help us with ROI calculations, can you speak to product margins?', 9),
    (p_client_id, 'performance', 'perf_10', 'Are there any industry-specific advertising restrictions that we should be aware of?', 10),
    (p_client_id, 'performance', 'perf_11', 'Are there inventory constraints for specific product lines that we should be aware of?', 11),
    (p_client_id, 'performance', 'perf_12', 'Can you touch on key time periods/peak seasons for the business?', 12),
    (p_client_id, 'performance', 'perf_13', 'What is your main source of truth when assessing paid media performance?', 13),
    (p_client_id, 'performance', 'perf_14', 'What other tools and platforms are you currently using in your marketing efforts?', 14),
    (p_client_id, 'performance', 'perf_15', 'What does the current email marketing strategy look like?', 15),
    (p_client_id, 'performance', 'perf_16', 'Do you have any reporting needs that we should be aware of?', 16),
    (p_client_id, 'performance', 'perf_17', 'Do you have an in-house dev team or other developer contact you work with?', 17),
    (p_client_id, 'performance', 'perf_18', 'Do you use a product feed management platform?', 18),
    -- Creative questions (9)
    (p_client_id, 'creative', 'creative_1', 'Who should be our main point of contact for creative approval?', 1),
    (p_client_id, 'creative', 'creative_2', 'Who is your ideal customer and what are they looking for when coming to your site?', 2),
    (p_client_id, 'creative', 'creative_3', 'What are the key value propositions of your brand?', 3),
    (p_client_id, 'creative', 'creative_4', 'Are there any specific dos or don''ts when it comes to advertising?', 4),
    (p_client_id, 'creative', 'creative_5', 'Are there any brands with an advertising style or personality that you would love to see incorporated into your brand''s advertising style?', 5),
    (p_client_id, 'creative', 'creative_6', 'Who are your top competitors?', 6),
    (p_client_id, 'creative', 'creative_7', 'Where can we locate your customer reviews?', 7),
    (p_client_id, 'creative', 'creative_8', 'Where can we locate your press mentions?', 8),
    (p_client_id, 'creative', 'creative_9', 'Do you have any in-house creative capabilities?', 9);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
