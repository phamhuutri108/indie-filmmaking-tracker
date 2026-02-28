import { useState } from 'react';
import type { Lang } from '../i18n';

const FEATURES: Record<Lang, { title: string; desc: string }[]> = {
  vi: [
    {
      title: 'Theo dõi Liên hoan phim',
      desc: 'Theo dõi deadline Early Bird, Regular, Late của hàng trăm liên hoan phim quốc tế. Cảnh báo trước khi hết hạn.',
    },
    {
      title: 'Radar Quỹ & Tài trợ',
      desc: 'Tổng hợp quỹ tài trợ điện ảnh quốc tế — Hubert Bals, IDFA Bertha, Sundance Doc Fund — cùng deadline và điều kiện apply.',
    },
    {
      title: 'Học thuật & Khu lưu trú',
      desc: 'Lab, residency, workshop, học bổng dành cho nhà làm phim — Berlinale Talents, Cannes Cinéfondation và nhiều hơn nữa.',
    },
    {
      title: 'Theo dõi Nộp phim',
      desc: 'Quản lý cá nhân: phim nào submit ở đâu, kết quả, chi phí, ghi chú. Thay thế hoàn toàn spreadsheet.',
    },
    {
      title: 'Phim của tôi',
      desc: 'Lưu trữ danh mục phim cá nhân — tên, thể loại, năm sản xuất — làm nền tảng cho Theo dõi Nộp phim.',
    },
    {
      title: 'Tổng quan',
      desc: 'Tổng quan toàn bộ deadline sắp tới từ tất cả các module, hiển thị theo thứ tự ưu tiên.',
    },
    {
      title: 'Theo dõi tự động',
      desc: 'Đặt lệnh theo dõi tự động cho bất kỳ liên hoan, quỹ hay chương trình nào — nhận email khi có thông tin mới.',
    },
    {
      title: 'Danh sách yêu thích',
      desc: 'Đánh dấu các cơ hội quan tâm từ mọi module để xem lại sau mà không cần tìm kiếm lại từ đầu.',
    },
  ],
  en: [
    {
      title: 'Festival Tracker',
      desc: 'Track Early Bird, Regular, and Late deadlines for hundreds of international film festivals. Get alerts before they expire.',
    },
    {
      title: 'Fund & Grant Radar',
      desc: 'Aggregates international film funds — Hubert Bals, IDFA Bertha, Sundance Doc Fund — with deadlines and eligibility.',
    },
    {
      title: 'Education & Residency',
      desc: 'Labs, residencies, workshops and scholarships for filmmakers — Berlinale Talents, Cannes Cinéfondation, and more.',
    },
    {
      title: 'Submission Tracker',
      desc: 'Personal management: which film was submitted where, results, fees, notes. Fully replaces a spreadsheet.',
    },
    {
      title: 'My Films',
      desc: 'Store your personal film catalogue — title, genre, year — as the foundation for Submission Tracker.',
    },
    {
      title: 'Dashboard',
      desc: 'Overview of all upcoming deadlines across every module, sorted by priority.',
    },
    {
      title: 'Monitor',
      desc: 'Set automatic alerts for any festival, fund, or program — receive an email when new information becomes available.',
    },
    {
      title: 'Watchlist',
      desc: 'Bookmark opportunities from any module to revisit later without searching again.',
    },
  ],
};

const BIO: Record<Lang, { p1: string; p2: string; p3: JSX.Element; p4: JSX.Element | string; featuresTitle: string; feedbackTitle: string; feedbackSubtitle: string; namePlaceholder: string; emailPlaceholder: string; messagePlaceholder: string; submitLabel: string; successMsg: string; errorMsg: string }> = {
  vi: {
    p1: 'Là một người học và làm phim độc lập, giấc mơ đưa tác phẩm đến các liên hoan phim quốc tế không chỉ của riêng tôi — mà còn của rất nhiều bạn trẻ khác. Nhưng thực tế là thông tin về các liên hoan phim, quỹ điện ảnh, deadline nộp phim, workshop về điện ảnh,... vừa tản mát, vừa khó tiếp cận. Và hầu hết những người mới bắt đầu như tôi và bạn đều chưa có người dẫn đường.',
    p2: 'Indie Filmmaking Tracker ra đời từ chính sự bất cập đó — một công cụ giúp người làm phim trẻ chủ động theo dõi cơ hội, thay vì mò mẫm giữa một đại dương thông tin trên internet.',
    p3: (<>Tôi không có nền tảng lập trình. Toàn bộ website này được xây dựng với sự hỗ trợ của{' '}<a href="https://claude.ai" target="_blank" rel="noreferrer" style={{ color: '#004aad' }}>Claude AI</a>.{' '}Bạn có thể xem mã nguồn tại{' '}<a href="https://github.com/phamhuutri108/indie-filmmaking-tracker" target="_blank" rel="noreferrer" style={{ color: '#004aad' }}>GitHub</a>.</>),
    p4: (<>Cảm ơn bạn đã ghé thăm. Tất cả những gì tôi muốn là đóng góp một phần nhỏ cho cộng đồng làm phim. Web vẫn đang được cập nhật và hoàn thiện — mọi góp ý đều được trân trọng.<br /><a href="https://www.phamhuutri.com" target="_blank" rel="noreferrer" style={{ color: '#004aad' }}>Tìm hiểu thêm về tôi →</a></>),
    featuresTitle: 'Tính năng',
    feedbackTitle: 'Góp ý',
    feedbackSubtitle: 'Bạn có ý kiến gì về ứng dụng? Tôi luôn lắng nghe.',
    namePlaceholder: 'Tên của bạn',
    emailPlaceholder: 'Email của bạn',
    messagePlaceholder: 'Lời nhắn...',
    submitLabel: 'Gửi',
    successMsg: 'Cảm ơn bạn! Tôi đã nhận được lời nhắn.',
    errorMsg: 'Có lỗi xảy ra, vui lòng thử lại.',
  },
  en: {
    p1: 'As an independent filmmaker and student, the dream of bringing my work to international film festivals is not mine alone — it is shared by many young people. Yet the reality is that information about festivals, film funds, submission deadlines, and workshops is scattered and hard to access. And most of us who are just starting out have no one to guide us.',
    p2: 'Indie Filmmaking Tracker was born from exactly that gap — a tool to help young filmmakers proactively track opportunities, instead of searching through an ocean of information on the internet.',
    p3: (<>I have no programming background. This entire website was built with the help of{' '}<a href="https://claude.ai" target="_blank" rel="noreferrer" style={{ color: '#004aad' }}>Claude AI</a>.{' '}You can view the source code on{' '}<a href="https://github.com/phamhuutri108/indie-filmmaking-tracker" target="_blank" rel="noreferrer" style={{ color: '#004aad' }}>GitHub</a>.</>),
    p4: (<>Thank you for visiting. All I want is to make a small contribution to the filmmaking community. The website is still being updated and improved — all feedback is appreciated.<br /><a href="https://www.phamhuutri.com" target="_blank" rel="noreferrer" style={{ color: '#004aad' }}>More about me →</a></>),
    featuresTitle: 'Features',
    feedbackTitle: 'Feedback',
    feedbackSubtitle: 'Have thoughts on the app? I\'d love to hear from you.',
    namePlaceholder: 'Your name',
    emailPlaceholder: 'Your email',
    messagePlaceholder: 'Your message...',
    submitLabel: 'Send',
    successMsg: 'Thank you! Your message has been received.',
    errorMsg: 'Something went wrong, please try again.',
  },
};

