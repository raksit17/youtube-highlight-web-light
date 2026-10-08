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

Backend ต้องเพิ่ม API ตาม `README.md` ก่อน หน้า Frontend นี้ **ไม่ได้สมมติว่า Backend ปัจจุบันมี Read API หรือ Review API แล้ว**

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
