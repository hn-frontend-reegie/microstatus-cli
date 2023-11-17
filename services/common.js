export const closeDialogs = async (page) => {
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

export const closeAnnouncements = async (page) => {
  try {
    await page.waitForSelector("#announcements");

    await page.evaluate(() => {
      const announcements = document.getElementById("announcements");
      announcements.remove();
    });
  } catch (error) {
    console.log("No announcements.");
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