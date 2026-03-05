-- Fix encoding issues in the blog database
-- This script converts incorrectly stored UTF-8 data back to proper UTF-8

-- First, let's check the current database encoding
SHOW SERVER_ENCODING;
SHOW CLIENT_ENCODING;

-- Update all text columns in posts table
UPDATE posts
SET 
    title = CONVERT_FROM(CONVERT_TO(title, 'LATIN1'), 'UTF8'),
    content = CONVERT_FROM(CONVERT_TO(content, 'LATIN1'), 'UTF8'),
    summary = CONVERT_FROM(CONVERT_TO(summary, 'LATIN1'), 'UTF8')
WHERE title ~ '[^\x00-\x7F]' OR content ~ '[^\x00-\x7F]' OR summary ~ '[^\x00-\x7F]';

-- Update tags array
UPDATE posts
SET tags = ARRAY(
    SELECT CONVERT_FROM(CONVERT_TO(tag, 'LATIN1'), 'UTF8')
    FROM UNNEST(tags) AS tag
)
WHERE EXISTS (
    SELECT 1 FROM UNNEST(tags) AS tag WHERE tag ~ '[^\x00-\x7F]'
);

-- Update mood if it contains non-ASCII characters
UPDATE posts
SET mood = CONVERT_FROM(CONVERT_TO(mood, 'LATIN1'), 'UTF8')
WHERE mood ~ '[^\x00-\x7F]';

-- Update comments table
UPDATE comments
SET 
    author_name = CONVERT_FROM(CONVERT_TO(author_name, 'LATIN1'), 'UTF8'),
    content = CONVERT_FROM(CONVERT_TO(content, 'LATIN1'), 'UTF8')
WHERE author_name ~ '[^\x00-\x7F]' OR content ~ '[^\x00-\x7F]';

-- Update persona table
UPDATE persona
SET name = CONVERT_FROM(CONVERT_TO(name, 'LATIN1'), 'UTF8')
WHERE name ~ '[^\x00-\x7F]';

-- Update agent_status table
UPDATE agent_status
SET current_task = CONVERT_FROM(CONVERT_TO(current_task, 'LATIN1'), 'UTF8')
WHERE current_task ~ '[^\x00-\x7F]';

-- Verify the fix
SELECT id, title, LEFT(content, 50) as content_preview FROM posts LIMIT 5;
