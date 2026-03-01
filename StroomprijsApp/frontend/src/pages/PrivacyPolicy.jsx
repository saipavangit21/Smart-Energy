/**
 * PrivacyPolicy.jsx — GDPR compliant privacy policy modal
 */
export default function PrivacyPolicy({ onClose }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "flex-start", justifyContent: "center",
      padding: "24px 16px", overflowY: "auto",
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: "#0D1626", border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 20, padding: 32, maxWidth: 680, width: "100%",
        color: "#E8EDF5", fontFamily: "system-ui, sans-serif",
        marginTop: 20,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>🔒 Privacy Policy</div>
            <div style={{ fontSize: 12, color: "#556", marginTop: 4 }}>SmartPrice.be · Last updated: February 2026</div>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "8px 14px", color: "#aaa", cursor: "pointer", fontSize: 13 }}>✕ Close</button>
        </div>

        {[
          { title: "1. Who We Are", content: "SmartPrice.be is a Belgian electricity price monitoring application. We display real-time EPEX Spot prices and help Belgian consumers make informed energy decisions. This service is provided for informational purposes only and does not constitute financial advice." },
          { title: "2. Data We Collect", content: "We collect only the minimum data necessary to provide our service:\n• Email address (for account creation and price alerts)\n• Name (optional, for personalisation)\n• Electricity supplier preference\n• Price alert threshold setting\n• Login method (email/password or Google OAuth)\n\nWe do NOT collect payment information, location data, or browsing history." },
          { title: "3. How We Use Your Data", content: "Your data is used exclusively to:\n• Authenticate your account securely\n• Send price alert emails when electricity prices drop below your threshold\n• Remember your supplier preference and alert settings\n• Improve the application based on usage patterns (anonymised)" },
          { title: "4. Data Storage & Security", content: "All personal data is stored in the European Union:\n• Database: Supabase (Ireland, EU) ✅\n• Backend: Railway (Netherlands, EU) ✅\n• Frontend: Vercel (EU region) ✅\n\nPasswords are hashed using bcrypt (industry standard). We use JWT tokens for secure authentication. We never store plain-text passwords." },
          { title: "5. Data Sharing", content: "We do NOT sell, rent, or share your personal data with third parties for commercial purposes.\n\nWe use the following sub-processors:\n• Supabase (database hosting, Ireland)\n• Railway (backend hosting, Netherlands)\n• Resend (email delivery service)\n• Google OAuth (if you choose to sign in with Google)\n\nAll sub-processors are GDPR compliant." },
          { title: "6. Your Rights (GDPR)", content: "Under GDPR, you have the right to:\n• Access — request a copy of your personal data\n• Rectification — correct inaccurate data\n• Erasure — delete your account and all associated data\n• Portability — receive your data in a machine-readable format\n• Objection — object to processing of your data\n\nTo exercise these rights, use the 'Delete My Account' button in your profile, or email us at hello@smartprice.be" },
          { title: "7. Data Retention", content: "We retain your data for as long as your account is active. When you delete your account, all personal data is permanently removed from our systems within 30 days. Email logs may be retained for up to 90 days for security purposes." },
          { title: "8. Cookies", content: "SmartPrice.be uses only essential cookies and localStorage for authentication (JWT tokens). We do not use tracking cookies or third-party advertising cookies." },
          { title: "9. Price Data Sources", content: "Electricity prices are sourced from:\n• Energy-Charts.info (Fraunhofer ISE)\n• Elia Open Data (CC BY 4.0)\n• ENTSO-E Transparency Platform\n\nAll price data is publicly available. Prices shown are EPEX Spot market prices and do not represent retail tariffs. Always verify with your supplier." },
          { title: "10. Contact", content: "For privacy-related questions or data requests, contact us at hello@smartprice.be\n\nWe aim to respond within 30 days as required by GDPR." },
        ].map(({ title, content }) => (
          <div key={title} style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#0D9488", marginBottom: 8 }}>{title}</div>
            <div style={{ fontSize: 13, color: "#889", lineHeight: 1.8, whiteSpace: "pre-line" }}>{content}</div>
          </div>
        ))}

        <div style={{ marginTop: 8, padding: 16, background: "rgba(13,148,136,0.08)", border: "1px solid rgba(13,148,136,0.2)", borderRadius: 12, fontSize: 12, color: "#667", textAlign: "center" }}>
          🇪🇺 SmartPrice.be is GDPR compliant · Data stored in the European Union · Belgium
        </div>
        <div style={{ marginTop: 12, textAlign: "center", fontSize: 12, color: "#445" }}>
          Questions? <a href="mailto:hello@smartprice.be" style={{ color: "#0D9488" }}>hello@smartprice.be</a>
        </div>

        <button onClick={onClose} style={{ width: "100%", marginTop: 20, padding: "12px 0", borderRadius: 12, background: "linear-gradient(135deg,#0D9488,#1A56A4)", border: "none", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
          Close
        </button>
      </div>
    </div>
  );
}