#!/usr/bin/env node

import dotenv from "dotenv";
import puppeteer from "puppeteer";
import ora from "ora";
import prompts from "prompts";

dotenv.config();
const spinner = ora({ color: "green" });

const loginUser = async (page) => {
  spinner.start("Logging you in.");

  const employeeButton = "#Emp";
  await page.waitForSelector(employeeButton);
  await page.click(employeeButton);

  const idInput = "#IDEmp";
  const passwordInput = "#Password";

  await page.type(idInput, process.env.EMPLOYEE_ID);
  await page.type(passwordInput, process.env.PASSWORD);

  const submitBtn = ".box_loginbut a";
  await page.waitForSelector(submitBtn);
  await page.click(submitBtn);

  spinner.succeed();
};

const removePopups = async (page) => {
  spinner.start("Removing dialogs and popups.");

  try {
    await page.waitForSelector("#announcements");

    await page.evaluate(() => {
      const announcements = document.getElementById("announcements");
      announcements.remove();
    });
  } catch (error) {
    console.log("No announcements.");
  }

  await closeDialog(page);

  spinner.succeed();
};

const closeDialog = async (page) => {
  try {
    await page.waitForSelector(".ms-dialog");

    await page.evaluate(() => {
      const dialogs = document.querySelectorAll(".ms-dialog");
      dialogs.forEach((dialog) => {
        const closeButton = dialog.querySelector(".ms-dialog-titlebar-close");
        closeButton.click();
      });
    });
  } catch (error) {
    console.log("No dialog to close.");
  }
};

const startWork = async (page) => {
  spinner.start("Starting work.");

  try {
    const selector = "#btndiv_W1";
    const button = await page.waitForSelector(selector);

    const isDisabled = await page.evaluate(
      (el) => el.classList.contains("dashboard-button-off"),
      button
    );

    if (isDisabled) {
      exitWithInfo(page, "You have already started work for today.", true);
    }

    await clickElement(page, `${selector} .dashboard-button-div`);

    spinner.succeed();

    await printLogs(page);
  } catch (error) {
    spinner.fail(error.message);
  }
};

const endWork = async (page) => {
  spinner.start("Ending work session.");

  const endWorkSelector = "#btndiv_EW";
  const button = await page.waitForSelector(endWorkSelector);

  const isDisabled = await page.evaluate(
    (el) => el.classList.contains("dashboard-button-off"),
    button
  );

  if (isDisabled) {
    exitWithInfo(page, "You have already ended work for today.", true);
  }

  await clickElement(page, `${endWorkSelector} .dashboard-button-div`);

  await waitForText(page, "Are you sure you want to End your shift?");

  await clickElement(page, ".ms-dialog-buttonset button:first-of-type");

  spinner.succeed();

  await printLogs(page);
};

const doVerification = async (page) => {
  spinner.start("Checking for 2-step verification.");
  const authCodeSelector = "#googleAuthCode";

  try {
    await page.waitForSelector(authCodeSelector, { timeout: 2000 });

    spinner.succeed();
  } catch (error) {
    spinner.info("2-step verification not needed, skipped.");

    return;
  }

  let invalid = true;

  do {
    spinner.stop();
    const code = await promptForAuthCode();
    spinner.start("Executing verification.");
    await page.type(authCodeSelector, code);
    await page.click("#googleAuthCodeSubmit");

    try {
      await waitForText(page, "Invalid google code");
      spinner.fail("Wrong auth code. Please try again.");
      await closeDialog(page);

      invalid = true;
    } catch (error) {
      invalid = false;
      spinner.succeed();

      break;
    }
  } while (invalid);
};

const waitForText = (page, text, options = {}) => {
  return page.waitForFunction(
    (text) => document.querySelector("body").innerText.includes(text),
    { ...options },
    text
  );
};

const clickElement = async (page, selector) => {
  try {
    await page.evaluate((selector) => {
      const button = document.querySelector(selector);
      button.click();
    }, selector);
  } catch (error) {
    console.log("Problem clicking element", error.message);
  }
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

  return code;
};

const printLogs = async (page) => {
  const { login, logout } = await page.evaluate(() => {
    const columns = document.querySelectorAll(
      "#graphDiv table tr:first-child td"
    );

    function formatTime(time) {
      if (time === undefined) {
        return "N/a";
      }

      time = time.trim();

      if (time === "") {
        return "N/a";
      }

      return time;
    }

    return {
      login: formatTime(columns?.[0].textContent),
      logout: formatTime(columns?.[columns.length - 1].textContent),
    };
  });

  spinner.info(`Logs today: [ IN: ${login}, OUT: ${logout}]`);
};

const exitWithInfo = async (page, message, showLogs) => {
  spinner.info(message);

  if (showLogs) {
    await printLogs(page);
  }

  process.exit();
};

const run = async () => {
  const userChoices = await prompts([
    {
      type: "select",
      name: "action",
      message: "What do you want to do?",
      choices: [
        { title: "DTR Login", value: "dtr:in" },
        { title: "DTR Logout", value: "dtr:out" },
      ],
    },
  ]);

  spinner.start("Initializing.");

  const browser = await puppeteer.launch({
    headless: process.env.ENV === "dev" ? false : "new",
    devtools: true,
  });

  const context = await browser.createIncognitoBrowserContext();
  const page = await context.newPage();

  spinner.succeed();
  spinner.start("Connecting to MicroStatus.");

  await page.goto("https://www.microstatus.com/");

  spinner.succeed();

  await loginUser(page);
  await doVerification(page);
  await removePopups(page);

  switch (userChoices.action) {
    case "dtr:out":
      await endWork(page);
      break;
    case "dtr:in":
      await startWork(page);
      break;
  }

  spinner.stop();
  process.exit();
};

await run();
