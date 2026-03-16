export default async function handler(req, res) {
    // 1. Domain Configuration
    const allowedDomain = "https://truecaller-web.pages.dev";
    const requester = req.headers.referer || req.headers.origin;

    // 2. Domain Lock / Referral System
    // This strictly checks if the request is coming from your specific pages.dev domain
    if (!requester || !requester.startsWith(allowedDomain)) {
        res.setHeader('Content-Type', 'application/json');
        return res.status(403).json({
            status: "Error",
            message: "Unauthorized Access: Domain Locked.",
            allowed_at: allowedDomain
        });
    }

    // 3. Set Security Headers
    res.setHeader('Access-Control-Allow-Origin', allowedDomain);
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // 4. Extract Parameters
    const { number } = req.query;
    const apiKey = "ftgmxtcaller"; // Hardcoded for security in the backend

    if (!number) {
        return res.status(400).json({ error: "Phone number is required." });
    }

    try {
        // 5. Fetch from your Cloudflare Worker
        const apiUrl = `https://faisal-ali-truecaller.ftgmhacks.workers.dev/?number=${encodeURIComponent(number)}&key=${apiKey}`;
        
        const response = await fetch(apiUrl);
        const data = await response.json();

        // 6. Final Response with Credits & Formatting
        const output = {
            success: true,
            credits: {
                developer: "Rana Faisal Ali",
                brand: "FTGM HTML BOSS",
                main_site: "https://ftgmtools.pages.dev",
                telegram: "https://t.me/FTGMHACKS",
                youtube: "https://youtube.com/@ftgmtech"
            },
            result: data
        };

        // Send Pretty JSON (4 spaces)
        return res.status(200).send(JSON.stringify(output, null, 4));

    } catch (err) {
        return res.status(500).json({ 
            error: "Internal Server Error", 
            message: err.message 
        });
    }
          }
