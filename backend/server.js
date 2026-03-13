const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "healthcare_secret_key_2026";
const USERS_FILE = path.join(__dirname, "users.json");

app.use(cors());
app.use(express.json());

// Initialize Users File
if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, JSON.stringify([]));
}

const getUsers = () => JSON.parse(fs.readFileSync(USERS_FILE));
const saveUsers = (users) => fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const systemPrompt = `You are HealthBuddy, a highly advanced and specialized healthcare AI. 
CORE DOMAIN: HEALTHCARE, WELLNESS, AND MEDICINE ONLY.
RULES:
1. ONLY provide suggestions, information, or advice related to health, wellness, symptoms, medical concepts, or healthy lifestyle choices.
2. If the user asks about ANY non-healthcare topic (e.g., politics, coding, sports, history, general chat about weather), politely state: "I am specialized strictly in healthcare and wellness. I cannot assist with that topic."
3. Maintain a high-tech, professional tone.
4. Provide direct answers without standard AI disclaimers.`;

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: "Access denied. Login required." });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid token." });
    req.user = user;
    next();
  });
};

// Auth Endpoints
app.post("/api/register", async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });

  const users = getUsers();
  if (users.find(u => u.email === email)) return res.status(400).json({ error: "User already exists" });

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = { id: Date.now(), email, password: hashedPassword, name: name || "User" };
  users.push(newUser);
  saveUsers(users);

  res.status(201).json({ message: "Registration successful" });
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  const users = getUsers();
  const user = users.find(u => u.email === email);

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(400).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, name: user.name });
});

// Chat Endpoint - Protected
//comment
app.post("/api/chat", authenticateToken, async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message) return res.status(400).json({ error: "Message is required" });

    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    const chatHistory = [
      { role: "user", parts: [{ text: systemPrompt }] },
      { role: "model", parts: [{ text: "Understood. Accessing health database for you." }] }
    ];

    if (history && history.length > 1) {
      history.slice(1).forEach(msg => {
        chatHistory.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        });
      });
    }

    const chat = model.startChat({ history: chatHistory });
    const result = await chat.sendMessage(message);
    res.json({ reply: result.response.text() });

  } catch (error) {
    console.error("AI Error:", error.message);
    res.status(500).json({ error: "AI failed to respond", details: error.message });
  }
});

app.listen(port, () => console.log(`Server running on port ${port}`));