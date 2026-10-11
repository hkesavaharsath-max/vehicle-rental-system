CREATE DATABASE IF NOT EXISTS vehicle_rental_db;
USE vehicle_rental_db;

CREATE TABLE IF NOT EXISTS vehicles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL,
  registration_no VARCHAR(30) NOT NULL UNIQUE,
  price_per_day DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_name VARCHAR(100) NOT NULL,
  customer_email VARCHAR(150) NOT NULL,
  vehicle_id INT NOT NULL,
  pickup_date DATE NOT NULL,
  return_date DATE NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  status ENUM('Booked','Cancelled','Completed') DEFAULT 'Booked',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_booking_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
  CONSTRAINT chk_booking_dates CHECK (return_date > pickup_date)
);

INSERT IGNORE INTO vehicles (name, category, registration_no, price_per_day, image_url, description) VALUES
('Hyundai Creta', 'SUV', 'TN01AB1001', 2800, 'https://images.unsplash.com/photo-1606152421802-db97b9c7a11b?auto=format&fit=crop&w=900&q=80', 'Comfortable SUV for city and highway trips.'),
('Maruti Swift', 'Hatchback', 'TN01AB1002', 1500, 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=80', 'Compact and fuel-friendly city car.'),
('Honda City', 'Sedan', 'TN01AB1003', 2200, 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=900&q=80', 'Smooth sedan with a spacious cabin.'),
('Royal Enfield Classic', 'Bike', 'TN01AB1004', 900, 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=900&q=80', 'Classic motorcycle for weekend rides.');