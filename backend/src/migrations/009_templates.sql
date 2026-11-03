-- Note templates (docs/plantillas.md): the shape of a note, reused when
-- creating another. Personal (group_id NULL) or of a group.

CREATE TABLE IF NOT EXISTS note_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Who made it. A personal template is deleted with its account; a group one
  -- stays in the group without a creator.
  owner_id uuid REFERENCES users(id) ON DELETE SET NULL,
  group_id uuid REFERENCES groups(id) ON DELETE CASCADE,
  name text NOT NULL,
  emoji text NOT NULL,
  categories text[] NOT NULL DEFAULT '{}',
  card_color text,
  -- Names of the extra people who score ("Nota adicional").
  people text[] NOT NULL DEFAULT '{}',
  -- [{ type, label, value }] with only the shape kept (criteria names, price
  -- currency...); see routes/templates.js.
  fields jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_note_templates_owner ON note_templates(owner_id) WHERE group_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_note_templates_group ON note_templates(group_id);
