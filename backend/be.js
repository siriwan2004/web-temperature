const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const WebSocket = require('ws');
const mongoose = require('mongoose'); // เพิ่ม mongoose

const app = express();
const port = 3000;

// สร้าง WebSocket server
const wss = new WebSocket.Server({ port: 3001 });

app.use(cors());
app.use(bodyParser.json());

// ====== เชื่อมต่อ MongoDB Atlas ======
const uri = "mongodb+srv://webtempdb:Puttharasu24@webtemp.zsolxoc.mongodb.net/?retryWrites=true&w=majority&appName=webtem";

mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

// ====== สร้าง Schema และ Model ======
const temperatureSchema = new mongoose.Schema({
  temperature: Number,
  humidity: Number,
  timestamp: { type: Date, default: Date.now }
});

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

app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});

wss.on('listening', () => {
  console.log('WebSocket server listening on port 3001');
});
