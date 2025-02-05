import express from 'express';
import session from 'express-session';
import mysql from 'mysql2';

const app = express();

app.use(express.json());
app.use(express.static("public"));
app.use(express.urlencoded({extended : true}));

app.use(session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: true,
}));

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "task_app"
});

db.connect((err) => {
    if (err) {
        console.log("MySQL connection error.");
    } else {
        console.log("MySQL connection successful.");
    }
});


const findUser = (mail, username, callback) => {
    const query = 'SELECT * FROM users WHERE mail = ? OR username = ?';
    db.query(query, [mail, username], (err, result) => {
        if (err) {
            console.error('Database query error:', err);
            return callback(err);
        }
        callback(null, result);
    });
};


app.post("/signup", (req, res) => {
    const { mail, username, password } = req.body;

    
    findUser(mail, username, (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'An error occurred' });
        }

        if (result.length > 0) {
            
            return res.status(400).json({ message: 'This email or username is already taken!' });
        }

        const query = 'INSERT INTO users (mail, username, password) VALUES (?, ?, ?)';
        db.query(query, [mail, username, password], (err, result) => {
            if (err) {
                return res.status(500).json({ message: 'An error occurred while adding users to the database' });
            }
            res.redirect("/login");
        });
    });
});

app.post("/login", (req, res) => {
    const { mail, password } = req.body;

    const query = 'SELECT * FROM users WHERE mail = ? AND password = ?';
    db.query(query, [mail, password], (err, result) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).json({ message: 'An error occurred' });
        }
        if (result.length > 0) {
            req.session.user = result[0];
            return res.redirect("/redirect");
        }
        res.status(400).json({ message: 'Login failed!' });
    });
});

app.get("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ message: 'An error occurred while logging out.' });
        }
        res.redirect("/login");
    });
});

