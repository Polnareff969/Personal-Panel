const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const cors = require('cors'); 

dotenv.config();

const app = express();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Middleware
app.use(cors()); 
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// --- ULTIMATO SCRIPT API (For Termux) ---
app.post('/api', async (req, res) => {
    const { api_key, action, username, password, hwid, key } = req.body;

    if (api_key !== process.env.MY_PANEL_SECRET) {
        return res.send("INVALID_API_KEY");
    }

    // LOGIN ACTION
    if (action === 'login') {
        const { data: user } = await supabase
            .from('users')
            .select('*')
            .eq('username', username)
            .eq('password', password)
            .single();

        if (!user) return res.send("INVALID_CREDENTIALS");
        if (user.hwid && user.hwid !== hwid) return res.send("HWID_MISMATCH");

        if (!user.hwid) {
            await supabase.from('users').update({ hwid }).eq('username', username);
        }

        return res.send("LOGIN_SUCCESS|FULL");
    }

    // REDEEM KEY ACTION
    if (action === 'redeem_key') {
        const { data: validKey } = await supabase
            .from('keys')
            .select('*')
            .eq('key_id', key)
            .eq('status', false) // status false = unused
            .single();

        if (!validKey) return res.send("INVALID_KEY");

        // Create the user
        const { error: userError } = await supabase
            .from('users')
            .insert([{ username, password, hwid, role: 'FULL' }]);

        if (userError) return res.send("USER_EXISTS");

        // Mark key as used (checked)
        await supabase.from('keys').update({ status: true }).eq('key_id', key);
        return res.send("REDEEM_SUCCESS");
    }
});

// --- DASHBOARD API (For index.html) ---
app.get('/api/stats', async (req, res) => {
    try {
        const { count: userCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
        const { count: keyCount } = await supabase.from('keys').select('*', { count: 'exact', head: true }).eq('status', false);
        
        // Fetch logs (Ensuring 'logs' table exists in your Supabase)
        const { data: recentLogs } = await supabase.from('logs').select('*').order('created_at', { ascending: false }).limit(10);

        res.json({ 
            userCount: userCount || 0, 
            keyCount: keyCount || 0, 
            recentLogs: recentLogs || [] 
        });
    } catch (err) {
        res.status(500).json({ error: "DB_OFFLINE" });
    }
});

// GENERATE KEY (Manually providing the Primary Key 'id')
app.post('/api/admin/generate-key', async (req, res) => {
    const { auth, key_id } = req.body;
    
    // Check against your Render environment variable
    if (auth !== process.env.MY_PANEL_SECRET) {
        return res.status(403).json({ success: false, message: "UNAUTHORIZED" });
    }

    // Generate a unique numeric ID to satisfy Primary Key/Not-Null
    const manualId = Math.floor(Math.random() * 90000000) + 10000000;

    const { error } = await supabase.from('keys').insert([
        { 
            id: manualId,      // Satisfies Primary Key
            key_id: key_id,    // The actual License Key
            status: false      // Unused by default
        }
    ]);

    if (error) {
        console.error("Supabase Insert Error:", error.message);
        return res.status(400).json({ success: false, msg: error.message });
    }

    res.json({ success: true });
});

app.get('/health', (req, res) => res.send("ALIVE"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[SYSTEM] Backend Live on Port ${PORT}`));
