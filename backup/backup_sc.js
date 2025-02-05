const express = require('express');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());

const SECRET_KEY = "123456789"; // Burayı rastgele bir şey yapabilirsin

// Kullanıcı giriş yaparsa ona JWT ver
app.post('/login', (req, res) => {
    const { username } = req.body;

    if (!username) {
        return res.status(400).json({ message: "Kullanıcı adı gerekli!" });
    }

    // Kullanıcıya özel bir token oluştur
    const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: "1h" });

    res.json({ token }); // Token'ı dönüyoruz
});

// Token doğrulama middleware
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']; // Header'dan token'ı al

    if (!token) {
        return res.status(403).json({ message: "Token gerekli!" });
    }

    try {
        const decoded = jwt.verify(token, SECRET_KEY); // Token'ı doğrula
        req.user = decoded; // Kullanıcı bilgilerini sakla
        next(); // Devam et
    } catch (err) {
        return res.status(403).json({ message: "Geçersiz token!" });
    }
};

// Korunan bir sayfa
app.get('/secret', verifyToken, (req, res) => {
    res.json({ message: `Hoş geldin ${req.user.username}, burası gizli bir sayfa!` });
});

app.listen(3000, () => console.log("Server çalışıyor, http://localhost:3000"));
