-- Drop order for idempotency (dev only)
DROP TABLE IF EXISTS favourites, bookings, property_photos, properties, profiles, users;

-- Users (both travelers and owners)
CREATE TABLE users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  role          ENUM('traveler','owner') NOT NULL,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Profiles (optional details)
CREATE TABLE profiles (
  user_id       INT PRIMARY KEY,
  phone         VARCHAR(30),
  city          VARCHAR(80),
  state_abbr    VARCHAR(10),
  country       VARCHAR(80),
  languages     VARCHAR(200),
  gender        VARCHAR(40),
  about         TEXT,
  avatar_url    VARCHAR(255),
  CONSTRAINT fk_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Properties listed by owners
CREATE TABLE properties (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  owner_id        INT NOT NULL,
  name            VARCHAR(120) NOT NULL,
  type            VARCHAR(60) NOT NULL, -- e.g., apartment, house
  location_city   VARCHAR(80) NOT NULL,
  location_state  VARCHAR(80),
  country         VARCHAR(80) NOT NULL,
  bedrooms        INT DEFAULT 1,
  bathrooms       DECIMAL(3,1) DEFAULT 1.0,
  capacity        INT DEFAULT 2,
  amenities       JSON,
  price_per_night DECIMAL(10,2) NOT NULL,
  description     TEXT,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_prop_city (location_city),
  INDEX idx_prop_country (country),
  CONSTRAINT fk_prop_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Property photos
CREATE TABLE property_photos (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  property_id INT NOT NULL,
  url         VARCHAR(255) NOT NULL,
  sort_order  INT DEFAULT 0,
  CONSTRAINT fk_photos_property FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Bookings
CREATE TABLE bookings (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  traveler_id  INT NOT NULL,
  property_id  INT NOT NULL,
  start_date   DATE NOT NULL,
  end_date     DATE NOT NULL,
  guests       INT DEFAULT 1,
  status       ENUM('PENDING','ACCEPTED','CANCELLED') DEFAULT 'PENDING',
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_dates CHECK (start_date < end_date),
  CONSTRAINT fk_b_trav FOREIGN KEY (traveler_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_b_prop FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  INDEX idx_booking_prop_dates (property_id, start_date, end_date)
) ENGINE=InnoDB;

-- Favourites
CREATE TABLE favourites (
  traveler_id INT NOT NULL,
  property_id INT NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (traveler_id, property_id),
  CONSTRAINT fk_fav_trav FOREIGN KEY (traveler_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_fav_prop FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
) ENGINE=InnoDB;