export function Home({ lang }: { lang: Lang }) {
  const bio = BIO[lang];
  const features = FEATURES[lang];
  const pStyle: React.CSSProperties = { fontSize: 14, color: '#4a5568', lineHeight: 1.75, margin: '0 0 16px', textAlign: 'justify' };

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim() || !message.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      });
      if (res.ok) {
        setSent(true);
        setName(''); setEmail(''); setMessage('');
      } else {
        setError(bio.errorMsg);
      }
    } catch {
      setError(bio.errorMsg);
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '48px 24px 80px', maxWidth: 820, margin: '0 auto' }}>

      {/* Bio section */}
      <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 72, alignItems: 'center' }}>

        <div style={{ flex: 1, minWidth: 260 }}>
          <p style={pStyle}>{bio.p1}</p>
          <p style={pStyle}>{bio.p2}</p>
          <p style={pStyle}>{bio.p3}</p>
          <p style={{ ...pStyle, margin: 0 }}>{bio.p4}</p>
        </div>

        <a href="https://www.phamhuutri.com" target="_blank" rel="noreferrer" style={{ flexShrink: 0, display: 'block' }}>
          <img
            src="/profile-image.jpeg"
            alt="Tri Pham"
            style={{ width: 270, aspectRatio: '3/4', objectFit: 'cover', objectPosition: 'top', borderRadius: 8, display: 'block' }}
          />
        </a>
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px solid #e2e8f0', marginBottom: 48 }} />

      {/* Features */}
      <div style={{ marginBottom: 8, fontSize: 13, fontWeight: 700, color: '#a0aec0', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {bio.featuresTitle}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {features.map((f, i) => (
          <div
            key={f.title}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 16,
              padding: '18px 0',
              borderBottom: i < features.length - 1 ? '1px solid #f0f0f0' : 'none',
            }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#1a202c', marginBottom: 4 }}>{f.title}</div>
              <div style={{ fontSize: 14, color: '#718096', lineHeight: 1.65 }}>{f.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px solid #e2e8f0', margin: '56px 0 48px' }} />

      {/* Feedback form */}
      <div style={{ marginBottom: 8, fontSize: 13, fontWeight: 700, color: '#a0aec0', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {bio.feedbackTitle}
      </div>
      <p style={{ fontSize: 14, color: '#718096', margin: '8px 0 24px' }}>{bio.feedbackSubtitle}</p>

      {sent ? (
        <p style={{ fontSize: 14, color: '#38a169', fontWeight: 600 }}>{bio.successMsg}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 480 }}>
          <input
            type="text"
            placeholder={bio.namePlaceholder}
            value={name}
            onChange={e => setName(e.target.value)}
            style={inputStyle}
          />
          <input
            type="email"
            placeholder={bio.emailPlaceholder}
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={inputStyle}
          />
          <textarea
            placeholder={bio.messagePlaceholder}
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={4}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
          {error && <p style={{ fontSize: 13, color: '#e53e3e', margin: 0 }}>{error}</p>}
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              alignSelf: 'flex-start',
              background: '#004aad',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '10px 24px',
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              fontFamily: "'Montserrat', sans-serif",
            }}
          >
            {loading ? '...' : bio.submitLabel}
          </button>
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: 72, fontSize: 13, color: '#a0aec0', textAlign: 'center' }}>
        © 2026{' '}
        <a href="https://www.phamhuutri.com" target="_blank" rel="noreferrer" style={{ color: '#718096' }}>
          Pham Huu Tri
        </a>.
      </div>

    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  fontSize: 14,
  fontFamily: "'Montserrat', sans-serif",
  outline: 'none',
  boxSizing: 'border-box',
};
