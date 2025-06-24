-- Create recordings table for storing meeting recording metadata
CREATE TABLE IF NOT EXISTS recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT DEFAULT 0,
  duration_seconds INTEGER DEFAULT 0,
  status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed', 'deleted')),
  mime_type TEXT DEFAULT 'video/webm',
  thumbnail_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  download_count INTEGER DEFAULT 0,
  last_downloaded_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_recordings_meeting_id ON recordings(meeting_id);
CREATE INDEX IF NOT EXISTS idx_recordings_status ON recordings(status);
CREATE INDEX IF NOT EXISTS idx_recordings_created_at ON recordings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recordings_created_by ON recordings(created_by);

ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view recordings from their meetings" ON recordings
  FOR SELECT USING (
    meeting_id IN (
      SELECT m.id FROM meetings m 
      WHERE m.created_by = auth.uid() 
      OR m.id IN (
        SELECT mp.meeting_id FROM meeting_participants mp 
        WHERE mp.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Meeting creators can manage recordings" ON recordings
  FOR ALL USING (
    meeting_id IN (
      SELECT m.id FROM meetings m 
      WHERE m.created_by = auth.uid()
    )
  );


CREATE OR REPLACE FUNCTION update_recording_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_recording_completed_at ON recordings;
CREATE TRIGGER trigger_update_recording_completed_at
  BEFORE UPDATE ON recordings
  FOR EACH ROW
  EXECUTE FUNCTION update_recording_completed_at();

CREATE OR REPLACE FUNCTION cleanup_old_recordings(days_old INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  UPDATE recordings 
  SET status = 'deleted'
  WHERE created_at < (NOW() - INTERVAL '1 day' * days_old)
  AND status = 'completed';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE recordings IS 'Stores metadata for meeting recordings';
COMMENT ON COLUMN recordings.meeting_id IS 'Reference to the meeting that was recorded';
COMMENT ON COLUMN recordings.filename IS 'Original filename of the recording';
COMMENT ON COLUMN recordings.file_path IS 'Full path to the recording file on disk';
COMMENT ON COLUMN recordings.file_size IS 'Size of the recording file in bytes';
COMMENT ON COLUMN recordings.duration_seconds IS 'Duration of the recording in seconds';
COMMENT ON COLUMN recordings.status IS 'Current status of the recording (processing, completed, failed, deleted)';
COMMENT ON COLUMN recordings.mime_type IS 'MIME type of the recording file';
COMMENT ON COLUMN recordings.metadata IS 'Additional metadata about the recording (participants, quality settings, etc.)';
COMMENT ON COLUMN recordings.download_count IS 'Number of times this recording has been downloaded'; 