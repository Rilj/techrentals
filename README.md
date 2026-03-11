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

📂 Project Structure
sistem-peminjaman
│
├── config
│   └── database.js
│
├── models
│   ├── User.js
│   ├── Item.js
│   └── Loan.js
│
├── routes
│   ├── authRoutes.js
│   ├── itemRoutes.js
│   ├── loanRoutes.js
│   └── adminRoutes.js
│
├── middleware
│   ├── authMiddleware.js
│   └── roleMiddleware.js
│
├── views
│   ├── login.ejs
│   ├── dashboard.ejs
│   ├── admin_dashboard.ejs
│   └── layout.ejs
│
├── public
│   └── uploads
│
├── server.js
├── package.json
└── README.md

⚙️ Installation
1️⃣ Clone Repository
git clone https://github.com/yourusername/sistem-peminjaman.git
cd sistem-peminjaman

2️⃣ Install Dependencies
npm install
npm install multer
npm install express mysql2 sequelize bcryptjs jsonwebtoken dotenv cors
npm install nodemon --save-dev

3️⃣ Configure Environment Variables

Create a .env file:

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=peminjaman_komputer
SESSION_SECRET=secret123
4️⃣ Run the Server
npm start

Server will run at:

http://localhost:5000
🔑 Default Super Admin

The system automatically creates a super admin account:

Email: superadmin@gmail.com
Password: 123456
🗄 Database

The system uses Sequelize ORM, so tables are automatically created when the server runs.

Tables:

Users

Items

Loans

📸 Screenshots

You can add screenshots here later.

Example:

Login Page
Dashboard
Admin Panel
Item Management
📜 License

This project is for educational purposes.

👨‍💻 Author

Developed by RILJ
