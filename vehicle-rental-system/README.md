# RideReady — Vehicle Rental Booking System

A full-stack student project built with HTML, CSS, JavaScript, Node.js, Express.js and MySQL.

## Features
- Vehicle listing and date-based availability checks
- Booking form with server-side price calculation
- Prevents overlapping active bookings
- Booking records and cancellation
- Admin demo form to add and delete vehicles (delete API only; UI focuses on adding)
- Responsive layout for desktop and mobile

## Requirements
Install [Node.js LTS](https://nodejs.org/) and [MySQL Community Server](https://dev.mysql.com/downloads/mysql/). Git is needed to upload the project to GitHub.

## 1. Create the database
1. Open MySQL Workbench or the MySQL command line.
2. Open and execute `database.sql`. It creates `vehicle_rental_db`, tables, and sample vehicles.

## 2. Configure the project
Open a terminal in this folder and run:

```bash
npm install
```

Copy `.env.example` to `.env` and edit the database username/password for your local MySQL installation. Do not commit `.env` to GitHub.

Windows PowerShell:
```powershell
Copy-Item .env.example .env
```

macOS/Linux:
```bash
cp .env.example .env
```

## 3. Start the app
```bash
npm start
```
Visit **http://localhost:3000**. The computer must be running the Node server and MySQL for the app to work.

If you see a database connection error, check that MySQL is running, the database script was executed, and `.env` contains the correct credentials.

## 4. Upload to GitHub
1. Sign in at https://github.com and create a **new empty repository** named `vehicle-rental-system`. Do not initialize it with a README, license, or .gitignore.
2. Open a terminal in this project folder.
3. Run the following commands, replacing `YOUR-USERNAME` with your GitHub username:

```bash
git init
git add .
git commit -m "Initial commit: Vehicle Rental Booking System"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/vehicle-rental-system.git
git push -u origin main
```

If Git asks you to identify yourself, run:
```bash
git config --global user.name "Your Name"
git config --global user.email "your-github-email@example.com"
```
Then repeat the commit. GitHub may open a browser to authenticate you.

## API routes
- `GET /api/health` — server/database check
- `GET /api/vehicles` — list all vehicles
- `GET /api/vehicles?pickup=YYYY-MM-DD&returnDate=YYYY-MM-DD` — available vehicles for dates
- `POST /api/vehicles` — add a vehicle
- `DELETE /api/vehicles/:id` — delete a vehicle when no bookings reference it
- `GET /api/bookings` — list bookings
- `POST /api/bookings` — create a booking
- `PATCH /api/bookings/:id/cancel` — cancel an active booking

## Notes
This is an educational demo, not production-ready rental software. Admin routes are not protected by authentication, and customer data should not be used for real transactions. Before public deployment, add authentication/authorization, CSRF and rate-limit protections, stronger validation, logging, and production database hosting. The website uses external Unsplash image URLs and Google Fonts.
