CREATE TABLE public.giveaway_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  full_name text NOT NULL CHECK (char_length(full_name) BETWEEN 1 AND 120),
  business_name text NOT NULL CHECK (char_length(business_name) BETWEEN 1 AND 160),
  email text NOT NULL CHECK (char_length(email) BETWEEN 3 AND 255),
  us_state text NOT NULL CHECK (char_length(us_state) BETWEEN 2 AND 40),
  business_stage text NOT NULL CHECK (business_stage IN ('Existing business','Startup','Entrepreneur','Preparing to launch')),
  primary_goal text NOT NULL CHECK (char_length(primary_goal) BETWEEN 1 AND 300),
  project_description text NOT NULL CHECK (char_length(project_description) BETWEEN 1 AND 2000),
  website_url text CHECK (website_url IS NULL OR char_length(website_url) <= 300),
  services_of_interest text[] NOT NULL DEFAULT '{}',
  rules_privacy_consent boolean NOT NULL CHECK (rules_privacy_consent = true),
  marketing_consent boolean NOT NULL DEFAULT false,
  rules_version text NOT NULL,
  privacy_version text NOT NULL,
  source_page text NOT NULL DEFAULT '/giveaway',
  email_normalized text,
  duplicate_count integer NOT NULL DEFAULT 0,
  review_status text NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending','valid','invalid','duplicate','finalist','winner')),
  admin_notes text
);

GRANT INSERT ON public.giveaway_entries TO anon, authenticated;
GRANT ALL ON public.giveaway_entries TO service_role;

ALTER TABLE public.giveaway_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can submit entries" ON public.giveaway_entries
  FOR INSERT TO anon, authenticated
  WITH CHECK (rules_privacy_consent = true AND review_status = 'pending' AND admin_notes IS NULL);

CREATE INDEX giveaway_entries_email_idx ON public.giveaway_entries (email_normalized);
CREATE INDEX giveaway_entries_created_idx ON public.giveaway_entries (created_at DESC);

CREATE OR REPLACE FUNCTION public.giveaway_entries_before_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.email_normalized := lower(trim(NEW.email));
  NEW.created_at := now();
  NEW.review_status := 'pending';
  NEW.admin_notes := NULL;
  SELECT count(*) INTO NEW.duplicate_count FROM public.giveaway_entries WHERE email_normalized = NEW.email_normalized;
  RETURN NEW;
END $$;

CREATE TRIGGER giveaway_entries_before_insert BEFORE INSERT ON public.giveaway_entries
  FOR EACH ROW EXECUTE FUNCTION public.giveaway_entries_before_insert();