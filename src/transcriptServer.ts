import http from "http";
import fs from "fs";
import path from "node:path";
import zlib from "zlib";
import { randomUUID } from "crypto";

// Directory where transcripts will be stored
const transcriptsDir = path.join(__dirname, "../transcripts");
fs.mkdirSync(transcriptsDir, { recursive: true });

function escapeHtml(str: string) {
	return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const server = http.createServer((req, res) => {
	if (!req.url) {
		res.statusCode = 400;
		return res.end("Bad request");
	}

	if (req.method === "POST" && req.url.startsWith("/upload")) {
		let body = "";
		req.on("data", (chunk) => {
			body += chunk;
		});
		req.on("end", () => {
			try {
				const json = JSON.parse(body);
				const buffer = Buffer.from(json.data);
				zlib.gunzip(buffer, (err, decompressed) => {
					if (err) {
						res.statusCode = 500;
						return res.end("Failed to decompress data");
					}
					const id = randomUUID();
					fs.writeFileSync(path.join(transcriptsDir, `${id}.json`), decompressed);
					res.setHeader("Content-Type", "application/json");
					res.end(JSON.stringify(id));
				});
			} catch {
				res.statusCode = 400;
				res.end("Invalid data");
			}
		});
		return;
	}

	if (req.method === "GET") {
		const id = req.url.slice(1);
		if (!/^[A-Za-z0-9-]+$/.test(id)) {
			res.statusCode = 404;
			return res.end("Not found");
		}
		const filePath = path.join(transcriptsDir, `${id}.json`);
		if (fs.existsSync(filePath)) {
			const raw = fs.readFileSync(filePath, "utf8");
			res.setHeader("Content-Type", "text/html; charset=utf-8");
			res.end(`<pre>${escapeHtml(raw)}</pre>`);
			return;
		}
	}

	res.statusCode = 404;
	res.end("Not found");
});

const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
server.listen(port, () => {
	console.log(`Transcript server running at http://localhost:${port}`);
});

export {};
