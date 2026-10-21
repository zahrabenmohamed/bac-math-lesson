-- The year's programme: chapters can exist before any lesson is written ("à venir").
ALTER TABLE chapters ADD COLUMN position INT NOT NULL DEFAULT 0;
ALTER TABLE chapters ADD COLUMN summary VARCHAR(300) NOT NULL DEFAULT '';
