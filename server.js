const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

// --- ULTIMATO SCRIPT API ---
app.post('/api', async (req, res) => {
    const { api_key, action, username, password, hwid, key } = req.body;

    if (api_key !== process.env.MY_PANEL_SECRET) {
        return res.send("INVALID_API_KEY");
    }

    if (action === 'login') {
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('username', username)
            .eq('password', password)
            .single();

        if (error || !user) return res.send("INVALID_CREDENTIALS");
        if (user.hwid && user.hwid !== hwid) return res.send("HWID_MISMATCH");

        if (!user.hwid) {
            await supabase.from('users').update({ hwid }).eq('username', username);
        }

        await supabase.from('logs').insert([{ username, hwid, event: 'LOGIN_SUCCESS' }]);
        return res.send("LOGIN_SUCCESS|FULL");
    }

    if (action === 'redeem_key') {
        const { data: validKey } = await supabase
            .from('keys')
            .select('*')
            .eq('id', key)
            .eq('status', 'unused')
            .single();

        if (!validKey) return res.send("INVALID_KEY");

        const { error: userError } = await supabase
            .from('users')
            .insert([{ username, password, hwid, role: 'FULL' }]);

        if (userError) return res.send("USER_EXISTS");

        await supabase.from('keys').update({ status: 'used' }).eq('id', key);
        await supabase.from('logs').insert([{ username, hwid, event: 'KEY_REDEEMED' }]);

        return res.send("REDEEM_SUCCESS");
    }

    if (action === 'log_activity') {
        await supabase.from('logs').insert([{ username, hwid, event: 'ACTIVITY_PING' }]);
        return res.sendStatus(200);
    }
});

// --- DASHBOARD API ---
app.get('/api/stats', async (req, res) => {
    try {
        const { count: userCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
        const { count: keyCount } = await supabase.from('keys').select('*', { count: 'exact', head: true }).eq('status', 'unused');
        const { data: recentLogs } = await supabase.from('logs').select('*').order('created_at', { ascending: false }).limit(15);
        
        res.json({ userCount, keyCount, recentLogs });
    } catch (err) {
        res.status(500).json({ error: "DB_OFFLINE" });
    }
});

app.post('/api/admin/generate-key', async (req, res) => {
    const { auth, key_id } = req.body;
    if (auth !== process.env.MY_PANEL_SECRET) return res.status(403).send("UNAUTHORIZED");
    
    const { error } = await supabase.from('keys').insert([{ id: key_id, status: 'unused' }]);
    if (error) return res.status(400).json({ success: false });
    
    res.json({ success: true });
});

app.get('/health', (req, res) => res.send("ALIVE"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[SYSTEM] Backend listening on port ${PORT}`));
