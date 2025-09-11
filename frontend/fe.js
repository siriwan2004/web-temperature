<<<<<<< HEAD
// frontend.js
=======
>>>>>>> b595fe9b3ef5c5720350e10fa666c047c01ac1ac
const express = require("express");
const path = require("path");
const app = express();

<<<<<<< HEAD
const PUBLIC_DIR = path.join(__dirname, "public");

// เสิร์ฟไฟล์ static ใน public/
app.use(express.static(PUBLIC_DIR));

// ถ้ารีเควสต์ / แล้วไม่เจอไฟล์ ให้ส่ง index.html
app.get("/", (_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

app.listen(4000, "0.0.0.0", () => {
  console.log("Frontend running on 0.0.0.0:4000");
});
=======
app.use(express.static(path.join(__dirname, "public")));

app.listen(4000, () => console.log("Frontend running on port 4000"));
>>>>>>> b595fe9b3ef5c5720350e10fa666c047c01ac1ac
