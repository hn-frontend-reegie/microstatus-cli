#!/usr/bin/env node

import dotenv from "dotenv";
import puppeteer, { TimeoutError } from "puppeteer";
import ora from "ora";
import prompts from "prompts";
import { login, verifyAuthCode } from "../services/auth.js";
import { closeAnnouncements, closeDialogs } from "../services/common.js";
import { printAttendance, timeIn, timeOut } from "../services/attendance.js";

dotenv.config();
const spinner = ora({ color: "green" });

const loginUser = async (page) => {
  spinner.start("Logging you in.");

  await login(page);

  spinner.succeed();
};

const removePopups = async (page) => {
  spinner.start("Removing dialogs and popups.");

  await closeAnnouncements(page);
  await closeDialogs(page);

  spinner.succeed();
};

const startWork = async (page) => {
  spinner.start("Starting work.");

  const { success, message } = await timeIn(page);

  if (!success) {
    await exitWithError(page, message, true);
  }

  spinner.succeed();

  await printAttendance(page);
};

const endWork = async (page) => {
  spinner.start("Ending work session.");

  const { success, message } = await timeOut(page);

  if (!success) {
    await exitWithError(page, message, true);
  }

  spinner.succeed();

  await printAttendance(page);
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

const exitWithError = async (page, message, showLogs) => {
  spinner.fail(message);

  if (showLogs) {
    await printAttendance(page);
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
        { title: "Attendance: Time-in", value: "attendance:in" },
        { title: "Attendance: Time-out", value: "attendance:out" },
      ],
    },
  ]);

  spinner.start("Initializing.");

  const browser = await puppeteer.launch({
    headless: process.env.NODE_ENV === "development" ? false : "new",
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

await run();
