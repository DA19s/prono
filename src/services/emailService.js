const nodemailer = require("nodemailer");

if (process.env.NODE_ENV !== "production") {
  console.log("SMTP_USER:", process.env.SMTP_USER);
  console.log("SMTP_PASS défini ? ", process.env.SMTP_PASS ? "oui" : "non");
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendInvitationEmail = async ({
  email,
  token,
  role,
  user,
}) => {
  let roleDescription;
    if (role === "ADMIN") { roleDescription = "en tant qu’administrateur"; }

  console.log(process.env.FRONTEND_URL);

  const url = `${process.env.FRONTEND_URL}/activate?id=${user.id}&token=${token}`;

  const html = `
    <p>Bonjour ${user.firstName},</p>
    <p>Vous avez été invité ${roleDescription} sur la plateforme Pronocan.</p>
    <p>Veuillez cliquer sur le lien ci-dessous pour activer votre compte et définir votre mot de passe :</p>
    <a href="${url}">Activer mon compte</a>
    <p>Si vous n’avez pas demandé cette invitation, veuillez ignorer cet email.</p>
    <p>Merci,<br/>L’équipe Pronocan</p>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"Pronocan" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Invitation à rejoindre Pronocan",
      html,
    });
    console.log("Email d'invitation envoyé :", info.response);
  } catch (error) {
    console.error("Erreur envoi invitation:", error.message);
  }
};
