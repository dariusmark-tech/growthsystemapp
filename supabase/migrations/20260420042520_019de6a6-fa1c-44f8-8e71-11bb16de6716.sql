-- Plant analyses table
CREATE TABLE public.plant_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  image_url TEXT,
  plant_name TEXT NOT NULL,
  stage TEXT NOT NULL,
  confidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  days_to_next INTEGER,
  harvest_date TEXT,
  nutrients JSONB DEFAULT '[]'::jsonb,
  raw_response JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.plant_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own analyses"
  ON public.plant_analyses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own analyses"
  ON public.plant_analyses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own analyses"
  ON public.plant_analyses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own analyses"
  ON public.plant_analyses FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_plant_analyses_updated_at
  BEFORE UPDATE ON public.plant_analyses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_plant_analyses_user_created ON public.plant_analyses(user_id, created_at DESC);

-- Storage bucket for plant photos
INSERT INTO storage.buckets (id, name, public) VALUES ('plant-photos', 'plant-photos', true);

CREATE POLICY "Plant photos are publicly viewable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'plant-photos');

CREATE POLICY "Users can upload their own plant photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'plant-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own plant photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'plant-photos' AND auth.uid()::text = (storage.foldername(name))[1]);