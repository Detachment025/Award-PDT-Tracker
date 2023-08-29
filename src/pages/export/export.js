// React Icons
import { VscAdd } from "react-icons/vsc";
import { IconContext } from "react-icons";

// React.js and Next.js libraries
import { BottomDropDown } from "@/components/subcomponent/dropdown";
import { relativeToAbsoluteYear, getYear } from "@/utils/years";
import { Nothing } from "@/components/functionality/nothing";
import { StatCard } from "@/components/subcomponent/cards";
import { useContext, useState } from "react";
import { config } from "@/config/config";

// Custom Imports
import { DataContext } from "@/utils/data";

// React.js and Next.js libraries
import { useRouter } from "next/router";

// Util imports
import { titleize } from "@/utils/stringUtils";
import { max } from "moment/moment";

// Export component definition
export default function ExportComponent({ tracker }) {
  // Get functions provided by the data context
  const { data } = useContext(DataContext);

  // Set useStates and variables
  const [term, setTerm] = useState("AY");
  const listOfYears = Array.from({ length: 18 }, (_, i) =>
    i === 0 ? `AY (${getYear() - i})` : `AY-${i} (${getYear() - i})`
  );
  tracker = tracker || Object.keys(config)[0];

  // Create a router
  const router = useRouter();

  // Function to get the list of available items for the given academic year
  const getItems = () => {
    // Get the items from the given tracker
    const keys = Object.keys(data[tracker] || {});

    // Get the items that have the current year
    var itemList = [];
    for (var i = 0; i < keys.length; i++) {
      // Check if the iterated keys has the current year
      if (
        Object.keys(data[tracker][[keys[i]]]["terms"] || {}).includes(
          relativeToAbsoluteYear(term).toString()
        )
      ) {
        // Check if the iterated keys have a key status length of more than one
        if (
          data[tracker][[keys[i]]]["terms"][
            relativeToAbsoluteYear(term).toString()
          ][config[tracker]["key"]].length > 0
        ) {
          // Added iterated item to itemList
          itemList.push(keys[i]);
        }
      }
    }

    // Return the list
    return itemList;
  };

  // Export content to CSV
  const exportSixYear = async () => {
    // Fetch the items to be processed
    const iterItems = Object.keys(data[tracker]);

    // Build status category tracker map
    var statusCategoryMap = [];
    for (var item of iterItems) {
      var statusCategoryMap = [
        ...new Set([
          ...statusCategoryMap,
          ...data[tracker][item].statusCategories,
        ]),
      ];
    }

    // Iterate through the items and structure them for the CSV content to build
    // CSV content
    var pages = {};
    for (var page of statusCategoryMap) {
      // Build max map for padding
      var maxMap = {};
      for (var year = getYear(); year >= getYear() - 6; year--) {
        var maxItems = 0;
        for (var item of iterItems) {
          const iterValue = data[tracker][item]["terms"];
          if (!(year in iterValue)) continue;
          if (iterValue[year][page].length > maxItems)
            maxItems = iterValue[year][page].length;
        }
        maxMap[year] = maxItems;
      }

      // Iterate for the content of that page
      var content = [];
      for (var item of iterItems) {
        // Reset rowContent
        var rowContent = [item];

        // Iterate through a six year period and get the max
        for (var year = getYear(); year >= getYear() - 6; year--) {
          // If the year is empty, add an empty cell
          if (!(year.toString() in data[tracker][item]["terms"])) {
            rowContent.push("");
            continue;
          }

          // If not, append with pad for the year
          var yearIter = data[tracker][item]["terms"][year][page];
          const padCount = maxMap[year] - yearIter.length;
          for (var i = 0; i < padCount; i++) yearIter.push("");

          // Concatenate row
          rowContent = [...rowContent, ...yearIter];
        }

        // Concatenate row content to content
        content.push(rowContent);
      }

      // Build header for the content
      var header = [titleize(tracker)];
      for (var year = getYear(); year >= getYear() - 6; year--) {
        var rowContent = [year.toString()];
        for (var i = 0; i < maxMap[year] - 1; i++) rowContent.push("");
        header = [...header, ...rowContent];
      }

      // Compile page
      pages[page] = { header: header, content: content };
    }

    try {
      // Send a POST request to the '/api/export_csv' endpoint with the prepared
      // data and headers
      const response = await fetch("/api/export_csv", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(pages),
      });

      // Check if the request was successful
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      // Convert the response to a blob
      const blob = await response.blob();

      // Create a temporary URL for the received blob data (Excel content)
      const url = window.URL.createObjectURL(blob);

      // Create a download link element
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "data.xlsx");
      document.body.appendChild(link);

      // Programmatically click the link to start the download
      link.click();
    } catch (error) {
      // If any error occurs during the request or processing, log it to the
      // console
      console.error("Error exporting data:", error);
    }
  };

  // Export div to PDF function
  const exportToPDF = () => {
    // Get content of the div to print and make a new window
    const content = document.getElementById("printable");
    const newWindow = window.open("", "_blank");

    // get the external and inline styles of the original document
    const styles = [...document.styleSheets]
      .map((styleSheet) => {
        try {
          return [...styleSheet.cssRules]
            .map((rule) => rule.cssText)
            .join("\n");
        } catch {
          return "";
        }
      })
      .join("\n");

    // get the html of the content and inline its styles
    const html = `<div style="${
      getComputedStyle(content).cssText
    } margin: 30px;">${content.innerHTML}</div>`;

    // build a new document with the same styles and html
    newWindow.document.write(`
      <style>${styles}</style>
      ${html}
    `);

    // Finalize action
    newWindow.document.close();
    setTimeout(() => {
      newWindow.print();
    }, 500);
  };

  // No Data Recorded sub-component
  const NoDataRecorded = (
    <Nothing
      mainText={`No Data Recorded`}
      subText={
        <div className="flex text-md items-center justify-center">
          <button
            className="flex items-center justify-center bg-scarlet text-md
            px-2 py-[0.01rem] mr-1 rounded-lg text-white
            hover:bg-darkscarlet hover:-translate-y-[0.07rem]
            hover:drop-shadow-lg"
            onClick={() => {
              router.push("/add_edit");
            }}
          >
            <IconContext.Provider value={{ size: "1em", className: "mr-1" }}>
              <VscAdd />
            </IconContext.Provider>
            Add
          </button>
          <div>Some!</div>
        </div>
      }
    />
  );

  // Item lister component
  const ItemLister = (
    <div className="flex flex-col gap-3 overflow-y-scroll p-2">
      {getItems().map((item) => (
        <StatCard
          key={`exportable-${item}`}
          keyContent={item}
          valueContent={
            <div className="flex flex-col gap-4 text-3xl">
              {data[tracker][item]["terms"][
                relativeToAbsoluteYear(term).toString()
              ][config[tracker]["key"]].map((keyItem) => (
                <div key={`exportable-div-${keyItem}`}>{keyItem}</div>
              ))}
            </div>
          }
        />
      ))}
    </div>
  );

  // Render component
  return (
    <div
      className="flex flex-col items-center overflow-y-hidden h-full w-full
      gap-10"
    >
      <div
        className="flex flex-col overflow-y-hidden h-full w-1/2 gap-3"
        id="printable"
      >
        <div className="flex flex-row items-center gap-2">
          <div className="text-2xl">Persons {config[tracker]["key"]} for</div>
          <BottomDropDown
            listOfItems={listOfYears}
            setSelected={setTerm}
            headSize="xl"
          />
        </div>
        {Object.keys(data[tracker] || {}).length === 0
          ? NoDataRecorded
          : ItemLister}
      </div>
      <div className="flex-1 flex flex-row gap-3">
        <button
          className="text-white text-2xl rounded-lg shadow-lg
          bg-bermuda px-3 py-1 hover:bg-darkbermuda
          hover:-translate-y-[0.1rem] hover:shadow-md"
          onClick={exportSixYear}
        >
          Export 6 Year Report
        </button>
        <button
          className="text-white text-2xl rounded-lg shadow-lg
          bg-bermuda px-3 py-1 hover:bg-darkbermuda
          hover:-translate-y-[0.1rem] hover:shadow-md"
          onClick={exportToPDF}
        >
          Print/Export PDF
        </button>
        <button
          className="text-white text-2xl rounded-lg shadow-lg
          bg-bermuda px-3 py-1 hover:bg-darkbermuda
          hover:-translate-y-[0.1rem] hover:shadow-md"
          onClick={() => (window.location.href = "/api/download")}
        >
          Download Data
        </button>
      </div>
    </div>
  );
}
