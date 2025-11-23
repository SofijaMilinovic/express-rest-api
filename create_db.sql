CREATE DATABASE IF NOT EXISTS expressapp;
USE expressapp;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    firstName VARCHAR(50) NOT NULL,
    lastName VARCHAR(50) NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('basic', 'admin') NOT NULL DEFAULT 'basic'
);

CREATE TABLE IF NOT EXISTS tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    body VARCHAR(100) NOT NULL,
    createdDate DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    userId INT NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id)
);

INSERT INTO users (id, firstName, lastName, username, email, password, role) VALUES
(1, 'Sofija', 'Milinovic', 'sofija', 'sofija@example.com', '$2b$10$R0YrmTu2P37nr2Manfeoxe323jADbagikX0YEsH2tKRDO6T55ueRq', 'basic'),
(2, 'Joca', 'Jocic', 'admin', 'admin@example.com', '$2b$10$5W6wyTl1/4PLznDXuCLAee.pTXWImcGU6Ku.q4sVeP9efWnnsOcVK', 'admin'),
(3, 'Pera', 'Peric', 'pera', 'pera@example.com', '$2b$10$WhPjoVV7l0r3PyYtTHF1E.3Oh55.zDDLGU5BWhl66wrItIQgLV1Ka', 'basic')
ON DUPLICATE KEY UPDATE id=id;

INSERT INTO tasks (body, userId) VALUES
('Task 1 for Sofija', 1),
('Task 2 for Sofija', 1);

INSERT INTO tasks (body, userId) VALUES
('Task 1 for Pera', 3),
('Task 2 for Pera', 3),
('Task 3 for Pera', 3);
