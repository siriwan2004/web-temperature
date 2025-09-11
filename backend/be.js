<<<<<<< HEAD
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
=======
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const WebSocket = require('ws');
const mongoose = require('mongoose');

const app = express();
const port = 3000;

// สร้าง WebSocket server
const wss = new WebSocket.Server({ port: 3001 });

app.use(cors());
app.use(bodyParser.json());

// ====== เชื่อมต่อ MongoDB Atlas ======
const uri = "mongodb+srv://webtempdb:Puttharasu24@webtemp.zsolxoc.mongodb.net/temperatureDB?retryWrites=true&w=majority&appName=webtemp";
// ↑ เพิ่มชื่อ database ชัดเจน เช่น temperatureDB

mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

// ====== สร้าง Schema และ Model ======
const temperatureSchema = new mongoose.Schema({
>>>>>>> b595fe9b3ef5c5720350e10fa666c047c01ac1ac
  temperature: Number,
  humidity: Number,
  timestamp: { type: Date, default: Date.now }
});
<<<<<<< HEAD
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
=======

const Temperature = mongoose.model("Temperature", temperatureSchema);

// ====== HTTP endpoint สำหรับรับข้อมูลจาก ESP32 ======
app.post('/temperature', async (req, res) => {
  const data = req.body;
  console.log('Received:', data);

  try {
    // บันทึกข้อมูลลง MongoDB
    const newData = new Temperature({
      temperature: data.temperature,
      humidity: data.humidity
    });
    await newData.save();

    // ส่งข้อมูลไปยัง WebSocket clients
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });

    res.send('OK');
  } catch (err) {
    console.error("❌ Error saving to MongoDB:", err);
    res.status(500).send("Error saving data");
  }
});

// ====== HTTP endpoint สำหรับให้ Frontend เรียกดูข้อมูล ======
app.get('/temperature', async (req, res) => {
  try {
    // ดึงข้อมูลล่าสุด 20 records
    const data = await Temperature.find().sort({ timestamp: -1 }).limit(20);
    res.json(data);
  } catch (err) {
    console.error("❌ Error fetching data:", err);
    res.status(500).send("Error fetching data");
  }
});

app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});

wss.on('listening', () => {
  console.log('WebSocket server listening on port 3001');
});
>>>>>>> b595fe9b3ef5c5720350e10fa666c047c01ac1ac
