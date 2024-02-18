#!/usr/bin/env node

import dotenv from "dotenv";
import puppeteer, { TimeoutError } from "puppeteer";
import ora from "ora";
import prompts from "prompts";
import os from "os";
import fs from "fs";
import path from "path";
import { login, verifyAuthCode } from "../services/auth.js";
import { ATTENDANCE, logAttendance, printLog } from "../services/attendance.js";

const spinner = ora({ color: "green" });

const loginUser = async (page) => {
  spinner.start("Logging you in.");

  await login(page, process.env.EMPLOYEE_ID, process.env.PASSWORD);

  spinner.succeed();
};

const startWork = async (page) => {
  spinner.start("Starting work.");

  const { success, message, log } = await logAttendance(
    page,
    ATTENDANCE.TIME_IN
  );

  if (!success) {
    await exitWithError(message);
  }

  spinner.succeed();
  printLog(log);
};

const endWork = async (page) => {
  spinner.start("Ending work session.");

  const { success, message, log } = await logAttendance(
    page,
    ATTENDANCE.TIME_OUT
  );

  if (!success) {
    await exitWithError(message);
  }

  spinner.succeed();
  printLog(log);
};

const doVerification = async (page) => {
  spinner.start("Checking for 2-step verification.");
  const authCodeSelector = "#googleAuthCode";

  try {
    await page.waitForSelector(authCodeSelector, { timeout: 2000 });

    spinner.succeed();
  } catch (error) {
    if (error instanceof TimeoutError) {
      spinner.info("2-step verification not needed, skipped.");
    } else {
      spinner.fail(error.message);
    }

    return;
  }

  await verifyAuthCode(page, spinner);
};

const exitWithError = async (message) => {
  spinner.fail(message);

  process.exit();
};

const run = async () => {
  const userChoices = await prompts([
    {
      type: "select",
      name: "action",
      message: "What do you want to do?",
      choices: [
        { title: "Attendance: Time-in", value: "attendance:in" },
        { title: "Attendance: Time-out", value: "attendance:out" },
      ],
    },
  ]);

  spinner.start("Initializing.");

  const browser = await puppeteer.launch({
    // headless: process.env.NODE_ENV === "development" ? false : "new",
    headless: false,
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

  switch (userChoices.action) {
    case "attendance:out":
      await endWork(page);
      break;
    case "attendance:in":
      await startWork(page);
      break;
  }

  spinner.stop();
  process.exit();
};

const loadConfiguration = () => {
  if (process.env.NODE_ENV === "development") {
    dotenv.config();
  } else {
    const userHomeDir = os.homedir();
    const homeConfig = path.join(userHomeDir, ".microstatuscliconfig");

    if (!fs.existsSync(homeConfig)) {
      spinner.fail("Config file not found.");

      spinner.info(
        `Please create a file ${homeConfig} containing your configuration.`
      );

      process.exit();
    }

    dotenv.config({ path: homeConfig });
  }
};

loadConfiguration();
await run();
