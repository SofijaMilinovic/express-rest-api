# Express REST API

This is a simple REST API for managing users and tasks, built with Node.js, Express, and MySQL.

---

## Installation

1. Clone the repository using SSH:

```bash
git clone git@github.com:SofijaMilinovic/express-rest-api.git
cd express-rest-api
```
2. Install dependencies:

npm install


3. Create a .env file in the root folder and add your database credentials and session key:
DB_HOST=localhost
DB_USER=username
DB_PASSWORD=Sofija123!
DB_NAME=expressapp
SESSION_SECRET=sessionKey123

4. Start the server using Node.js:

node index.js

5. The server will run at:

http://localhost:3000

6. Run schema.sql to create the database and tables and initial data