app.get("/redirect", (req, res) => {
    if (!req.session.user) {
        return res.redirect("/login");
    }

    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Redirect Page</title>
            <link rel="stylesheet" href="/welcome.css">
        </head>
        <body>
            <div class="home-container">
                <img src="/image/blody.jpg" alt="Logo"> <!-- Logo -->
                <h1>Welcome to, <span id="username">${req.session.user.username}</span>!</h1> <!-- Hoş geldiniz yazısı -->
                <p>Go to the home page by clicking the button below:</p>
                <a href="/"><button type="button">Go to Home Page</button></a> <!-- Ana sayfaya git butonu -->
            </div>
        </body>
        </html>
    `);
});


app.get("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) return res.status(500).json({ message: 'An error occurred while logging out.' });

        res.redirect("/login");
    });
});

app.get("/", (req, res) => {
    if (!req.session.user) {
        return res.redirect("/login");
    }

    const query = 'SELECT * FROM tasks WHERE user_id = ?'; 
    db.query(query, [req.session.user.id], (err, tasks) => {
        if (err) {
            console.error('Veritabanı sorgu hatası:', err);
            return res.status(500).json({ message: 'An error occurred while receiving tasks' });
        }

        let taskHtml = tasks.map(task => {
            return `
                <div class="task">
                    <p>${task.task}</p>
                    <form action="/delete-task" method="POST">
                        <input type="hidden" name="taskId" value="${task.id}">
                        <button type="submit" id="delete">Completed</button>
                    </form>
                </div>
            `;
        }).join('');

        res.send(`
            <!DOCTYPE html>
            <html lang="tr">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>MyTasks - Ana Sayfa</title>
                <link rel="stylesheet" href="add-task.css">
            </head>
            <body>
                <nav class="navbar">
                    <div class="logo">MyTasks</div>
                    <div class="nav-links">
                        <a href="/">Home</a>
                        <a href="/new-tasks">New Task</a>
                        <a href="/logout" class="logout">Logout</a>
                    </div>
                </nav>

                <main class="container">
                    <h1 class="title">My Tasks</h1>

                    <div id="tasks">
                        ${taskHtml} <!-- Dinamik olarak görevleri buraya yazdırıyoruz -->
                    </div>
                </main>
            </body>
            </html>
        `);
    });
});


app.post("/delete-task", (req, res) => {
    const { taskId } = req.body;

    if (!taskId) {
        return res.status(400).json({ message: "Task ID is required!" }); 
    }

    const query = 'DELETE FROM tasks WHERE id = ?'; 
    db.query(query, [taskId], (err, result) => {
        if (err) {
            return res.status(500).json({ message: "Error while deleting task" });
        }
        res.redirect("/"); 
    });
});



app.post("/new-tasks", (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ message: "Please log in!" });
    }

    const { task } = req.body;
    
    if (!task || task.trim() === "") {
        return res.status(400).json({ message: "Task cannot be empty!" });
    }

    const query = 'INSERT INTO tasks (task, user_id) VALUES (?, ?)';
    db.query(query, [task, req.session.user.id], (err, result) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ message: "An error occurred while adding a task" });
        }
        res.redirect("/");
    });
});

app.get("/new-tasks", (req,res) => {
    if (!req.session.user) {
        return res.redirect("/login");
    };
    res.send(`
        <!DOCTYPE html>
        <html lang="tr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Yeni Görev Ekle</title>
            <link rel="stylesheet" href="add-task.css">
        </head>
        <body>
            <nav class="navbar">
                <div class="logo">MyTasks</div>
                <div class="nav-links">
                    <a href="/">Home</a>
                    <a href="/new-tasks">New Task</a>
                    <a href="/logout" class="logout">Logout</a>
                </div>
            </nav>

            <main class="container">
                <h1 class="title">Add new task</h1>
                <form action="/new-tasks" method="POST">
                    <input type="text" id="task-input" name="task" placeholder="New task name" required>
                    <button type="submit">Add Task</button>
                </form>
            </main>

            <script src="new-task.js"></script>
        </body>
        </html>
    `);
});


app.get("/login", (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Login Page</title>
        <link rel="stylesheet" href="/login-page/black/style.css">
    </head>
    <body>
        <div class="login-container">
            <div class="left-section">
                <img src="/image/blody.jpg" alt="Logo">
                <h2>Let's start reflecting your thoughts on blogs.</h2>
                <p>It's great to have you here, go explore the blogosphere.</p>
                <div class="arrow">➜</div>
            </div>
            <div class="right-section">
                <h1>LOGIN</h1>
                <form action="/login" method="POST">
                    <input type="email" name="mail" id="mail" placeholder="Email">
                    <input type="password" name="password" id="password" placeholder="Password">
                    <button type="submit">LOGIN</button>
                    <p>Not yet registered? <a href="/signup">Sign up here</a></p>
                    <a href="/forgot-password" class="forgot">Forgot Password?</a>
                </form>
            </div>
        </div>
    </body>
    </html>
    `);
});

app.get("/signup", (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Sign Up Page</title>
        <link rel="stylesheet" href="/signup-page/black/style.css">
    </head>
    <body>
        <div class="signup-container">
            <div class="left-section">
                <img src="/image/blody.jpg" alt="Logo">
                <h2>Join us today</h2>
                <p>Start your journey with us, it's easy and free!</p>
                <div class="arrow">➜</div>
            </div>
            <div class="right-section">
                <h1>SIGN UP</h1>
                <form action="/signup" method="POST">
                    <input type="email" name="mail" id="mail" placeholder="Email">
                    <input type="text" name="username" id="username" placeholder="Username">
                    <input type="password" name="password" id="password" placeholder="Password">
                    <button type="submit">SIGN UP</button>
                    <p>Already have an account? <a href="/login" class="login-link">Login here</a></p>
                </form>
            </div>
        </div>
    </body>
    </html>
    `);
});

app.listen(3000, () => {
    console.log("Server is online");
});
