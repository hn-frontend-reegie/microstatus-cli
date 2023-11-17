import { clickElement, wait, waitForText } from "./common.js";
import cliTable from "cli-table";

export const timeIn = async (page) => {
  try {
    const selector = "#btndiv_W1";
    const button = await page.waitForSelector(selector);

    await wait(1500);

    const isDisabled = await page.evaluate(
      (el) => el.classList.contains("dashboard-button-off"),
      button
    );

    if (isDisabled) {
      return response("You have already started work for today.");
    }

    await clickElement(page, `${selector} .dashboard-button-div`);

    return response();
  } catch (error) {
    return response(error.message);
  }
};

export const timeOut = async (page) => {
  try {
    const endWorkSelector = "#btndiv_EW";
    const button = await page.waitForSelector(endWorkSelector);

    await wait(1500);

    const isDisabled = await page.evaluate(
      (el) => el.classList.contains("dashboard-button-off"),
      button
    );

    if (isDisabled) {
      return response("You have already ended work for today.");
    }

    await clickElement(page, `${endWorkSelector} .dashboard-button-div`);

    await waitForText(page, "Are you sure you want to End your shift?");

    await clickElement(page, ".ms-dialog-buttonset button:first-of-type");
  } catch (error) {
    return response(error.message);
  }
};

export const printAttendance = async (page) => {
  try {
    await page.waitForSelector("#graphDiv");

    await wait(1500);

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

    const table = new cliTable({
      head: ["Time In", "Time Out"],
      colWidths: [15, 15],
    });

    table.push([login, logout]);
    console.log(table.toString());
  } catch (error) {
    console.log(`Error: ${error.message}`);
  }
};

const response = (message) => {
  return {
    success: message === null,
    message: message ?? "",
  };
};
