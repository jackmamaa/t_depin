-- users table
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `wallet_address` VARCHAR(255),
  `faucet_claimed` TEXT,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_wallet_address` (`wallet_address`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- deposits table
CREATE TABLE IF NOT EXISTS `deposits` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `wallet_address` VARCHAR(255),
  `network` VARCHAR(50),
  `name` VARCHAR(255),
  `tx_hash` VARCHAR(128),
  `deposit_id` VARCHAR(255),
  `amount` VARCHAR(255),
  `expiration` BIGINT,
  `allocation_id` VARCHAR(255),
  `state` VARCHAR(50),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_wallet_deposit` (`wallet_address`, `deposit_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- instances table
CREATE TABLE IF NOT EXISTS `instances` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `wallet_address` VARCHAR(255),
  `network` VARCHAR(50),
  `name` VARCHAR(255),
  `allocation_id` VARCHAR(255),
  `agreement_id` VARCHAR(255),
  `activity_id` VARCHAR(255),
  `provider_id` VARCHAR(255),
  `capabilities` JSON,
  `image_tag` VARCHAR(255),
  `expiration` BIGINT,
  `vpn_id` VARCHAR(255),
  `services` JSON,
  `ipv4_address` VARCHAR(255),
  `state` VARCHAR(50),
  `endpoint` TEXT,
  `details` TEXT,
  `configure` JSON,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- launch_scripts table
CREATE TABLE IF NOT EXISTS `launch_scripts` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `wallet_address` VARCHAR(255),
  `network` VARCHAR(50),
  `name` VARCHAR(255),
  `script_id` VARCHAR(255),
  `content` TEXT,
  `updated_at` BIGINT,
  `tags` VARCHAR(255),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ssh_keys table
CREATE TABLE IF NOT EXISTS `ssh_keys` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `wallet_address` VARCHAR(255),
  `network` VARCHAR(50),
  `name` VARCHAR(255),
  `key_id` VARCHAR(255),
  `public_key` TEXT,
  `private_key` TEXT,
  `created_at` BIGINT,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- vpns table
CREATE TABLE IF NOT EXISTS `vpns` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `wallet_address` VARCHAR(255),
  `network` VARCHAR(50),
  `name` VARCHAR(255),
  `vpn_id` VARCHAR(255),
  `created_at` BIGINT,
  `cidr` VARCHAR(255),
  `state` VARCHAR(50),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4; 