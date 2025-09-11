const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const WebSocket = require("ws");

const app = express();
app.use(cors());
app.use(express.json()); // ต้องมีเพื่อ parse JSON body

// ===== เชื่อม MongoDB Atlas =====
mongoose.connect(
  "mongodb+srv://webtempdb:Puttharasu24@webtemp.zsolxoc.mongodb.net/?retryWrites=true&w=majority&appName=webtemp",
  { useNewUrlParser: true, useUnifiedTopology: true }
).then(() => console.log("✅ MongoDB Atlas connected"))
  .catch(err => console.error("❌ MongoDB error:", err));

// ===== Schema & Model =====
const tempSchema = new mongoose.Schema({
  temperature: Number,
  humidity: Number,
  timestamp: { type: Date, default: Date.now }
});
const TempModel = mongoose.model("Temperature", tempSchema);

// ===== Routes =====

// POST /temperature
app.post("/temperature", async (req, res) => {
  console.log("📥 Received POST /temperature:", req.body);

  const { temperature, humidity } = req.body;

  if (temperature === undefined || humidity === undefined) {
    console.warn("⚠️ Missing temperature or humidity in POST body");
    return res.status(400).json({ success: false, message: "Missing temperature or humidity" });
  }

  try {
    const data = new TempModel({ temperature, humidity });
    await data.save();

    // ส่งข้อมูลไปหา clients ทุกตัวผ่าน WebSocket
    const payload = JSON.stringify({ temperature, humidity, timestamp: data.timestamp });
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });

    console.log("✅ Saved to MongoDB Atlas:", payload);
    res.json({ success: true, message: "Saved to MongoDB Atlas", data: payload });
  } catch (err) {
    console.error("❌ Error saving data:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /temperature (ย้อนหลัง 20 ค่า)
app.get("/temperature", async (req, res) => {
  try {
    const data = await TempModel.find().sort({ timestamp: -1 }).limit(20);
    res.json(data);
  } catch (err) {
    console.error("❌ Error fetching data:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===== สร้าง HTTP + WebSocket Server =====
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on("connection", ws => {
  console.log("🌐 WebSocket client connected");
});

server.listen(3000, '0.0.0.0', () => console.log("🚀 Backend running on port 3000 (HTTP + WS)"));
