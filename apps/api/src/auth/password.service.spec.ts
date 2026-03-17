import { PasswordService } from "./password.service";

describe("PasswordService", () => {
  const service = new PasswordService();

  it("hashes and verifies password values", async () => {
    const hash = await service.hash("ChangeMe123!");

    expect(hash).not.toEqual("ChangeMe123!");
    await expect(service.compare("ChangeMe123!", hash)).resolves.toBe(true);
    await expect(service.compare("wrong-password", hash)).resolves.toBe(false);
  });
});
