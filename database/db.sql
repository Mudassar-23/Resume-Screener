CREATE TABLE candidates (
    candidate_id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    phone VARCHAR(20),
    applied_position VARCHAR(100) NOT NULL,
    upload_date DATE DEFAULT CURRENT_DATE
);

INSERT INTO candidates (
    full_name,
    email,
    phone,
    applied_position,
    upload_date
)
VALUES (
    'John Doe',
    'john.doe@example.com',
    '+1 234-567-8901',
    'AI Engineer',
    '2026-07-25'
);

SELECT * FROM candidates;