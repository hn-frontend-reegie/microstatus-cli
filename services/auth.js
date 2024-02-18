import prompts from "prompts";
import { closeDialogs, waitForText } from "./common.js";

export const login = async (page, employeeId, password) => {
  const employeeButton = "#Emp";
  await page.waitForSelector(employeeButton);
  await page.click(employeeButton);

  const idInput = "#IDEmp";
  const passwordInput = "#Password";

  await page.type(idInput, employeeId);
  await page.type(passwordInput, password);

  const submitBtn = ".box_loginbut a";
  await page.waitForSelector(submitBtn);
  await page.click(submitBtn);
};

export const verifyAuthCode = async (page, spinner) => {
  let invalid = true;

  do {
    spinner.stop();

    const code = await promptForAuthCode();

    spinner.start("Executing verification.");

    const authCodeSelector = "#googleAuthCode";
    await page.type(authCodeSelector, code);
    await page.click("#googleAuthCodeSubmit");

    try {
      await waitForText(page, "Invalid google code");

      spinner.fail("Wrong auth code. Please try again.");

      await closeDialogs(page);

      invalid = true;
    } catch (error) {
      invalid = false;
      spinner.succeed();

      break;
    }
  } while (invalid);
};

const promptForAuthCode = async () => {
  const { code } = await prompts({
    type: "number",
    name: "code",
    message: "Enter your auth code (6-digit)",
    validate: (value) => {
      const validation = /^[0-9]{6}$/;
      const valid = validation.test(value);

      if (!valid) {
        return "Please enter a valid 6-digit code!";
      }

      return valid;
    },
  });

  return code.toString();
};
