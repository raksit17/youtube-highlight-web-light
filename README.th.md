# YouTube HighlightFlow (Vue 3 + Vite + TypeScript)

Frontend ธีมขาวสำหรับ Backend เดิม [youtube-highlight-api](https://github.com/raksit17/youtube-highlight-api)

## เริ่มใช้งาน

Node.js แนะนำ 22.12+ (เครื่อง Windows ใช้ Node 22.23.x ได้)

```bat
cd youtube-highlight-web
copy .env.example .env
npm install
npm run dev
```

เปิด `http://localhost:5173`

ค่าเริ่มต้น `VITE_DEMO_MODE=true` จะแสดงวิดีโอตัวอย่าง YouTube และ *ข้อมูลสถิติ/แชตจำลอง* ทั้งหมด การ Approve/Reject และบันทึก Clip Draft ใน Demo เก็บใน `localStorage` ของเบราว์เซอร์เท่านั้น ไม่ได้ส่งไป NestJS

## เชื่อมต่อ Backend จริง

แก้ `.env` เป็น

```env
VITE_DEMO_MODE=false
VITE_API_URL=http://localhost:3001/api/v1
```

Backend `youtube-highlight-api` ล่าสุดมี Videos, Candidates, Heatmap, Context, Review และ Clip Draft API แล้ว ให้รัน migrations และเปิด CORS ก่อนเชื่อมต่อ ส่วน Re-analyze Job API ยังไม่พร้อมใช้งานอย่างปลอดภัย

Backend NestJS ต้องอนุญาต CORS origin `http://localhost:5173` ใน development ด้วย หากต้องการใช้ global prefix `api/v1` โปรดระวังว่าจะเปลี่ยนเส้นทาง ingestion เดิม ให้พิจารณาปรับ collector ให้ตรงกันหรือเลือกใช้ prefix ใน Controllers ใหม่แทน

## ใช้งาน

- หน้า `/` เลือกวิดีโอเพื่อเปิดหน้า Review
- หน้า `/videos/:id` มี Player, Candidate Cards, Timeline, Context, Approve/Reject
- กด candidate แล้ววิดีโอจะ Seek ไป `peak - 15s` และหยุดหลัง Peak 30s
- หลัง Approve/Reject บันทึกสำเร็จ ระบบเลือก Candidate ใหม่อัตโนมัติ
- กด `C` หรือ `Clip` ไปหน้า Clip Draft; ปรับเวลา Start/End ได้ แล้วบันทึก/Export JSON
- แป้นพิมพ์: `Space` เล่น/หยุด, `↑/↓` เลือก moment, `J/L` ย้อน/เดินหน้า 5 วินาที, `I/O` กำหนดช่วงคลิปชั่วคราว, `A` Approve, `R` เปิดเหตุผล Reject, `C` เข้า Clip Editor
- ปุ่ม Re-analyze ปิดการใช้งานไว้ก่อน เพราะ Backend ปัจจุบันลบ Candidates เดิมระหว่าง rebuild ทำให้ review state เสี่ยงหาย

## ตรวจโค้ด

```bat
npm run typecheck
npm run build
```

## หมายเหตุ

ตัวอย่างใช้ `YouTube IFrame Player API`; ต้องต่ออินเทอร์เน็ตและเจ้าของวิดีโอต้องอนุญาตให้ฝัง iframe. เก็บค่าช่วงเวลาใน Backend เป็น **milliseconds** และแปลงเป็นวินาทีก่อนสั่ง YouTube `seekTo()` เท่านั้น

## อัปเดต Top 5 + 4 Presets (Backend ล่าสุด)

- 5 Hot Moments × `QUICK` (30s), `CONTEXT` (60s), `STANDARD` (3m), `LONG` (6m). หน้า Review ตั้งต้นที่ STANDARD และจำ Preset ที่เลือกในเบราว์เซอร์
- กด Preview จะเล่นตาม `clipPresets[preset]` ที่ Backend ส่งคืนมา ไม่ได้คำนวณช่วงเองใน API Mode
- กด Clip Draft จะ `POST /videos/:videoId/clips` ด้วย `{candidateId,preset}` แล้วเปิด Editor พร้อม `draftId`
- Clip Editor โหลด `GET /clips/:id`; แก้ Start/End/Title/Note แล้ว PATCH `/clips/:id`; ส่งออกไฟล์จาก `GET /clips/:id/export`
- เปลี่ยน Preset ใน Editor จะสร้าง Draft ใหม่ แยกจาก Draft เดิม
- Preset 4 ชุดและข้อมูล Video/Chat ใน Demo เป็นข้อมูลจำลอง ไม่ใช่ผลการวิเคราะห์จริง
- Backend ที่ใช้เทียบ: https://github.com/raksit17/youtube-highlight-api (`master`, 2026-10-08)
- ตัว Backend ยังไม่มี Public Re-analyze Job API ที่รักษาประวัติรีวิวได้ จึงปิดปุ่ม Re-analyze ไว้
- ค่า .env: `VITE_DEMO_MODE=false` และ `VITE_API_URL=http://localhost:3001/api/v1` เพื่อใช้ API จริง (ต้อง run Backend, migrate DB, และเปิด CORS)
