# Indie Filmmaking Tracker

> Công cụ theo dõi cơ hội cho nhà làm phim độc lập — liên hoan phim, quỹ tài trợ, chương trình học thuật, và quản lý submission cá nhân.

**Live:** [ift.phamhuutri.com](https://ift.phamhuutri.com)

---

## Tại sao tôi xây dựng công cụ này?

Là một người học và làm phim độc lập, giấc mơ đưa tác phẩm đến các liên hoan phim quốc tế không chỉ của riêng tôi. Nhưng thực tế là thông tin về liên hoan phim, quỹ điện ảnh, deadline, workshop... vừa tản mát, vừa khó tiếp cận — và hầu hết người mới bắt đầu đều chưa có người dẫn đường.

Indie Filmmaking Tracker ra đời từ chính sự bất cập đó.

*Tôi không có nền tảng lập trình. Toàn bộ website này được xây dựng với sự hỗ trợ của [Claude AI](https://claude.ai).*

---

## Tính năng

| Module | Mô tả |
|--------|-------|
| **Festival Tracker** | Theo dõi deadline Early Bird, Regular, Late của hàng trăm liên hoan phim quốc tế |
| **Fund & Grant Radar** | Quỹ tài trợ điện ảnh quốc tế — Hubert Bals, IDFA Bertha, Sundance Doc Fund |
| **Education & Residency** | Lab, residency, workshop, học bổng — Berlinale Talents, Cannes Cinéfondation |
| **Submission Tracker** | Quản lý cá nhân: phim nào submit ở đâu, kết quả, chi phí, ghi chú |
| **My Films** | Lưu trữ danh mục phim cá nhân |
| **Dashboard** | Tổng quan deadline sắp tới từ tất cả module |
| **Monitor** | Đặt lệnh theo dõi tự động — nhận email khi có thông tin mới |
| **Watchlist** | Đánh dấu cơ hội quan tâm để xem lại sau |

---

## Tech Stack

- **Runtime:** [Cloudflare Workers](https://workers.cloudflare.com/)
- **Database:** [Cloudflare D1](https://developers.cloudflare.com/d1/) (SQLite)
- **Frontend:** React 18 + Vite (SPA, inline styles)
- **API:** [Hono.js](https://hono.dev/)
- **Email:** [Resend](https://resend.com/)
- **Auth:** Google OAuth + JWT
- **Scraper:** RSS (asianfilmfestivals.com, Cineuropa)
- **Cron:** Cloudflare Cron Triggers (daily 08:00 UTC)
- **CI/CD:** GitHub Actions → Cloudflare Pages

---

## Cấu trúc thư mục

```
src/
  workers/        # Cloudflare Workers API (Hono.js)
    index.ts      # Router chính — tất cả /api/* routes
    cron.ts       # Cron daily — scrape + alert emails
    scraper.ts    # RSS scraper (asianfilmfestivals.com)
    fund-scraper.ts
    auth.ts       # JWT + Google OAuth
    calendar.ts   # ICS export
  pages/          # React frontend (Vite)
    src/
      App.tsx
      components/
      i18n/       # Bilingual VI/EN
  db/
    schema.sql    # D1 schema
    seed.sql      # Sample data
    migrations/
  public/         # Static assets
```

---

## Góp ý

Mọi góp ý, báo lỗi, hoặc đề xuất tính năng — vui lòng mở [GitHub Issue](https://github.com/phamhuutri108/indie-filmmaking-tracker/issues) hoặc liên hệ qua form trên trang chủ.

---

© 2026 [Pham Huu Tri](https://phamhuutri.com)
