-- WorkNotes - Schema MySQL
-- Ejecuta este archivo una sola vez en Railway para crear las tablas

CREATE DATABASE IF NOT EXISTS worknotes CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE worknotes;

-- Usuarios
CREATE TABLE IF NOT EXISTS users (
  id         VARCHAR(36)  PRIMARY KEY DEFAULT (UUID()),
  name       VARCHAR(100) NOT NULL,
  email      VARCHAR(150) NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Espacios de trabajo (ej: "Trabajo mesero", "Farmacia")
CREATE TABLE IF NOT EXISTS workspaces (
  id          VARCHAR(36)  PRIMARY KEY DEFAULT (UUID()),
  user_id     VARCHAR(36)  NOT NULL,
  name        VARCHAR(100) NOT NULL,
  description TEXT,
  icon        VARCHAR(10)  DEFAULT '📁',
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Categorías dentro de un espacio (ej: "Platos", "Vinos", "Procedimientos")
CREATE TABLE IF NOT EXISTS categories (
  id           VARCHAR(36)  PRIMARY KEY DEFAULT (UUID()),
  workspace_id VARCHAR(36)  NOT NULL,
  name         VARCHAR(100) NOT NULL,
  color        VARCHAR(20)  DEFAULT '#6366f1',
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

-- Tarjetas (la info que querés guardar rápido)
CREATE TABLE IF NOT EXISTS cards (
  id           VARCHAR(36)  PRIMARY KEY DEFAULT (UUID()),
  workspace_id VARCHAR(36)  NOT NULL,
  category_id  VARCHAR(36),
  title        VARCHAR(200) NOT NULL,
  description  TEXT,
  ingredients  TEXT,        -- JSON array de strings
  tags         TEXT,        -- JSON array de strings
  photo_url    VARCHAR(500),
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id)  REFERENCES categories(id) ON DELETE SET NULL
);

-- Índice para búsqueda rápida por texto
CREATE FULLTEXT INDEX IF NOT EXISTS idx_cards_search
  ON cards(title, description, ingredients, tags);
