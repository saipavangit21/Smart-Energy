/**
 * PrivacyPolicy.jsx — GDPR compliant privacy policy modal
 * Updated: March 2026 — NL/FR translations, gas prices, referral disclosure
 */
import { useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";

const POLICIES = {
  en: {
    title: "Privacy Policy",
    updated: "SmartPrice.be · Last updated: March 2026",
    close: "✕ Close",
    footer: "🇪🇺 SmartPrice.be is GDPR compliant · Data stored in the European Union · Belgium",
    questions: "Questions?",
    sections: [
      {
        title: "1. Who We Are",
        content: "SmartPrice.be is a Belgian energy price monitoring application. We display real-time EPEX Spot electricity prices and TTF natural gas prices, and help Belgian consumers make informed energy decisions.\n\nThis service is provided for informational purposes only and does not constitute financial or energy advice. Always verify tariffs directly with your supplier before switching.",
      },
      {
        title: "2. Data We Collect",
        content: "We collect only the minimum data necessary to provide our service:\n• Email address (for account creation and price alerts)\n• Name (optional, for personalisation)\n• Electricity supplier preference\n• Price alert threshold setting\n• Login method (email/password or Google OAuth)\n\nWe do NOT collect payment information, precise location data, or browsing history.",
      },
      {
        title: "3. How We Use Your Data",
        content: "Your data is used exclusively to:\n• Authenticate your account securely\n• Send price alert emails when electricity prices drop below your threshold\n• Remember your supplier preference and alert settings\n• Personalise your energy plan comparison results\n• Improve the application based on anonymised usage patterns",
      },
      {
        title: "4. Data Storage & Security",
        content: "All personal data is stored in the European Union:\n• Database: Supabase (Ireland, EU) ✅\n• Backend: Railway (Netherlands, EU) ✅\n• Frontend: Vercel (EU region) ✅\n\nPasswords are hashed using bcrypt (industry standard). We use JWT tokens for secure authentication. We never store plain-text passwords.",
      },
      {
        title: "5. Data Sharing",
        content: "We do NOT sell, rent, or share your personal data with third parties for commercial purposes.\n\nWe use the following sub-processors:\n• Supabase (database hosting, Ireland)\n• Railway (backend hosting, Netherlands)\n• Resend (transactional email delivery)\n• Google OAuth (if you choose to sign in with Google)\n\nAll sub-processors are GDPR compliant.",
      },
      {
        title: "6. Referral & Commercial Relationships",
        content: "SmartPrice.be may earn a referral commission when you switch to an energy supplier through a link on our platform. This does not affect the price you pay — supplier tariffs are independently calculated and ranked by real annual cost.\n\nWe clearly mark any sponsored or promoted content. Our rankings are always based on lowest cost for your usage profile, not commercial relationships.",
      },
      {
        title: "7. Your Rights (GDPR)",
        content: "Under GDPR, you have the right to:\n• Access — request a copy of your personal data\n• Rectification — correct inaccurate data\n• Erasure — delete your account and all associated data\n• Portability — receive your data in a machine-readable format\n• Objection — object to processing of your data\n\nTo exercise these rights, use the 'Delete My Account' button in your profile, or email us at hello@smartprice.be",
      },
      {
        title: "8. Data Retention",
        content: "We retain your data for as long as your account is active. When you delete your account, all personal data is permanently removed from our systems within 30 days. Email logs may be retained for up to 90 days for security purposes.",
      },
      {
        title: "9. Cookies & Local Storage",
        content: "SmartPrice.be uses only essential cookies and localStorage for:\n• Authentication (JWT tokens)\n• Language preference\n• Supplier and alert preferences\n\nWe do not use tracking cookies, advertising cookies, or third-party analytics cookies.",
      },
      {
        title: "10. Price Data Sources",
        content: "Energy prices are sourced from publicly available data:\n• Electricity: Energy-Charts.info (Fraunhofer ISE), Elia Open Data (CC BY 4.0), ENTSO-E\n• Gas: ICE EEX TTF Natural Gas index\n\nPrices shown are wholesale market prices and do not represent retail tariffs. Supplier tariffs are scraped weekly and may not reflect the latest rates. Always verify with your supplier before switching.",
      },
      {
        title: "11. Contact",
        content: "For privacy-related questions or data requests:\n📧 hello@smartprice.be\n\nWe aim to respond within 30 days as required by GDPR.",
      },
    ],
  },

  nl: {
    title: "Privacybeleid",
    updated: "SmartPrice.be · Laatste update: maart 2026",
    close: "✕ Sluiten",
    footer: "🇪🇺 SmartPrice.be voldoet aan de AVG · Gegevens opgeslagen in de Europese Unie · België",
    questions: "Vragen?",
    sections: [
      {
        title: "1. Wie zijn wij",
        content: "SmartPrice.be is een Belgische applicatie voor energieprijsmonitoring. We tonen realtime EPEX Spot-elektriciteitsprijzen en TTF-aardgasprijzen en helpen Belgische consumenten weloverwogen energiebeslissingen te nemen.\n\nDeze dienst is uitsluitend bedoeld voor informatiedoeleinden en vormt geen financieel of energieadvies. Verifieer tarieven altijd rechtstreeks bij uw leverancier voordat u overstapt.",
      },
      {
        title: "2. Gegevens die wij verzamelen",
        content: "Wij verzamelen alleen de minimaal noodzakelijke gegevens:\n• E-mailadres (voor accountaanmaak en prijsmeldingen)\n• Naam (optioneel, voor personalisatie)\n• Voorkeur voor elektriciteitsleverancier\n• Drempelwaarde voor prijsmelding\n• Inlogmethode (e-mail/wachtwoord of Google OAuth)\n\nWij verzamelen GEEN betalingsgegevens, nauwkeurige locatiegegevens of browsegeschiedenis.",
      },
      {
        title: "3. Hoe wij uw gegevens gebruiken",
        content: "Uw gegevens worden uitsluitend gebruikt om:\n• Uw account veilig te authenticeren\n• Prijsmeldingen te sturen wanneer elektriciteitsprijzen onder uw drempel dalen\n• Uw leveranciersvoorkeur en meldingsinstellingen te onthouden\n• Uw energietariefvergelijking te personaliseren\n• De applicatie te verbeteren op basis van geanonimiseerde gebruikspatronen",
      },
      {
        title: "4. Gegevensopslag & Beveiliging",
        content: "Alle persoonsgegevens worden opgeslagen in de Europese Unie:\n• Database: Supabase (Ierland, EU) ✅\n• Backend: Railway (Nederland, EU) ✅\n• Frontend: Vercel (EU-regio) ✅\n\nWachtwoorden worden gehasht met bcrypt (industriestandaard). We gebruiken JWT-tokens voor veilige authenticatie. We slaan nooit wachtwoorden in leesbare tekst op.",
      },
      {
        title: "5. Gegevensdeling",
        content: "Wij verkopen, verhuren of delen uw persoonsgegevens NIET met derden voor commerciële doeleinden.\n\nWij maken gebruik van de volgende sub-verwerkers:\n• Supabase (database-hosting, Ierland)\n• Railway (backend-hosting, Nederland)\n• Resend (transactionele e-mailbezorging)\n• Google OAuth (als u kiest om in te loggen met Google)\n\nAlle sub-verwerkers voldoen aan de AVG.",
      },
      {
        title: "6. Verwijzingen & Commerciële relaties",
        content: "SmartPrice.be kan een verwijzingsvergoeding ontvangen wanneer u via een link op ons platform overstapt naar een energieleverancier. Dit heeft geen invloed op de prijs die u betaalt — leverancierstarieven worden onafhankelijk berekend en gerangschikt op werkelijke jaarkosten.\n\nWe markeren gesponsorde of gepromote inhoud duidelijk. Onze rangschikkingen zijn altijd gebaseerd op de laagste kosten voor uw gebruiksprofiel, niet op commerciële relaties.",
      },
      {
        title: "7. Uw rechten (AVG)",
        content: "Onder de AVG heeft u het recht op:\n• Inzage — een kopie van uw persoonsgegevens opvragen\n• Rectificatie — onjuiste gegevens corrigeren\n• Verwijdering — uw account en alle bijbehorende gegevens verwijderen\n• Overdraagbaarheid — uw gegevens ontvangen in een machine-leesbaar formaat\n• Bezwaar — bezwaar maken tegen de verwerking van uw gegevens\n\nGebruik de knop 'Mijn account verwijderen' in uw profiel, of stuur een e-mail naar hello@smartprice.be",
      },
      {
        title: "8. Bewaartermijn",
        content: "We bewaren uw gegevens zolang uw account actief is. Wanneer u uw account verwijdert, worden alle persoonsgegevens binnen 30 dagen permanent verwijderd. E-maillogboeken kunnen tot 90 dagen worden bewaard voor beveiligingsdoeleinden.",
      },
      {
        title: "9. Cookies & Lokale opslag",
        content: "SmartPrice.be gebruikt alleen essentiële cookies en localStorage voor:\n• Authenticatie (JWT-tokens)\n• Taalvoorkeur\n• Leveranciers- en meldingsvoorkeuren\n\nWij gebruiken geen tracking-cookies, advertentiecookies of cookies van derden voor analyses.",
      },
      {
        title: "10. Prijsdatabronnen",
        content: "Energieprijzen zijn afkomstig van publiek beschikbare gegevens:\n• Elektriciteit: Energy-Charts.info (Fraunhofer ISE), Elia Open Data (CC BY 4.0), ENTSO-E\n• Gas: ICE EEX TTF-aardgasindex\n\nGetoonde prijzen zijn groothandelsprijzen en vertegenwoordigen geen retailtarieven. Leverancierstarieven worden wekelijks bijgewerkt en weerspiegelen mogelijk niet de meest recente tarieven. Verifieer altijd bij uw leverancier voordat u overstapt.",
      },
      {
        title: "11. Contact",
        content: "Voor privacy-gerelateerde vragen of gegevensverzoeken:\n📧 hello@smartprice.be\n\nWij streven ernaar binnen 30 dagen te reageren, zoals vereist door de AVG.",
      },
    ],
  },

  fr: {
    title: "Politique de confidentialité",
    updated: "SmartPrice.be · Dernière mise à jour : mars 2026",
    close: "✕ Fermer",
    footer: "🇪🇺 SmartPrice.be est conforme au RGPD · Données stockées dans l'Union européenne · Belgique",
    questions: "Des questions ?",
    sections: [
      {
        title: "1. Qui sommes-nous",
        content: "SmartPrice.be est une application belge de surveillance des prix de l'énergie. Nous affichons les prix de l'électricité EPEX Spot en temps réel et les prix du gaz naturel TTF, et aidons les consommateurs belges à prendre des décisions énergétiques éclairées.\n\nCe service est fourni à titre informatif uniquement et ne constitue pas un conseil financier ou énergétique. Vérifiez toujours les tarifs directement auprès de votre fournisseur avant de changer.",
      },
      {
        title: "2. Données collectées",
        content: "Nous ne collectons que les données strictement nécessaires :\n• Adresse e-mail (pour la création de compte et les alertes de prix)\n• Nom (optionnel, pour la personnalisation)\n• Préférence de fournisseur d'électricité\n• Seuil d'alerte de prix\n• Méthode de connexion (e-mail/mot de passe ou Google OAuth)\n\nNous ne collectons PAS de données de paiement, de localisation précise ou d'historique de navigation.",
      },
      {
        title: "3. Utilisation de vos données",
        content: "Vos données sont utilisées exclusivement pour :\n• Authentifier votre compte de manière sécurisée\n• Envoyer des alertes par e-mail quand les prix de l'électricité passent sous votre seuil\n• Mémoriser vos préférences de fournisseur et d'alerte\n• Personnaliser votre comparaison de tarifs énergétiques\n• Améliorer l'application sur la base de modèles d'utilisation anonymisés",
      },
      {
        title: "4. Stockage & Sécurité",
        content: "Toutes les données personnelles sont stockées dans l'Union européenne :\n• Base de données : Supabase (Irlande, UE) ✅\n• Backend : Railway (Pays-Bas, UE) ✅\n• Frontend : Vercel (région UE) ✅\n\nLes mots de passe sont hachés avec bcrypt (standard industriel). Nous utilisons des tokens JWT pour l'authentification sécurisée. Nous ne stockons jamais de mots de passe en clair.",
      },
      {
        title: "5. Partage de données",
        content: "Nous ne vendons, ne louons et ne partageons PAS vos données personnelles avec des tiers à des fins commerciales.\n\nNous utilisons les sous-traitants suivants :\n• Supabase (hébergement base de données, Irlande)\n• Railway (hébergement backend, Pays-Bas)\n• Resend (service d'envoi d'e-mails transactionnels)\n• Google OAuth (si vous choisissez de vous connecter avec Google)\n\nTous les sous-traitants sont conformes au RGPD.",
      },
      {
        title: "6. Références & Relations commerciales",
        content: "SmartPrice.be peut percevoir une commission de référence lorsque vous changez de fournisseur d'énergie via un lien sur notre plateforme. Cela n'affecte pas le prix que vous payez — les tarifs des fournisseurs sont calculés et classés indépendamment selon le coût annuel réel.\n\nNous identifions clairement tout contenu sponsorisé ou promu. Nos classements sont toujours basés sur le coût le plus bas pour votre profil de consommation, et non sur des relations commerciales.",
      },
      {
        title: "7. Vos droits (RGPD)",
        content: "Conformément au RGPD, vous avez le droit à :\n• L'accès — demander une copie de vos données personnelles\n• La rectification — corriger des données inexactes\n• L'effacement — supprimer votre compte et toutes les données associées\n• La portabilité — recevoir vos données dans un format lisible par machine\n• L'opposition — vous opposer au traitement de vos données\n\nUtilisez le bouton 'Supprimer mon compte' dans votre profil, ou écrivez-nous à hello@smartprice.be",
      },
      {
        title: "8. Conservation des données",
        content: "Nous conservons vos données aussi longtemps que votre compte est actif. Lorsque vous supprimez votre compte, toutes les données personnelles sont définitivement effacées de nos systèmes dans les 30 jours. Les journaux d'e-mails peuvent être conservés jusqu'à 90 jours à des fins de sécurité.",
      },
      {
        title: "9. Cookies & Stockage local",
        content: "SmartPrice.be utilise uniquement des cookies essentiels et le localStorage pour :\n• L'authentification (tokens JWT)\n• La préférence de langue\n• Les préférences de fournisseur et d'alerte\n\nNous n'utilisons pas de cookies de suivi, de publicité ou d'analyse tiers.",
      },
      {
        title: "10. Sources des données de prix",
        content: "Les prix de l'énergie proviennent de données publiquement disponibles :\n• Électricité : Energy-Charts.info (Fraunhofer ISE), Elia Open Data (CC BY 4.0), ENTSO-E\n• Gaz : indice ICE EEX TTF gaz naturel\n\nLes prix affichés sont des prix de gros et ne représentent pas des tarifs de détail. Les tarifs des fournisseurs sont mis à jour chaque semaine et peuvent ne pas refléter les derniers taux. Vérifiez toujours auprès de votre fournisseur avant de changer.",
      },
      {
        title: "11. Contact",
        content: "Pour toute question relative à la confidentialité ou demande de données :\n📧 hello@smartprice.be\n\nNous nous engageons à répondre dans les 30 jours, comme l'exige le RGPD.",
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
    if (desc) desc.setAttribute("content", "SmartPrice.be privacy policy — GDPR compliant. Learn how we handle your data, price alerts, and account information.");
    const canonical = document.querySelector("link[rel='canonical']");
    if (canonical) canonical.setAttribute("href", "https://smartprice.be/privacy");
    return () => { document.title = "SmartPrice.be — Belgium Real-Time Electricity & Gas Prices"; };
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
            <div style={{ fontSize: 22, fontWeight: 800 }}>🔒 {P.title}</div>
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
          {P.close.replace("✕ ", "")}
        </button>
      </div>
    </div>
  );
}