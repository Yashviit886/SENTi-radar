import https from "https";
import fs from "fs";

const data = JSON.stringify({
    model: "gemini-2.0-flash",
    messages: [{ role: "user", content: "hi" }]
});

const req = https.request(
    "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    {
        method: "POST",
        headers: {
            "Authorization": "Bearer YOUR_API_KEY",
            "Content-Type": "application/json"
        }
    },
    (res) => {
        let body = "";
        res.on("data", chunk => body += chunk);
        res.on("end", () => fs.writeFileSync("success.log", `Status: ${res.statusCode} Body: ${body}`));
    }
);
req.write(data);
req.end();
