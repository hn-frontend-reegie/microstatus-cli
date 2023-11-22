import { TimeoutError } from "puppeteer";

export const closeDialogs = async (page) => {
  try {
    await page.waitForSelector(".ms-dialog", { timeout: 5000 });

    await page.evaluate(() => {
      const dialogs = document.querySelectorAll(".ms-dialog");
      dialogs.forEach((dialog) => {
        const closeButton = dialog.querySelector(".ms-dialog-titlebar-close");
        closeButton.click();
      });
    });
  } catch (error) {
    if (!(error instanceof TimeoutError)) {
      console.log(`Error: ${error.message}`);
    }
  }
};

export const closeAnnouncements = async (page) => {
  try {
    await page.waitForSelector("#announcements", { timeout: 5000 });

    await page.evaluate(() => {
      const announcements = document.getElementById("announcements");
      announcements.remove();
    });
  } catch (error) {
    if (!(error instanceof TimeoutError)) {
      console.log(`Error: ${error.message}`);
    }
  }
};

export const clickElement = async (page, selector) => {
  try {
    await page.evaluate((selector) => {
      const button = document.querySelector(selector);
      button.click();
    }, selector);
  } catch (error) {
    console.log(`Error: ${error.message}`);
  }
};

export const waitForText = (page, text, options = {}) => {
  return page.waitForFunction(
    (text) => document.querySelector("body").innerText.includes(text),
    { ...options },
    text
  );
};

export const wait = async (milliseconds) => {
  await new Promise((r) => setTimeout(r, milliseconds));
};
