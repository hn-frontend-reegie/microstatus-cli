import { wait } from "./common.js";
import cliTable from "cli-table";
import FormData from "form-data";

export const ATTENDANCE = {
  TIME_IN: "W1",
  TIME_OUT: "W2",
};

export const logAttendance = async (page, type) => {
  try {
    const log = await page.evaluate(async (type) => {
      const data = new FormData();
      data.append("stat", type);

      const response = await fetch("/employees/empdashboard/poststatus", {
        method: "POST",
        body: data,
      }).then((response) => response.json());

      return { in: response.TimeIn, out: response.TimeOut };
    }, type);

    return response(undefined, log);
  } catch (error) {
    return response(error.message);
  }
};

export const printLog = (log) => {
  const table = new cliTable({
    head: ["Time In", "Time Out"],
    colWidths: [15, 15],
  });

  table.push([log.in, log.out]);
  console.log(table.toString());
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

const response = (errorMessage, log) => {
  return {
    success: errorMessage === undefined,
    message: errorMessage ?? "",
    log,
  };
};
