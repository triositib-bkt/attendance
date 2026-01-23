-- Notification Cleanup Function
-- This function deletes notifications (and their recipients) older than specified days

CREATE OR REPLACE FUNCTION cleanup_old_notifications(days_to_keep INTEGER DEFAULT 2)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete notifications older than specified days
  -- This will cascade delete to notification_recipients due to ON DELETE CASCADE
  DELETE FROM notifications
  WHERE created_at < NOW() - (days_to_keep || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_notifications IS 'Deletes notifications older than specified days (default: 2 days). Cascades to notification_recipients.';

-- Optional: Create an index on created_at if not exists for better cleanup performance
CREATE INDEX IF NOT EXISTS idx_notifications_cleanup 
ON notifications(created_at) 
WHERE created_at < NOW() - INTERVAL '2 days';
