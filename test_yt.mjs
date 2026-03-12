import https from "https";
import fs from "fs";

const req = https.request(
    "https://www.googleapis.com/youtube/v3/search?part=snippet&q=hello&maxResults=2&key=YOUR_API_KEY",
    { method: "GET" },
    (res) => {
        let body = "";
        res.on("data", chunk => body += chunk);
        res.on("end", () => fs.writeFileSync("test_youtube.log", `Status: ${res.statusCode} Body: ${body}`));
    }
);
req.end();
