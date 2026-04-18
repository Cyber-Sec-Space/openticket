
jest.mock("../src/lib/settings", () => ({
  getGlobalSettings: jest.fn(),
  invalidateGlobalSettings: jest.fn()
}));
import { getGlobalSettings } from "../src/lib/settings";
jest.mock("isomorphic-dompurify", () => ({
  sanitize: (str) => str
}));
import {
  sendCriticalAlertEmail,
  sendIncidentAssignmentEmail,
  sendResolutionEmail,
  sendAssetCompromisedEmail,
  sendNewRegistrationAlertEmail,
  sendNewVulnerabilityAlertEmail,
  sendVerificationEmail,
  sendPasswordResetEmail
} from "../src/lib/mailer";
import { db } from "../src/lib/db";
import nodemailer from "nodemailer";

jest.mock("../src/lib/db", () => ({
  db: {
    systemSetting: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock("nodemailer", () => ({
  createTransport: jest.fn(),
}));

describe("Mailer payload and branching tests", () => {
  const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
  let sendMailMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    sendMailMock = jest.fn().mockResolvedValue(true);
    (nodemailer.createTransport as jest.Mock).mockReturnValue({
      sendMail: sendMailMock,
    });
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  const validSmtpSettings = {
    smtpEnabled: true,
    smtpHost: "smtp.example.com",
    smtpPort: 587,
    smtpUser: "testuser",
    smtpPassword: "password",
    smtpFrom: "test@openticket.local"
  };

  it("should return early if SMTP is disabled or settings missing", async () => {
    (getGlobalSettings as jest.Mock).mockResolvedValueOnce(null);
    await sendCriticalAlertEmail({ id: "1", title: "T", description: "D", severity: "HIGH", status: "NEW" }, ["test@test.com"]);
    expect(nodemailer.createTransport).not.toHaveBeenCalled();

    (getGlobalSettings as jest.Mock).mockResolvedValueOnce({ smtpEnabled: false });
    await sendCriticalAlertEmail({ id: "1", title: "T", description: "D", severity: "HIGH", status: "NEW" }, ["test@test.com"]);
    expect(nodemailer.createTransport).not.toHaveBeenCalled();
  });

  it("should configure secure correctly based on port", async () => {
    (getGlobalSettings as jest.Mock).mockResolvedValueOnce({ ...validSmtpSettings, smtpPort: 465 });
    (getGlobalSettings as jest.Mock).mockResolvedValueOnce({ ...validSmtpSettings, smtpPort: 465 }); // For getFromAddress
    await sendCriticalAlertEmail({ id: "1", title: "T", description: "D", severity: "HIGH", status: "NEW" }, ["test@test.com"]);
    
    expect(nodemailer.createTransport).toHaveBeenCalledWith(expect.objectContaining({ secure: true }));
  });

  it("should fallback to default from address if not provided", async () => {
    (getGlobalSettings as jest.Mock).mockResolvedValueOnce(validSmtpSettings);
    (getGlobalSettings as jest.Mock).mockResolvedValueOnce({ smtpFrom: null }); // fallback
    await sendCriticalAlertEmail({ id: "1", title: "T", description: "D", severity: "HIGH", status: "NEW" }, ["test@test.com"]);
    
    expect(sendMailMock).toHaveBeenCalledWith(expect.objectContaining({ from: '"OpenTicket SOC" <noreply@openticket.local>' }));
  });

  it("should catch and log sendMail rejections", async () => {
    sendMailMock.mockRejectedValueOnce(new Error("SMTP down"));
    (getGlobalSettings as jest.Mock).mockResolvedValue(validSmtpSettings); // return valid for both getTransporter and getFromAddress

    await sendCriticalAlertEmail({ id: "1", title: "T", description: "D", severity: "HIGH", status: "NEW" }, ["test@test.com"]);
    expect(consoleErrorSpy).toHaveBeenCalledWith("SMTP Error:", expect.any(Error));
  });

  describe("Function bindings", () => {
    beforeEach(() => {
      (getGlobalSettings as jest.Mock).mockResolvedValue(validSmtpSettings);
    });

    it("should abort if target emails array is empty", async () => {
      await sendCriticalAlertEmail({ id: "1", title: "T", description: "D", severity: "HIGH", status: "NEW" }, []);
      expect(sendMailMock).not.toHaveBeenCalled();

      await sendAssetCompromisedEmail("Asset", "127.0.0.1", []);
      expect(sendMailMock).not.toHaveBeenCalled();

      await sendNewRegistrationAlertEmail("u@example.local", "User", []);
      expect(sendMailMock).not.toHaveBeenCalled();

      await sendNewVulnerabilityAlertEmail("CVE", "HIGH", []);
      expect(sendMailMock).not.toHaveBeenCalled();
    });

    it("should abort if email strings are falsy", async () => {
      await sendIncidentAssignmentEmail("inc", "title", "", "Name");
      expect(sendMailMock).not.toHaveBeenCalled();

      await sendResolutionEmail("inc", "title", "", "Name");
      expect(sendMailMock).not.toHaveBeenCalled();

      await sendVerificationEmail("", "name", "url");
      expect(sendMailMock).not.toHaveBeenCalled();

      await sendPasswordResetEmail("", "url");
      expect(sendMailMock).not.toHaveBeenCalled();
    });

    it("should generate sendCriticalAlertEmail payload", async () => {
      await sendCriticalAlertEmail({ id: "inc-1", title: "Title", description: "Desc", severity: "HIGH", status: "NEW" }, ["a@a.com", "b@b.com"]);
      expect(sendMailMock).toHaveBeenCalledWith(expect.objectContaining({ to: "a@a.com,b@b.com", subject: expect.stringContaining("INC-1") }));
    });

    it("should generate sendIncidentAssignmentEmail payload", async () => {
      await sendIncidentAssignmentEmail("inc-1", "Title", "a@a.com", "Name");
      expect(sendMailMock).toHaveBeenCalledWith(expect.objectContaining({ to: "a@a.com", subject: expect.stringContaining("Assigned") }));
    });

    it("should cover sendResolutionEmail", async () => {
      await sendResolutionEmail("inc-1", "Title", "a@test.com", "Name");
      expect(sendMailMock).toHaveBeenCalled();
      
      // Hit catch
      sendMailMock.mockRejectedValueOnce(new Error("Fail"));
      await sendResolutionEmail("inc-1", "Title", "a@test.com", "Name");
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it("should cover sendAssetCompromisedEmail", async () => {
      await sendAssetCompromisedEmail("Router", "", ["soc@test.com"]);
      expect(sendMailMock).toHaveBeenCalled();
      
      sendMailMock.mockRejectedValueOnce(new Error("Fail"));
      await sendAssetCompromisedEmail("Router", "", ["soc@test.com"]);
    });

    it("should cover sendNewRegistrationAlertEmail", async () => {
      await sendNewRegistrationAlertEmail("admin@local", "Admin", ["soc@test.com"]);
      expect(sendMailMock).toHaveBeenCalled();
      
      sendMailMock.mockRejectedValueOnce(new Error("Fail"));
      await sendNewRegistrationAlertEmail("admin@local", "Admin", ["soc@test.com"]);
    });

    it("should cover sendNewVulnerabilityAlertEmail", async () => {
      await sendNewVulnerabilityAlertEmail("ZeroDay", "CRITICAL", ["soc@test.com"]);
      expect(sendMailMock).toHaveBeenCalled();
      
      sendMailMock.mockRejectedValueOnce(new Error("Fail"));
      await sendNewVulnerabilityAlertEmail("ZeroDay", "CRITICAL", ["soc@test.com"]);
    });

    it("should cover sendVerificationEmail", async () => {
      await sendVerificationEmail("a@a.com", "Name", "https://t.com");
      expect(sendMailMock).toHaveBeenCalled();
      
      sendMailMock.mockRejectedValueOnce(new Error("Fail"));
      await sendVerificationEmail("a@a.com", "Name", "https://t.com");
    });

    it("should cover sendPasswordResetEmail", async () => {
      await sendPasswordResetEmail("a@a.com", "https://t.com");
      expect(sendMailMock).toHaveBeenCalled();
      
      sendMailMock.mockRejectedValueOnce(new Error("Fail"));
      await sendPasswordResetEmail("a@a.com", "https://t.com");
    });
    
    it("should hit catch blocks for assignment email", async () => {
      sendMailMock.mockRejectedValueOnce(new Error("Fail"));
      await sendIncidentAssignmentEmail("inc-1", "Title", "a@a.com", "Name");
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });
});
