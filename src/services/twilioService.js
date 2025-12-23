const twilio = require("twilio");

// S'assurer que dotenv est chargé (au cas où le service est importé avant index.js)
if (!process.env.TWILIO_ACCOUNT_SID && !process.env.TWILIO_AUTH_TOKEN) {
  try {
    require('dotenv').config();
  } catch (e) {
    // dotenv déjà chargé ou erreur
  }
}

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const whatsappFrom =
  process.env.TWILIO_WHATSAPP_FROM || "whatsapp:+14155238886"; // sandbox Twilio

// Diagnostic des credentials
console.log("🔍 Diagnostic Twilio:");
console.log(`   TWILIO_ACCOUNT_SID: ${accountSid ? `${accountSid.substring(0, 4)}...${accountSid.substring(accountSid.length - 4)} (${accountSid.length} caractères)` : 'NON DÉFINI'}`);
console.log(`   TWILIO_AUTH_TOKEN: ${authToken ? `${authToken.substring(0, 4)}...${authToken.substring(authToken.length - 4)} (${authToken.length} caractères)` : 'NON DÉFINI'}`);
console.log(`   TWILIO_WHATSAPP_FROM: ${whatsappFrom}`);

let twilioClient = null;

if (accountSid && authToken) {
  try {
    twilioClient = twilio(accountSid, authToken);
    console.log("✅ Client Twilio WhatsApp initialisé");
  } catch (error) {
    console.error("❌ Erreur lors de l'initialisation du client Twilio:", error.message);
  }
} else {
  console.warn("⚠️ Twilio credentials manquants - WhatsApp désactivé");
  if (!accountSid) console.warn("   - TWILIO_ACCOUNT_SID manquant dans .env");
  if (!authToken) console.warn("   - TWILIO_AUTH_TOKEN manquant dans .env");
}

const normalizeWhatsAppNumber = (to) => {
  let phone = (to || "").trim();

  if (!phone.length) {
    throw new Error("Numéro de téléphone vide");
  }

  if (!phone.startsWith("whatsapp:")) {
    if (!phone.startsWith("+")) {
      if (phone.startsWith("221")) {
        phone = `+${phone}`;
      } else if (phone.startsWith("0")) {
        phone = `+221${phone.slice(1)}`;
      } else if (phone.length === 9) {
        phone = `+221${phone}`;
      } else {
        phone = `+${phone}`;
      }
    }
    phone = `whatsapp:${phone}`;
  }

  return phone;
};

const sendWhatsApp = async (to, message) => {
  if (!twilioClient) {
    console.warn("⚠️ WhatsApp non configuré - message non envoyé");
    return {
      success: false,
      error: "WhatsApp non configuré",
      simulated: true,
    };
  }

  try {
    const phone = normalizeWhatsAppNumber(to);
    console.log(`📱 Envoi WhatsApp à ${phone}...`);

    const result = await twilioClient.messages.create({
      from: whatsappFrom,
      to: phone,
      body: message,
    });

    console.log(`✅ WhatsApp envoyé - SID: ${result.sid}`);

    return {
      success: true,
      sid: result.sid,
      status: result.status,
      to: phone,
    };
  } catch (error) {
    console.error("❌ Erreur envoi WhatsApp:", error.message);
    return {
      success: false,
      error: error.message,
      code: error.code,
      moreInfo: error.moreInfo,
    };
  }
};

const sendVerificationCodeWhatsApp = async (to, firstName, verificationCode) => {
  // Afficher le code dans les logs pour le développement
  console.log(`\n🔐 ========================================`);
  console.log(`🔐 CODE DE VÉRIFICATION POUR ${to}:`);
  console.log(`🔐 Code: ${verificationCode}`);
  console.log(`🔐 Expire dans 10 minutes`);
  console.log(`🔐 ========================================\n`);

  const message = `🔐 *Code de vérification Pronocan*

Bonjour ${firstName},

Votre code de vérification est : *${verificationCode}*

Ce code expire dans 10 minutes.

Utilisez ce code pour finaliser votre inscription dans l'application Pronocan.

💬 Besoin d'aide ? Répondez à ce message.
_Pronocan - Pronostics CAN 2024_`;

  return sendWhatsApp(to, message);
};

const sendAccountActivatedWhatsApp = async (to, firstName) => {
  const message = `✅ *Compte activé - Pronocan*

Bonjour ${firstName},

Votre compte Pronocan a été activé avec succès ! 🎉

Vous pouvez maintenant vous connecter et commencer à faire vos pronostics sur la Coupe d'Afrique des Nations 2024.

Bonne chance avec vos pronostics ! ⚽

💬 Besoin d'aide ? Répondez à ce message.
_Pronocan - Pronostics CAN 2024_`;

  return sendWhatsApp(to, message);
};

module.exports = {
  sendWhatsApp,
  sendVerificationCodeWhatsApp,
  sendAccountActivatedWhatsApp,
  normalizeWhatsAppNumber,
};
