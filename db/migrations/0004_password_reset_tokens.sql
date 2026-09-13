-- Stores one-time password reset tokens. Token values are never stored in plaintext.

CREATE TABLE password_reset_tokens (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT password_reset_tokens_token_hash_not_blank CHECK (length(btrim(token_hash)) > 0),
  CONSTRAINT password_reset_tokens_expiry_after_creation CHECK (expires_at > created_at)
);

CREATE INDEX password_reset_tokens_user_created_at_index
  ON password_reset_tokens (user_id, created_at DESC);

CREATE INDEX password_reset_tokens_active_expiry_index
  ON password_reset_tokens (expires_at)
  WHERE used_at IS NULL;
