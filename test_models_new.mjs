import https from "https";
import fs from "fs";

const req = https.request(
    "https://generativelanguage.googleapis.com/v1beta/models?key=YOUR_API_KEY",
    { method: "GET" },
    (res) => {
        let body = "";
        res.on("data", chunk => body += chunk);
        res.on("end", () => fs.writeFileSync("models_new.json", body));
    }
);
req.end();
