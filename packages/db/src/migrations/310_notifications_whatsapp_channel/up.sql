-- 310_notifications_whatsapp_channel
-- Widens the notification channel CHECK constraints to allow 'whatsapp'
-- alongside 'email', so match availability + schedule messages can be delivered
-- over WhatsApp. Idempotent (drop-if-exists then re-add); owned by the
-- notifications context.

ALTER TABLE notifications.notification_preferences
  DROP CONSTRAINT IF EXISTS notification_prefs_channel_check;
ALTER TABLE notifications.notification_preferences
  ADD CONSTRAINT notification_prefs_channel_check
    CHECK (channel IN ('email', 'whatsapp'));

ALTER TABLE notifications.notifications
  DROP CONSTRAINT IF EXISTS notifications_channel_check;
ALTER TABLE notifications.notifications
  ADD CONSTRAINT notifications_channel_check
    CHECK (channel IN ('email', 'whatsapp'));
