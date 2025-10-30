//โหลด library
require("dotenv").config();
const axios = require("axios");
const express = require('express');
//ดึง URL มาจาก process.env
const SERVER1_URL = process.env.SERVER1_URL;
const SERVER2_URL = process.env.SERVER2_URL;
const logToken = process.env.LOG_API_TOKEN;
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 8080;

//สร้างฟังก์ชัน async เพื่อเรียก API
async function fetchData1() {
  // ตรวจสอบว่า .env โหลดมาถูกหรือไม่
  if (!SERVER1_URL) {
    console.error("Error: CONFIG_SERVER_URL is not defined.");
    console.log("Did you forget to create a .env file?");
    return;
  }

  console.log(`Connecting to: ${SERVER1_URL}`);

  try {
    const response1 = await axios.get(SERVER1_URL);

    //แสดงผลข้อมูลที่ได้
    // console.log("--- Data Received ---");
    // console.log(response1.data); // .data คือส่วนเนื้อหา (body) ที่ API ส่งกลับมา
    console.log(`Successfully fetched ${response1.data.data.length} records.`);
    return response1.data.data;
  } catch (error) {
    //จัดการ Error หากเชื่อมต่อล้มเหลว
    console.error("Error fetching data:", error.message);
  }

}

function runserver2() {
  // สร้าง Header สำหรับยืนยันตัวตน
  // ใช้ object นี้ในทุก request ที่ส่งไป Server 2
  const authHeaders = {
    Authorization: `Bearer ${logToken}`,
  };
  // List/Search Records (GET)

  async function listLogs() {
    console.log("1. Testing GET /records (List/Search)");

    if (!SERVER2_URL || !logToken) {
      console.error("Missing LOG_SERVER_URL or LOG_API_TOKEN in .env");
      return;
    }

    try {
      // เวลาใช้ axios.get() เราจะส่ง config (ที่มี headers) เป็น argument ที่ 2
      const response2 = await axios.get(SERVER2_URL, {
        headers: authHeaders,
        params: {
          // ลองเพิ่ม query params ตามเอกสาร PocketBase
          page: 1,
          perPage: 5,
          sort: "-created", // เรียงจากใหม่สุด
        },
      });

      console.log("Successfully listed records:");
      console.log("Total items:", response2.data.totalItems);
      // console.log("Showing items:", response2.data.items.length);
      // console.log("First item:", response2.data.items[0]); // แสดงแค่รายการแรก
      return response2.data.items;
    } catch (error) {
      console.error("Error listing logs:", error.message);
    }
  }

  async function main() {
    await listLogs();
  }
  main();
}
// fetchData1();
// runserver2();
app.get("/configs/:droneId", async (req, res) => {
  try {
    //รับ input 'droneId' จาก URL
    // เช่น /configs/3001 droneId จะเป็น "3001"
    const { droneId } = req.params;
    const allConfigs = await fetchData1();

    //ค้นหา config เฉพาะของ drone id นั้น
    const droneConfig = allConfigs.find(
      (config) => config.drone_id == droneId
    );

    if (!droneConfig) {
      return res.status(404).json({ error: "Drone config not found" });
    }

    // กรองข้อมูลเฉพาะ field ที่โจทย์ต้องการ
    const result = {
      drone_id: droneConfig.drone_id,
      drone_name: droneConfig.drone_name,
      light: droneConfig.light,
      country: droneConfig.country,
      weight: droneConfig.weight,
    };

    //ส่ง response (JSON) กลับไป
    res.json(result);
  } catch (error) {
    // จัดการ Error หาก Server 1 มีปัญหา หรือโค้ดเราพัง
    console.error("Error fetching drone config:", error.message);
    res.status(500).json({ error: "Failed to fetch drone configuration" });
  }
});

app.get("/status/:droneId", async (req, res) => {
  try {
    //รับ input 'droneId' จาก URL
    // เช่น /configs/3001 droneId จะเป็น "3001"
    const { droneId } = req.params;
    const allConfigs = await fetchData1();

    //ค้นหา config เฉพาะของ drone id นั้น
    const droneConfig = allConfigs.find(
      (config) => config.drone_id == droneId
    );

    if (!droneConfig) {
      return res.status(404).json({ error: "Drone config not found" });
    }

    // กรองข้อมูลเฉพาะ field ที่โจทย์ต้องการ
    const result = {
      condition: droneConfig.condition,
    };

    //ส่ง response (JSON) กลับไป
    res.json(result);
  } catch (error) {
    // จัดการ Error หาก Server 1 มีปัญหา หรือโค้ดเราพัง
    console.error("Error fetching drone config:", error.message);
    res.status(500).json({ error: "Failed to fetch drone configuration" });
  }
});

app.get("/logs/:droneId", async (req, res) => {
  try {
    //รับ input 'droneId' จาก URL
    // เช่น /configs/3001 droneId จะเป็น "3001"
    const { droneId } = req.params;
    // 1. ดึงค่า page จาก query string, ถ้าไม่ส่งมาให้เป็น 1
    const page = req.query.page || 1;
    const authHeaders = {
      Authorization: `Bearer ${logToken}`,
    };
    const response = await axios.get(SERVER2_URL, {
      headers: authHeaders,
      params: {
        filter: `(drone_id = ${droneId})`,
        perPage: 12,
        sort: "-created",
        fields: 'drone_id,drone_name,created,country,celsius',
        page: page
      }
    });

    res.json(response.data.items);

  } catch (error) {
    // จัดการ Error หาก Server 1 มีปัญหา หรือโค้ดเราพัง
    console.error("Error fetching drone config:", error.message);
    res.status(500).json({ error: "Failed to fetch drone configuration" });
  }
});
/**
 * POST /logs
 * สร้าง Log ใหม่
 */
app.post("/logs", async (req, res) => {
  try {
    // 1. ดึงข้อมูลจาก Request Body (ที่ user ส่งมา)
    const { drone_id, drone_name, country, celsius } = req.body;

    // 2. กรองข้อมูลเฉพาะที่โจทย์ต้องการส่งไป Server 2
    const newLogData = {
      drone_id,
      drone_name,
      country,
      celsius
    };

    // (Optional) ตรวจสอบว่าข้อมูลจำเป็นครบหรือไม่
    if (!drone_id || !drone_name || !country || celsius === undefined) {
      return res.status(400).json({ error: 'Missing required log data' });
    }

    // 3. สร้าง Headers สำหรับ Server 2
    const authHeaders = {
      Authorization: `Bearer ${logToken}`,
      "Content-Type": "application/json"
    };

    // 4. ยิง POST ไปยัง Server 2 (Drone Log Server)
    const response = await axios.post(SERVER2_URL, newLogData, {
      headers: authHeaders
    });

    // 5. ส่งข้อมูลที่ Server 2 สร้างเสร็จ (มี id, created) กลับไป
    // ใช้ .status(201) หมายถึง "Created" (สร้างสำเร็จ)
    res.status(201).json(response.data);

  } catch (error) {
    // จัดการ Error (เช่น ส่งข้อมูลไม่ครบ หรือ Server 2 พัง)
    console.error("Error creating drone log:", error.response ? error.response.data : error.message);
    res.status(500).json({ error: "Failed to create drone log" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
