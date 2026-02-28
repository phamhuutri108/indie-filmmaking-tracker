const FEATURES = [
  {
    icon: '🎬',
    title: 'Festival Tracker',
    desc: 'Theo dõi deadline Early Bird, Regular, Late của hàng trăm liên hoan phim quốc tế. Cảnh báo trước khi hết hạn.',
  },
  {
    icon: '💰',
    title: 'Fund & Grant Radar',
    desc: 'Tổng hợp quỹ tài trợ điện ảnh quốc tế — Hubert Bals, IDFA Bertha, Sundance Doc Fund — cùng deadline và điều kiện apply.',
  },
  {
    icon: '🎓',
    title: 'Education & Residency',
    desc: 'Lab, residency, workshop, học bổng dành cho nhà làm phim — Berlinale Talents, Cannes Cinéfondation và nhiều hơn nữa.',
  },
  {
    icon: '📋',
    title: 'Submission Tracker',
    desc: 'Quản lý cá nhân: phim nào submit ở đâu, kết quả, chi phí, ghi chú. Thay thế hoàn toàn spreadsheet.',
  },
  {
    icon: '🎥',
    title: 'My Films',
    desc: 'Lưu trữ danh mục phim cá nhân — tên, thể loại, năm sản xuất — làm nền tảng cho Submission Tracker.',
  },
  {
    icon: '📊',
    title: 'Dashboard',
    desc: 'Tổng quan toàn bộ deadline sắp tới từ tất cả các module, hiển thị theo thứ tự ưu tiên.',
  },
  {
    icon: '🔔',
    title: 'Monitor',
    desc: 'Đặt lệnh theo dõi tự động cho bất kỳ liên hoan, quỹ hay chương trình nào — nhận email khi có thông tin mới.',
  },
  {
    icon: '⭐',
    title: 'Watchlist',
    desc: 'Đánh dấu các cơ hội quan tâm từ mọi module để xem lại sau mà không cần tìm kiếm lại từ đầu.',
  },
];

export function Home() {
  return (
    <div style={{ padding: '48px 24px 80px', maxWidth: 820, margin: '0 auto' }}>

      {/* Bio section */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 56,
        flexWrap: 'wrap',
        justifyContent: 'center',
        marginBottom: 72,
      }}>
        <img
          src="/profile-image.jpeg"
          alt="Tri Pham"
          style={{
            width: 180,
            height: 180,
            borderRadius: '50%',
            objectFit: 'cover',
            flexShrink: 0,
          }}
        />
        <div style={{ maxWidth: 480, flex: 1, minWidth: 260 }}>
          <p style={{ fontSize: 15, color: '#4a5568', lineHeight: 1.8, margin: '0 0 18px' }}>
            Là một người học và làm phim độc lập, giấc mơ đưa tác phẩm đến các liên hoan phim quốc tế không chỉ của riêng tôi — mà còn của rất nhiều bạn trẻ khác. Nhưng thực tế là thông tin về các liên hoan phim, quỹ điện ảnh, deadline nộp phim, workshop về điện ảnh,... vừa tản mát, vừa khó tiếp cận. Và hầu hết những người mới bắt đầu như tôi và bạn đều chưa có người dẫn đường.
          </p>
          <p style={{ fontSize: 15, color: '#4a5568', lineHeight: 1.8, margin: '0 0 18px' }}>
            Indie Filmmaking Tracker ra đời từ chính sự bất cập đó — một công cụ giúp người làm phim trẻ chủ động theo dõi cơ hội, thay vì mò mẫm giữa một đại dương thông tin trên internet.
          </p>
          <p style={{ fontSize: 15, color: '#4a5568', lineHeight: 1.8, margin: '0 0 18px' }}>
            Tôi không có nền tảng lập trình. Toàn bộ website này được xây dựng với sự hỗ trợ của{' '}
            <a href="https://claude.ai" target="_blank" rel="noreferrer" style={{ color: '#004aad' }}>Claude AI</a>.
            {' '}Bạn có thể xem mã nguồn tại{' '}
            <a href="https://github.com/phamhuutri108/indie-filmmaking-tracker" target="_blank" rel="noreferrer" style={{ color: '#004aad' }}>GitHub</a>.
          </p>
          <p style={{ fontSize: 15, color: '#4a5568', lineHeight: 1.8, margin: 0 }}>
            Cảm ơn bạn đã ghé thăm. Tất cả những gì tôi muốn là đóng góp một phần nhỏ cho cộng đồng làm phim. Web vẫn đang được cập nhật và hoàn thiện — mọi góp ý đều được trân trọng.
          </p>
        </div>
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px solid #e2e8f0', marginBottom: 48 }} />

      {/* Features list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {FEATURES.map((f, i) => (
          <div
            key={f.title}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 16,
              padding: '20px 0',
              borderBottom: i < FEATURES.length - 1 ? '1px solid #f0f0f0' : 'none',
            }}
          >
            <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0, marginTop: 2 }}>{f.icon}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#1a202c', marginBottom: 4 }}>{f.title}</div>
              <div style={{ fontSize: 14, color: '#718096', lineHeight: 1.65 }}>{f.desc}</div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
