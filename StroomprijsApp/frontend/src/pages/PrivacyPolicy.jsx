/**
 * PrivacyPolicy.jsx â€” GDPR compliant privacy policy modal
 * Updated: March 2026 â€” NL/FR translations, gas prices, referral disclosure
 */
import { useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";

const POLICIES = {
  en: {
    title: "Privacy Policy",
    updated: "SmartPrice.be Â· Last updated: March 2026",
    close: "âœ• Close",
    footer: "ðŸ‡ªðŸ‡º SmartPrice.be is GDPR compliant Â· Data stored in the European Union Â· Belgium",
    questions: "Questions?",
    sections: [
      {
        title: "1. Who We Are",
        content: "SmartPrice.be is a Belgian energy price monitoring application. We display real-time EPEX Spot electricity prices and TTF natural gas prices, and help Belgian consumers make informed energy decisions.\n\nThis service is provided for informational purposes only and does not constitute financial or energy advice. Always verify tariffs directly with your supplier before switching.",
      },
      {
        title: "2. Data We Collect",
        content: "We collect only the minimum data necessary to provide our service:\nâ€¢ Email address (for account creation and price alerts)\nâ€¢ Name (optional, for personalisation)\nâ€¢ Electricity supplier preference\nâ€¢ Price alert threshold setting\nâ€¢ Login method (email/password or Google OAuth)\n\nWe do NOT collect payment information, precise location data, or browsing history.",
      },
      {
        title: "3. How We Use Your Data",
        content: "Your data is used exclusively to:\nâ€¢ Authenticate your account securely\nâ€¢ Send price alert emails when electricity prices drop below your threshold\nâ€¢ Remember your supplier preference and alert settings\nâ€¢ Personalise your energy plan comparison results\nâ€¢ Improve the application based on anonymised usage patterns",
      },
      {
        title: "4. Data Storage & Security",
        content: "All personal data is stored in the European Union:\nâ€¢ Database: Supabase (Ireland, EU) âœ…\nâ€¢ Backend: Railway (Netherlands, EU) âœ…\nâ€¢ Frontend: Vercel (EU region) âœ…\n\nPasswords are hashed using bcrypt (industry standard). We use JWT tokens for secure authentication. We never store plain-text passwords.",
      },
      {
        title: "5. Data Sharing",
        content: "We do NOT sell, rent, or share your personal data with third parties for commercial purposes.\n\nWe use the following sub-processors:\nâ€¢ Supabase (database hosting, Ireland)\nâ€¢ Railway (backend hosting, Netherlands)\nâ€¢ Resend (transactional email delivery)\nâ€¢ Google OAuth (if you choose to sign in with Google)\n\nAll sub-processors are GDPR compliant.",
      },
      {
        title: "6. Referral & Commercial Relationships",
        content: "SmartPrice.be may earn a referral commission when you switch to an energy supplier through a link on our platform. This does not affect the price you pay â€” supplier tariffs are independently calculated and ranked by real annual cost.\n\nWe clearly mark any sponsored or promoted content. Our rankings are always based on lowest cost for your usage profile, not commercial relationships.",
      },
      {
        title: "7. Your Rights (GDPR)",
        content: "Under GDPR, you have the right to:\nâ€¢ Access â€” request a copy of your personal data\nâ€¢ Rectification â€” correct inaccurate data\nâ€¢ Erasure â€” delete your account and all associated data\nâ€¢ Portability â€” receive your data in a machine-readable format\nâ€¢ Objection â€” object to processing of your data\n\nTo exercise these rights, use the 'Delete My Account' button in your profile, or email us at hello@smartprice.be",
      },
      {
        title: "8. Data Retention",
        content: "We retain your data for as long as your account is active. When you delete your account, all personal data is permanently removed from our systems within 30 days. Email logs may be retained for up to 90 days for security purposes.",
      },
      {
        title: "9. Cookies & Local Storage",
        content: "SmartPrice.be uses only essential cookies and localStorage for:\nâ€¢ Authentication (JWT tokens)\nâ€¢ Language preference\nâ€¢ Supplier and alert preferences\n\nWe do not use tracking cookies, advertising cookies, or third-party analytics cookies.",
      },
      {
        title: "10. Price Data Sources",
        content: "Energy prices are sourced from publicly available data:\nâ€¢ Electricity: Energy-Charts.info (Fraunhofer ISE), Elia Open Data (CC BY 4.0), ENTSO-E\nâ€¢ Gas: ICE EEX TTF Natural Gas index\n\nPrices shown are wholesale market prices and do not represent retail tariffs. Supplier tariffs are scraped weekly and may not reflect the latest rates. Always verify with your supplier before switching.",
      },
      {
        title: "11. Contact",
        content: "For privacy-related questions or data requests:\nðŸ“§ hello@smartprice.be\n\nWe aim to respond within 30 days as required by GDPR.",
      },
    ],
  },

  nl: {
    title: "Privacybeleid",
    updated: "SmartPrice.be Â· Laatste update: maart 2026",
    close: "âœ• Sluiten",
    footer: "ðŸ‡ªðŸ‡º SmartPrice.be voldoet aan de AVG Â· Gegevens opgeslagen in de Europese Unie Â· BelgiÃ«",
    questions: "Vragen?",
    sections: [
      {
        title: "1. Wie zijn wij",
        content: "SmartPrice.be is een Belgische applicatie voor energieprijsmonitoring. We tonen realtime EPEX Spot-elektriciteitsprijzen en TTF-aardgasprijzen en helpen Belgische consumenten weloverwogen energiebeslissingen te nemen.\n\nDeze dienst is uitsluitend bedoeld voor informatiedoeleinden en vormt geen financieel of energieadvies. Verifieer tarieven altijd rechtstreeks bij uw leverancier voordat u overstapt.",
      },
      {
        title: "2. Gegevens die wij verzamelen",
        content: "Wij verzamelen alleen de minimaal noodzakelijke gegevens:\nâ€¢ E-mailadres (voor accountaanmaak en prijsmeldingen)\nâ€¢ Naam (optioneel, voor personalisatie)\nâ€¢ Voorkeur voor elektriciteitsleverancier\nâ€¢ Drempelwaarde voor prijsmelding\nâ€¢ Inlogmethode (e-mail/wachtwoord of Google OAuth)\n\nWij verzamelen GEEN betalingsgegevens, nauwkeurige locatiegegevens of browsegeschiedenis.",
      },
      {
        title: "3. Hoe wij uw gegevens gebruiken",
        content: "Uw gegevens worden uitsluitend gebruikt om:\nâ€¢ Uw account veilig te authenticeren\nâ€¢ Prijsmeldingen te sturen wanneer elektriciteitsprijzen onder uw drempel dalen\nâ€¢ Uw leveranciersvoorkeur en meldingsinstellingen te onthouden\nâ€¢ Uw energietariefvergelijking te personaliseren\nâ€¢ De applicatie te verbeteren op basis van geanonimiseerde gebruikspatronen",
      },
      {
        title: "4. Gegevensopslag & Beveiliging",
        content: "Alle persoonsgegevens worden opgeslagen in de Europese Unie:\nâ€¢ Database: Supabase (Ierland, EU) âœ…\nâ€¢ Backend: Railway (Nederland, EU) âœ…\nâ€¢ Frontend: Vercel (EU-regio) âœ…\n\nWachtwoorden worden gehasht met bcrypt (industriestandaard). We gebruiken JWT-tokens voor veilige authenticatie. We slaan nooit wachtwoorden in leesbare tekst op.",
      },
      {
        title: "5. Gegevensdeling",
        content: "Wij verkopen, verhuren of delen uw persoonsgegevens NIET met derden voor commerciÃ«le doeleinden.\n\nWij maken gebruik van de volgende sub-verwerkers:\nâ€¢ Supabase (database-hosting, Ierland)\nâ€¢ Railway (backend-hosting, Nederland)\nâ€¢ Resend (transactionele e-mailbezorging)\nâ€¢ Google OAuth (als u kiest om in te loggen met Google)\n\nAlle sub-verwerkers voldoen aan de AVG.",
      },
      {
        title: "6. Verwijzingen & CommerciÃ«le relaties",
        content: "SmartPrice.be kan een verwijzingsvergoeding ontvangen wanneer u via een link op ons platform overstapt naar een energieleverancier. Dit heeft geen invloed op de prijs die u betaalt â€” leverancierstarieven worden onafhankelijk berekend en gerangschikt op werkelijke jaarkosten.\n\nWe markeren gesponsorde of gepromote inhoud duidelijk. Onze rangschikkingen zijn altijd gebaseerd op de laagste kosten voor uw gebruiksprofiel, niet op commerciÃ«le relaties.",
      },
      {
        title: "7. Uw rechten (AVG)",
        content: "Onder de AVG heeft u het recht op:\nâ€¢ Inzage â€” een kopie van uw persoonsgegevens opvragen\nâ€¢ Rectificatie â€” onjuiste gegevens corrigeren\nâ€¢ Verwijdering â€” uw account en alle bijbehorende gegevens verwijderen\nâ€¢ Overdraagbaarheid â€” uw gegevens ontvangen in een machine-leesbaar formaat\nâ€¢ Bezwaar â€” bezwaar maken tegen de verwerking van uw gegevens\n\nGebruik de knop 'Mijn account verwijderen' in uw profiel, of stuur een e-mail naar hello@smartprice.be",
      },
      {
        title: "8. Bewaartermijn",
        content: "We bewaren uw gegevens zolang uw account actief is. Wanneer u uw account verwijdert, worden alle persoonsgegevens binnen 30 dagen permanent verwijderd. E-maillogboeken kunnen tot 90 dagen worden bewaard voor beveiligingsdoeleinden.",
      },
      {
        title: "9. Cookies & Lokale opslag",
        content: "SmartPrice.be gebruikt alleen essentiÃ«le cookies en localStorage voor:\nâ€¢ Authenticatie (JWT-tokens)\nâ€¢ Taalvoorkeur\nâ€¢ Leveranciers- en meldingsvoorkeuren\n\nWij gebruiken geen tracking-cookies, advertentiecookies of cookies van derden voor analyses.",
      },
      {
        title: "10. Prijsdatabronnen",
        content: "Energieprijzen zijn afkomstig van publiek beschikbare gegevens:\nâ€¢ Elektriciteit: Energy-Charts.info (Fraunhofer ISE), Elia Open Data (CC BY 4.0), ENTSO-E\nâ€¢ Gas: ICE EEX TTF-aardgasindex\n\nGetoonde prijzen zijn groothandelsprijzen en vertegenwoordigen geen retailtarieven. Leverancierstarieven worden wekelijks bijgewerkt en weerspiegelen mogelijk niet de meest recente tarieven. Verifieer altijd bij uw leverancier voordat u overstapt.",
      },
      {
        title: "11. Contact",
        content: "Voor privacy-gerelateerde vragen of gegevensverzoeken:\nðŸ“§ hello@smartprice.be\n\nWij streven ernaar binnen 30 dagen te reageren, zoals vereist door de AVG.",
      },
    ],
  },

  fr: {
    title: "Politique de confidentialitÃ©",
    updated: "SmartPrice.be Â· DerniÃ¨re mise Ã  jour : mars 2026",
    close: "âœ• Fermer",
    footer: "ðŸ‡ªðŸ‡º SmartPrice.be est conforme au RGPD Â· DonnÃ©es stockÃ©es dans l'Union europÃ©enne Â· Belgique",
    questions: "Des questions ?",
    sections: [
      {
        title: "1. Qui sommes-nous",
        content: "SmartPrice.be est une application belge de surveillance des prix de l'Ã©nergie. Nous affichons les prix de l'Ã©lectricitÃ© EPEX Spot en temps rÃ©el et les prix du gaz naturel TTF, et aidons les consommateurs belges Ã  prendre des dÃ©cisions Ã©nergÃ©tiques Ã©clairÃ©es.\n\nCe service est fourni Ã  titre informatif uniquement et ne constitue pas un conseil financier ou Ã©nergÃ©tique. VÃ©rifiez toujours les tarifs directement auprÃ¨s de votre fournisseur avant de changer.",
      },
      {
        title: "2. DonnÃ©es collectÃ©es",
        content: "Nous ne collectons que les donnÃ©es strictement nÃ©cessaires :\nâ€¢ Adresse e-mail (pour la crÃ©ation de compte et les alertes de prix)\nâ€¢ Nom (optionnel, pour la personnalisation)\nâ€¢ PrÃ©fÃ©rence de fournisseur d'Ã©lectricitÃ©\nâ€¢ Seuil d'alerte de prix\nâ€¢ MÃ©thode de connexion (e-mail/mot de passe ou Google OAuth)\n\nNous ne collectons PAS de donnÃ©es de paiement, de localisation prÃ©cise ou d'historique de navigation.",
      },
      {
        title: "3. Utilisation de vos donnÃ©es",
        content: "Vos donnÃ©es sont utilisÃ©es exclusivement pour :\nâ€¢ Authentifier votre compte de maniÃ¨re sÃ©curisÃ©e\nâ€¢ Envoyer des alertes par e-mail quand les prix de l'Ã©lectricitÃ© passent sous votre seuil\nâ€¢ MÃ©moriser vos prÃ©fÃ©rences de fournisseur et d'alerte\nâ€¢ Personnaliser votre comparaison de tarifs Ã©nergÃ©tiques\nâ€¢ AmÃ©liorer l'application sur la base de modÃ¨les d'utilisation anonymisÃ©s",
      },
      {
        title: "4. Stockage & SÃ©curitÃ©",
        content: "Toutes les donnÃ©es personnelles sont stockÃ©es dans l'Union europÃ©enne :\nâ€¢ Base de donnÃ©es : Supabase (Irlande, UE) âœ…\nâ€¢ Backend : Railway (Pays-Bas, UE) âœ…\nâ€¢ Frontend : Vercel (rÃ©gion UE) âœ…\n\nLes mots de passe sont hachÃ©s avec bcrypt (standard industriel). Nous utilisons des tokens JWT pour l'authentification sÃ©curisÃ©e. Nous ne stockons jamais de mots de passe en clair.",
      },
      {
        title: "5. Partage de donnÃ©es",
        content: "Nous ne vendons, ne louons et ne partageons PAS vos donnÃ©es personnelles avec des tiers Ã  des fins commerciales.\n\nNous utilisons les sous-traitants suivants :\nâ€¢ Supabase (hÃ©bergement base de donnÃ©es, Irlande)\nâ€¢ Railway (hÃ©bergement backend, Pays-Bas)\nâ€¢ Resend (service d'envoi d'e-mails transactionnels)\nâ€¢ Google OAuth (si vous choisissez de vous connecter avec Google)\n\nTous les sous-traitants sont conformes au RGPD.",
      },
      {
        title: "6. RÃ©fÃ©rences & Relations commerciales",
        content: "SmartPrice.be peut percevoir une commission de rÃ©fÃ©rence lorsque vous changez de fournisseur d'Ã©nergie via un lien sur notre plateforme. Cela n'affecte pas le prix que vous payez â€” les tarifs des fournisseurs sont calculÃ©s et classÃ©s indÃ©pendamment selon le coÃ»t annuel rÃ©el.\n\nNous identifions clairement tout contenu sponsorisÃ© ou promu. Nos classements sont toujours basÃ©s sur le coÃ»t le plus bas pour votre profil de consommation, et non sur des relations commerciales.",
      },
      {
        title: "7. Vos droits (RGPD)",
        content: "ConformÃ©ment au RGPD, vous avez le droit Ã  :\nâ€¢ L'accÃ¨s â€” demander une copie de vos donnÃ©es personnelles\nâ€¢ La rectification â€” corriger des donnÃ©es inexactes\nâ€¢ L'effacement â€” supprimer votre compte et toutes les donnÃ©es associÃ©es\nâ€¢ La portabilitÃ© â€” recevoir vos donnÃ©es dans un format lisible par machine\nâ€¢ L'opposition â€” vous opposer au traitement de vos donnÃ©es\n\nUtilisez le bouton 'Supprimer mon compte' dans votre profil, ou Ã©crivez-nous Ã  hello@smartprice.be",
      },
      {
        title: "8. Conservation des donnÃ©es",
        content: "Nous conservons vos donnÃ©es aussi longtemps que votre compte est actif. Lorsque vous supprimez votre compte, toutes les donnÃ©es personnelles sont dÃ©finitivement effacÃ©es de nos systÃ¨mes dans les 30 jours. Les journaux d'e-mails peuvent Ãªtre conservÃ©s jusqu'Ã  90 jours Ã  des fins de sÃ©curitÃ©.",
      },
      {
        title: "9. Cookies & Stockage local",
        content: "SmartPrice.be utilise uniquement des cookies essentiels et le localStorage pour :\nâ€¢ L'authentification (tokens JWT)\nâ€¢ La prÃ©fÃ©rence de langue\nâ€¢ Les prÃ©fÃ©rences de fournisseur et d'alerte\n\nNous n'utilisons pas de cookies de suivi, de publicitÃ© ou d'analyse tiers.",
      },
      {
        title: "10. Sources des donnÃ©es de prix",
        content: "Les prix de l'Ã©nergie proviennent de donnÃ©es publiquement disponibles :\nâ€¢ Ã‰lectricitÃ© : Energy-Charts.info (Fraunhofer ISE), Elia Open Data (CC BY 4.0), ENTSO-E\nâ€¢ Gaz : indice ICE EEX TTF gaz naturel\n\nLes prix affichÃ©s sont des prix de gros et ne reprÃ©sentent pas des tarifs de dÃ©tail. Les tarifs des fournisseurs sont mis Ã  jour chaque semaine et peuvent ne pas reflÃ©ter les derniers taux. VÃ©rifiez toujours auprÃ¨s de votre fournisseur avant de changer.",
      },
      {
        title: "11. Contact",
        content: "Pour toute question relative Ã  la confidentialitÃ© ou demande de donnÃ©es :\nðŸ“§ hello@smartprice.be\n\nNous nous engageons Ã  rÃ©pondre dans les 30 jours, comme l'exige le RGPD.",
      },
    ],
  },
};

export default function PrivacyPolicy({ onClose }) {
  const { lang } = useLanguage();
  const P = POLICIES[lang] || POLICIES.en;

  useEffect(() => {
    document.title = "Privacy Policy | SmartPrice.be";
    const desc = document.querySelector("meta[name='description']");
    if (desc) desc.setAttribute("content", "SmartPrice.be privacy policy â€” GDPR compliant. Learn how we handle your data, price alerts, and account information.");
    const canonical = document.getElementById('canonical-tag');
    if (canonical) canonical.setAttribute("href", "https://smartprice.be/privacy");
    return () => { document.title = "SmartPrice.be â€” Belgium Real-Time Electricity & Gas Prices"; };
  }, []);

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
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>ðŸ”’ {P.title}</div>
            <div style={{ fontSize: 12, color: "#556", marginTop: 4 }}>{P.updated}</div>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "8px 14px", color: "#aaa", cursor: "pointer", fontSize: 13 }}>{P.close}</button>
        </div>

        {/* Sections */}
        {P.sections.map(({ title, content }) => (
          <div key={title} style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#0D9488", marginBottom: 8 }}>{title}</div>
            <div style={{ fontSize: 13, color: "#889", lineHeight: 1.8, whiteSpace: "pre-line" }}>{content}</div>
          </div>
        ))}

        {/* Footer */}
        <div style={{ marginTop: 8, padding: 16, background: "rgba(13,148,136,0.08)", border: "1px solid rgba(13,148,136,0.2)", borderRadius: 12, fontSize: 12, color: "#667", textAlign: "center" }}>
          {P.footer}
        </div>
        <div style={{ marginTop: 12, textAlign: "center", fontSize: 12, color: "#445" }}>
          {P.questions} <a href="mailto:hello@smartprice.be" style={{ color: "#0D9488" }}>hello@smartprice.be</a>
        </div>

        <button onClick={onClose} style={{ width: "100%", marginTop: 20, padding: "12px 0", borderRadius: 12, background: "linear-gradient(135deg,#0D9488,#1A56A4)", border: "none", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
          {P.close.replace("âœ• ", "")}
        </button>
      </div>
    </div>
  );
}
