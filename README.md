# techrentals
schools exam

💻 Sistem Peminjaman Komputer

A web-based Computer Borrowing Management System built with Node.js, Express, MySQL, and EJS.
This system allows users to borrow computer equipment while admins manage approvals, returns, and inventory.

🚀 Features
👤 User

Login system
View available items
Borrow computer equipment
Request item return
View borrowing history

🛠 Admin

Approve or reject borrow requests
Manage users
Manage computer inventory
Approve return requests
Calculate borrowing fees and fines

👑 Super Admin

Manage admin accounts
Full access to system data

🧰 Tech Stack

Backend:
Node.js
Express.js
Sequelize ORM
MySQL

Frontend:
EJS (Embedded JavaScript Templates)
CSS

Other Packages:
express-session
bcryptjs
multer (file upload)
cors
dotenv

structure:
```
sistem-peminjaman/
├── config/           # Database & app configuration
│   └── database.js
├── middleware/         # Auth, roles, upload
│   ├── authMiddleware.js
│   ├── roleMiddleware.js
│   └── uploadMiddleware.js
├── models/             # Sequelize models
│   ├── User.js
│   ├── Item.js
│   └── Loan.js
├── public/             # Static assets
│   ├── css/
│   ├── js/
│   └── uploads/
├── routes/             # Route definitions
│   ├── authRoutes.js
│   ├── itemRoutes.js
│   ├── loanRoutes.js
│   └── adminRoutes.js
├── views/              # EJS templates
│   ├── layout.ejs
│   ├── login.ejs
│   ├── dashboard.ejs
│   ├── admin_dashboard.ejs
│   ├── superadmin.ejs
│   ├── items.ejs
│   ├── my_loans.ejs
│   └── partials/
├── .env                # Environment variables
├── .gitignore
├── package.json
├── package-lock.json
├── README.md
└── server.js           # Entry point
```
⚙️ Installation
1️⃣ Clone Repository
```
git clone https://github.com/yourusername/sistem-peminjaman.git
cd sistem-peminjaman
```

2️⃣ Install Dependencies
```
npm install
npm install multer
npm install express mysql2 sequelize bcryptjs jsonwebtoken dotenv cors
npm install nodemon --save-dev
npm install xlsx json2csv
npm install dotenv
```
3️⃣ Configure Environment Variables

Create a .env file:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=peminjaman_komputer
SESSION_SECRET=secret123
```
4️⃣ Run the Server
npm start

Server will run at:

http://localhost:5000
🔑 Default Super Admin

The system automatically creates a super admin account:

Email: superadmin@gmail.com
Password: 123456
🗄 Database
```
CREATE DATABASE peminjaman_komputer;

CREATE TABLE Users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  password VARCHAR(255),
  role ENUM('superadmin', 'admin', 'user') DEFAULT 'user',
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL
);

CREATE TABLE Items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama_barang VARCHAR(255) NOT NULL,
  kode_unit VARCHAR(255) UNIQUE NOT NULL,
  image VARCHAR(255),
  status ENUM('tersedia', 'dibooking', 'dipinjam') DEFAULT 'tersedia',
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL
);

CREATE TABLE Loans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  startDate DATETIME,
  endDate DATETIME,
  totalPrice INT DEFAULT 0,
  fine INT DEFAULT 0,
  status ENUM(
    'pending',
    'borrowed',
    'return_requested',
    'returned',
    'rejected'
  ) DEFAULT 'pending',
  UserId INT,
  ItemId INT,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,

  FOREIGN KEY (UserId) REFERENCES Users(id)
    ON DELETE SET NULL ON UPDATE CASCADE,

  FOREIGN KEY (ItemId) REFERENCES Items(id)
    ON DELETE SET NULL ON UPDATE CASCADE
);
```
Example:

Login Page
Dashboard
Admin Panel
Item Management
📜 License

This project is for educational purposes.

👨‍💻 Author

Developed by RILJ
