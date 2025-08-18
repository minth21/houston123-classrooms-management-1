This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

# Houston123 Classrooms Management

## Production with PM2 (Load Balancing)

PM2 giúp chạy Next.js ở chế độ cluster để tận dụng đa nhân CPU.

### Cài đặt & Build

```bash
npm install --production --omit=dev # (tuỳ môi trường, bạn có thể giữ dev để debug)
npm run build
```

### Khởi động bằng PM2

```bash
npm run start:pm2
```

Mặc định cấu hình (`ecosystem.config.cjs`) sẽ:
- `instances: max` chạy số tiến trình = số core CPU
- `exec_mode: cluster` chia đều kết nối (round‑robin)
- Giới hạn bộ nhớ 512M / tiến trình (tự restart nếu vượt)
- Ghi log vào `./logs/pm2-out.log` và `./logs/pm2-error.log`

### Các lệnh hữu ích

```bash
npm run logs:pm2        # Xem log realtime
npm run reload:pm2      # Zero-downtime reload (tải lại code sau deploy)
npm run stop:pm2        # Dừng app
pm2 list                # Danh sách apps
pm2 monit               # Dashboard realtime
```

### Triển khai cập nhật (zero-downtime)

```bash
git pull
npm install --production --omit=dev
npm run build
npm run reload:pm2
```

### Scale thủ công số instance (nếu không dùng `max`)

```bash
pm2 scale web 6    # Tăng lên 6 instance
pm2 scale web 3    # Giảm xuống 3 instance
```

### Xem log nhanh

```bash
pm2 logs web --lines 200
```

### Dọn log cũ

```bash
pm2 flush
pm2 delete web     # (nếu muốn xoá app khỏi PM2)
```

### Bật startup service (tự khởi động lại khi reboot)

```bash
pm2 startup        # PM2 in ra lệnh cần chạy với quyền admin
pm2 save           # Lưu process list hiện tại
```

### Biến môi trường

Chỉnh trong `ecosystem.config.cjs` (trường `env` hoặc `env_production`). Ví dụ thêm:

```js
env: { NODE_ENV: 'production', API_BASE: 'https://api.example.com' }
```

Sau đó reload: `npm run reload:pm2`.

### Ghi chú
- Không cần reverse proxy riêng nếu chỉ nội bộ, nhưng nên đặt Nginx phía trước để TLS/HTTP2/cache.
- Hãy đảm bảo port (3000) được firewall mở hoặc đổi port trong `args`.
- Dùng `pm2 deploy` nếu muốn pipeline advanced (có thể bổ sung sau).
