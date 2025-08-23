
import { NotificationService } from "../../src/services/notificationService";
import nodemailer from "nodemailer";

jest.mock("nodemailer");
const sendMailMock = jest.fn().mockResolvedValue(true);
(nodemailer.createTransport as jest.Mock).mockReturnValue({ sendMail: sendMailMock });

describe("NotificationService", () => {
  const service = new NotificationService();

  it("envía correo con los parámetros correctos", async () => {
    await service.sendEmail({
      to: "test@gnew.org",
      subject: "Test Subject",
      message: "Mensaje de prueba",
    });

    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "test@gnew.org",
        subject: "Test Subject",
        text: "Mensaje de prueba",
      })
    );
  });
});


/apps/dao-voting/package.json (fragmento)

{
  "scripts": {
    "test:services": "jest tests/services/**/*.test.ts"
  }
}


✅ Puntero interno actualizado: último ejecutado N355.

