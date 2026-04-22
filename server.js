import express from 'express';
import { createClient } from 'redis';
import pkg from 'pg';
const { Pool } = pkg;
import { GoogleGenAI } from '@google/genai';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const app = express();
app.use(express.json());
app.use(express.static('public')); // Serves the HTML, CSS, and JS files

// ==========================================
// 1. SYSTEM INITIALIZATION
// ==========================================
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// PostgreSQL Connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Required for cloud databases
});

// ==========================================
// ==========================================
// Redis Connection - Robust Cloud Version
// ==========================================
const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
    console.error("⚠️ WARNING: REDIS_URL environment variable is missing!");
}

const redisClient = createClient({
    url: redisUrl,
    socket: {
        // Only enforce TLS if the URL starts with rediss://
        tls: redisUrl ? redisUrl.startsWith('rediss://') : false,
        rejectUnauthorized: false 
    }
});

// Safety net: Prevents the whole app from crashing if Redis blinks
redisClient.on('error', (err) => console.error('Redis Connection Error:', err));

await redisClient.connect().catch(console.error);

// ==========================================
// 2. SECURITY CONFIGURATION (NGO PORTAL)
// ==========================================
const JWT_SECRET = 'agricache_secret_2026';

// Security Bouncer (Middleware)
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Extract token from "Bearer <token>"

    if (!token) return res.status(403).json({ error: 'Access Denied: No Security Token Provided.' });

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ error: 'Access Denied: Token Invalid or Expired.' });
        req.ngoData = decoded; // Attach verified data to the request
        next(); // Allow them through
    });
};

// ==========================================
// 3. FARMER PORTAL ROUTE (AI & CACHE)
// ==========================================
app.post('/api/analyze', async (req, res) => {
    // SECURITY FIX: .trim() prevents invisible spaces like "Patna " from breaking the DB query
    const farmerQuery = req.body.farmerQuery ? req.body.farmerQuery.trim() : "";
    const location = req.body.location ? req.body.location.trim() : "";
    const cacheKey = `query:${location}:${farmerQuery}`;

    try {
        // A. Check Redis Cache First (Speed USP)
        const cachedResult = await redisClient.get(cacheKey);
        if (cachedResult) {
            console.log("⚡ Served via Redis Cache");
            return res.json({ source: 'redis_cache', data: JSON.parse(cachedResult) });
        }

        // B. Query Local DB for Available Supplies
        const dbResult = await pool.query('SELECT * FROM local_supplies WHERE location = $1', [location]);
        const localData = dbResult.rows.length ? JSON.stringify(dbResult.rows) : "No local supplies listed.";

        // C. Process with Gemini AI (Extracting Hub & Contact)
        const prompt = `You are an agricultural expert system. A farmer in ${location} asks: "${farmerQuery}". 
        Local supply data available: ${localData}.

        Provide a short, actionable 3-step solution. 

        You MUST reply ONLY with a valid JSON object. Do not use markdown blocks. Use this EXACT template:
        {
          "issue_detected": "Name of the disease or issue",
          "urgency_level": 4,
          "action_steps": [
            "Step 1...",
            "Step 2...",
            "Step 3..."
          ],
          "recommended_hub": "Provider Name | Contact Info"
        }
        
        CRITICAL RULE FOR "recommended_hub": If the local supply data has a matching medicine/tool, you MUST combine the provider_name and contact_info here (e.g. "Kisan Kendra Patna | +91-9876543210"). If there are zero matches, output "None".`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        // Clean up the text response and safely parse JSON
        const rawText = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
        
        let aiResult;
        try {
            aiResult = JSON.parse(rawText);
        } catch (parseError) {
            console.error("AI JSON Parsing Error:", rawText);
            return res.status(500).json({ error: 'AI returned malformed data. Please try again.' });
        }

        // D. Store in Cache (Expires in 12 hours)
        await redisClient.setEx(cacheKey, 43200, JSON.stringify(aiResult));

        // E. Return to Client
        res.json({ source: 'gemini_api', data: aiResult });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Processing failed. Check your API key and database connection.' });
    }
});

// ==========================================
// 4. NGO PORTAL ROUTES (SECURE ADMIN)
// ==========================================
// Login Route -> Checks DB and Generates the JWT Token
app.post('/api/ngo/login', async (req, res) => {
    // 1. Extract credentials from the request body
    const { username, password } = req.body;
    
    try {
        // 2. Search for the user in the PostgreSQL database
        const userResult = await pool.query('SELECT * FROM ngo_accounts WHERE username = $1', [username]);
        const user = userResult.rows[0];

        // 3. SECURITY CHECK: Validate existence and password
        // We use || to check the plain text 'hack2skill2026' OR the Bcrypt hash
        if (user && (password === 'hack2skill2026' || bcrypt.compareSync(password, user.password_hash))) {
            
            // 4. AUTHENTICATION SUCCESS: Create a JWT "Passport"
            const token = jwt.sign(
                { 
                    role: 'verified_ngo', 
                    username: user.username,
                    location: user.location 
                }, 
                JWT_SECRET, 
                { expiresIn: '2h' }
            );

            // 5. Send success response with the token
            res.json({ success: true, token: token });
            console.log(`[AUTH SUCCESS] NGO logged in: ${user.username}`);

        } else {
            // 6. AUTHENTICATION FAIL: Wrong user or password
            res.status(401).json({ success: false, error: 'Unauthorized: Invalid Credentials' });
        }
    } catch (err) {
        // 7. SYSTEM ERROR: Database connection issue
        console.error("Login DB Error:", err);
        res.status(500).json({ error: "Authentication system error" });
    }
});

// Protected Update Route -> Requires JWT Token
app.post('/api/ngo/update', verifyToken, async (req, res) => {
    const { resource_type, quantity } = req.body;
    const ngoName = req.ngoData.username;
    const ngoLocation = req.ngoData.location;
    
    try {
        // ACTUALLY UPDATE THE DATABASE SO THE AI CAN SEE THE NEW SUPPLIES
        await pool.query(
            `INSERT INTO local_supplies (provider_name, location, resource_type, quantity, contact_info) 
             VALUES ($1, $2, $3, $4, $5)`,
            [ngoName, ngoLocation, resource_type, quantity, 'Update via secure portal']
        );

        console.log(`[SECURE LOG] Database successfully updated by ${ngoName} in ${ngoLocation}`);
        res.json({ success: true, message: `Securely updated database: ${quantity} of ${resource_type} added to logistics network.` });

    } catch (err) {
        console.error("Database Update Error:", err);
        res.status(500).json({ success: false, error: "Failed to update logistics network." });
    }
});

// ==========================================
// START SERVER
// ==========================================
// ==========================================
// START SERVER
// ==========================================
// Must use process.env.PORT for Render cloud deployment
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 AgriCache API running on port ${PORT}`);
});