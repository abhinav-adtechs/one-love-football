-- Add new game format values for multi-team and additional formats
ALTER TYPE game_format ADD VALUE IF NOT EXISTS '9v9';
ALTER TYPE game_format ADD VALUE IF NOT EXISTS '10v10';
ALTER TYPE game_format ADD VALUE IF NOT EXISTS '6v6v6';
ALTER TYPE game_format ADD VALUE IF NOT EXISTS '7v7v7';
ALTER TYPE game_format ADD VALUE IF NOT EXISTS '8v8v8';
ALTER TYPE game_format ADD VALUE IF NOT EXISTS '9v9v9';
