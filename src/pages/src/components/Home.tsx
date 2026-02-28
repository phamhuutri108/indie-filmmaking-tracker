export function Home() {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 16px 80px', textAlign: 'center' }}>

      {/* Hero */}
      <div style={{ marginBottom: 64 }}>
        <div style={{
          display: 'inline-block',
          background: 'linear-gradient(135deg, #004aad 0%, #0066ff 100%)',
          borderRadius: 16,
          padding: '10px 22px',
          fontSize: 12,
          fontWeight: 700,
          color: '#fff',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          marginBottom: 24,
        }}>
          Open-source · Free · Built by a filmmaker
        </div>
        <h1 style={{
          fontSize: 'clamp(28px, 5vw, 46px)',
          fontWeight: 800,
          color: '#1a202c',
          lineHeight: 1.15,
          margin: '0 0 20px',
        }}>
          Stop missing deadlines.<br />
          <span style={{ color: '#004aad' }}>Start making films.</span>
        </h1>
        <p style={{
          fontSize: 17,
          color: '#4a5568',
          lineHeight: 1.75,
          margin: '0 0 36px',
          maxWidth: 560,
          marginLeft: 'auto',
          marginRight: 'auto',
        }}>
          Indie Filmmaking Tracker là công cụ tôi xây dựng vì không tìm được thứ gì
          tốt hơn — một nơi duy nhất theo dõi toàn bộ cơ hội quốc tế cho nhà làm phim độc lập.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a
            href="/dashboard"
            style={{
              background: '#004aad',
              color: '#fff',
              padding: '12px 28px',
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 15,
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Vào ứng dụng →
          </a>
          <a
            href="https://github.com/phamhuutri108/indie-filmmaking-tracker"
            target="_blank"
            rel="noreferrer"
            style={{
              background: '#fff',
              color: '#1a202c',
              padding: '12px 28px',
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 15,
              textDecoration: 'none',
              border: '1px solid #e2e8f0',
              display: 'inline-block',
            }}
          >
            GitHub ↗
          </a>
        </div>
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px solid #e2e8f0', marginBottom: 64 }} />

      {/* Why I built this */}
      <div style={{ marginBottom: 64, textAlign: 'left' }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: '#1a202c', textAlign: 'center', marginBottom: 8 }}>
          Tại sao tôi xây dựng công cụ này?
        </h2>
        <p style={{ color: '#718096', fontSize: 14, textAlign: 'center', marginBottom: 36 }}>
          Câu chuyện thật từ một nhà làm phim độc lập
        </p>
        <div style={{ display: 'grid', gap: 16 }}>
          {[
            {
              icon: '📅',
              title: 'Deadline nằm rải rác khắp nơi',
              body: 'FilmFreeway, trang web chính thức của từng liên hoan, email newsletter — thông tin phân mảnh hoàn toàn. Tôi đã bỏ lỡ Early Bird của một liên hoan lớn chỉ vì quên kiểm tra.',
            },
            {
              icon: '💸',
              title: 'Quỹ tài trợ gần như vô hình',
              body: 'Hubert Bals, IDFA Bertha, Sundance Documentary Fund — những quỹ quốc tế cực kỳ giá trị nhưng gần như không ai trong cộng đồng phim Việt biết đến, chứ chưa nói đến việc apply đúng lúc.',
            },
            {
              icon: '🔔',
              title: 'Không có hệ thống cảnh báo',
              body: 'Tôi phải tự nhắc nhở bản thân check thủ công từng trang web mỗi tuần. Đó là công việc của bot, không phải của filmmaker.',
            },
            {
              icon: '🎬',
              title: 'Không có chỗ quản lý portfolio cá nhân',
              body: 'Theo dõi phim nào đang submit đến đâu, kết quả ra sao, chi phí submit là bao nhiêu — tất cả đều trong spreadsheet thủ công và rất dễ lộn xộn.',
            },
          ].map((item) => (
            <div
              key={item.title}
              style={{
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderLeft: '4px solid #004aad',
                borderRadius: 10,
                padding: '18px 20px',
                display: 'flex',
                gap: 16,
                alignItems: 'flex-start',
              }}
            >
              <span style={{ fontSize: 24, lineHeight: 1, flexShrink: 0, marginTop: 2 }}>{item.icon}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#1a202c', marginBottom: 4 }}>{item.title}</div>
                <div style={{ fontSize: 14, color: '#4a5568', lineHeight: 1.65 }}>{item.body}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Why share */}
      <div style={{ marginBottom: 64 }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: '#1a202c', marginBottom: 8 }}>
          Tại sao chia sẻ cho cộng đồng?
        </h2>
        <p style={{ color: '#718096', fontSize: 14, marginBottom: 36 }}>
          Thông tin không nên là đặc quyền của người có nhiều thời gian nhất
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          {[
            { icon: '🌏', title: 'Cơ hội bình đẳng', body: 'Filmmaker ở Hà Nội hay TP.HCM xứng đáng có cùng cơ hội tiếp cận thông tin như filmmaker ở Berlin hay New York.' },
            { icon: '🤝', title: 'Trí tuệ tập thể', body: 'Khi nhiều người cùng cập nhật và kiểm chứng thông tin, dữ liệu trở nên chính xác và đầy đủ hơn bất kỳ ai làm một mình.' },
            { icon: '🚀', title: 'Hệ sinh thái lớn mạnh', body: 'Phim Việt ra thế giới nhiều hơn đồng nghĩa với việc điện ảnh Việt Nam được chú ý hơn — điều tốt cho tất cả chúng ta.' },
            { icon: '💡', title: 'Code là sức mạnh', body: 'Tôi là filmmaker biết code. Kết hợp hai thế mạnh này để tạo ra công cụ mà cả hai cộng đồng đều cần.' },
          ].map((item) => (
            <div
              key={item.title}
              style={{
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                padding: '20px 18px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 10 }}>{item.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#1a202c', marginBottom: 6 }}>{item.title}</div>
              <div style={{ fontSize: 13, color: '#718096', lineHeight: 1.6 }}>{item.body}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div style={{ marginBottom: 64 }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: '#1a202c', marginBottom: 8 }}>
          Công cụ bao gồm gì?
        </h2>
        <p style={{ color: '#718096', fontSize: 14, marginBottom: 36 }}>
          4 module chính, tất cả tự động hóa tối đa
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12, textAlign: 'left' }}>
          {[
            { icon: '🎬', color: '#004aad', label: 'Festival Tracker', desc: 'Theo dõi deadline Early Bird, Regular, Late của hàng trăm liên hoan. Cảnh báo trước 7–30 ngày.' },
            { icon: '💰', color: '#38a169', label: 'Fund & Grant Radar', desc: 'Quỹ tài trợ quốc tế (Hubert Bals, IDFA, Sundance Doc Fund…) với deadline và điều kiện eligibility.' },
            { icon: '🎓', color: '#805ad5', label: 'Education Hub', desc: 'Lab, residency, workshop, học bổng — Berlinale Talents, Cannes Cinéfondation và nhiều hơn nữa.' },
            { icon: '📋', color: '#dd6b20', label: 'Submission Tracker', desc: 'Quản lý cá nhân: phim nào submit ở đâu, kết quả, chi phí, ghi chú — thay thế hoàn toàn spreadsheet.' },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderTop: `3px solid ${item.color}`,
                borderRadius: 10,
                padding: '18px 20px',
              }}
            >
              <div style={{ fontSize: 22, marginBottom: 8 }}>{item.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#1a202c', marginBottom: 4 }}>{item.label}</div>
              <div style={{ fontSize: 13, color: '#4a5568', lineHeight: 1.65 }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{
        background: 'linear-gradient(135deg, #004aad 0%, #0066ff 100%)',
        borderRadius: 16,
        padding: '40px 32px',
        color: '#fff',
      }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 10px' }}>
          Sẵn sàng dùng thử?
        </h2>
        <p style={{ fontSize: 14, opacity: 0.85, margin: '0 0 24px', lineHeight: 1.6 }}>
          Đăng nhập bằng Google để bắt đầu. Miễn phí hoàn toàn.
        </p>
        <a
          href="/dashboard"
          style={{
            display: 'inline-block',
            background: '#fff',
            color: '#004aad',
            padding: '11px 28px',
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 15,
            textDecoration: 'none',
          }}
        >
          Vào ứng dụng →
        </a>
      </div>

      {/* Footer */}
      <div style={{ marginTop: 48, fontSize: 13, color: '#a0aec0' }}>
        Built by{' '}
        <a href="https://phamhuutri.com" target="_blank" rel="noreferrer" style={{ color: '#718096' }}>
          Tri Pham
        </a>
        {' '}· Stack: Cloudflare Workers + D1 + React ·{' '}
        <a href="https://github.com/phamhuutri108/indie-filmmaking-tracker" target="_blank" rel="noreferrer" style={{ color: '#718096' }}>
          View source
        </a>
      </div>

    </div>
  );
}
