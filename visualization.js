let neu = {
    title: "Park side heading towards Huntington Ave.",
    color: "#0088FF",
    icon: "<svg width='50px' height='25px' aria-hidden=\"true\" focusable=\"false\"><use xlink:href=\"./images/icons.svg#neu\"></use></svg>"
};

let bmc = {
    title: "Park side heading towards Boston Med. Center",
    color: "#f678a7",
    icon: "<svg width='50px' height='25px' aria-hidden=\"true\" focusable=\"false\"><use xlink:href=\"./images/icons.svg#bmc\"></use></svg>"
};

let mapData = {
    n1: "medium",
    n2: "low",
    n3: "medium",
    n4: "high",
    b1: "medium",
    b2: "low",
    b3: "low",
    b4: "high"
};

let tooltipModel = {};

let tooltipDiv = d3.select("#map-holder").append("div")
    .attr("id", "tooltip")
    .style("display", "none");

// Init ParCoords globally
let pc;

let reset = true;

/**
 * Add event listeners to map paths
 */
let pathElements = Array.from(document.querySelectorAll('path, rect'));
pathElements.forEach(function (el) {
    if (el.id && el.id.includes('map_')) {
        el.addEventListener("mouseover", function () {
            hoverPath(el.id);
        });
        el.addEventListener("mouseout", function () {
            unhoverPath(el.id);
        });
        el.addEventListener("mousemove", function () {
            hoverPathMousemove(event, el.id);
        });
    }
});

let selectedRows = [];

/**
 * Create parallel coordinate chart and table with CSV data
 */
d3.csv("./data/survey-data.csv").then(function (data) {
    pc = createParallelCoordinates(data, data.columns);
    createTable(data, data.columns);
    highlightAllPaths();
});

/**
 * Read detail-on-demand data and populate model
 */
d3.csv("./data/demand-data.csv").then(function (data) {
    populateTooltipModel(data);
});

/**
 * Populate tooltip object with CSV data
 * @param {Object} data
 */
function populateTooltipModel(data) {
    tooltipModel.map_n1 = data[0];
    tooltipModel.map_n2 = data[1];
    tooltipModel.map_n3 = data[2];
    tooltipModel.map_n4 = data[3];
    tooltipModel.map_b1 = data[4];
    tooltipModel.map_b2 = data[5];
    tooltipModel.map_b3 = data[6];
    tooltipModel.map_b4 = data[7];
}

/**
 * Creates a table and appends to SVG
 * @param {Object} data
 * @param {Object} columns
 */
function createTable(data, columns) {
    const columnsCopy = [...columns];
    let svg = d3.select("#vis-svg");
    let table = svg.append("foreignObject")
        .attr("width", 700)
        .attr("height", 400)
        .append("xhtml:body")
        .append("table")
        .attr("id", "fo-table");
    let thead = table.append("thead");

    let tableSeparator = table.append("div").attr("id", "tbodySeparator");
    tableSeparator.append("h6").attr("id", "separatorHeader");
    d3.select("#separatorHeader").html("Selected Responses");

    table.append("tbody").attr("id", "tbodyForSelected");
    thead.append('tr')
        .selectAll('th')
        .data(columnsCopy)
        .enter()
        .append('th')
        .text(function (column) {
            return column
        });

    table.append("div")
        .attr("id", "tbodySeparator")
        .append("h6")
        .attr("id", "separatorHeader")
        .html("All Responses");
    let tbodyForMasterList = table.append("tbody")
        .attr("id", "tbodyForMasterList");
    renderTableRows("#tbodyForMasterList", data);
    tbodyForMasterList.selectAll('tr')
        .on('click', masterListRowOnClick);
    return table;
}

/**
 * Event for click on table
 * @param {object} data 
 */
function masterListRowOnClick(data) {
    if (reset) {
        pc.brushReset();
        reset = false
    }
    let selectedRow = d3.select(this);
    if (selectedRow.classed('selected')) {
        // remove the one in the selected table
        selectedRowOnClick(data);
    } else {
        selectedRows.push(data);
        renderTableRows("#tbodyForSelected", selectedRows);
    }
    selectedRow.classed('selected', !selectedRow.classed('selected'));
    highlightSelectedRows();
}

/**
 * Highlights table row and calls remaining brushing functions
 * @param {object} data 
 */
function selectedRowOnClick(data) {
    const toRemove = new Set([data.id]);
    selectedRows = selectedRows.filter(obj => !toRemove.has(obj.id));
    renderTableRows("#tbodyForSelected", selectedRows);
    highlightSelectedRows()
}


/**
 * Highlights selected rows in the table
 */
function highlightSelectedRows() {
    if (selectedRows.length !== 0) {
        pc.highlight(selectedRows);
        highlightPathsOnMap();
    } else {
        pc.unhighlight();
        highlightAllPaths();
    }
}

/**
 * Return a deep copy of the object passed in and remove the specified properties.
 * @param obj an object
 * @param props properties to be removed
 * @returns obj
 */
function removeProperties(obj, props) {
    let objCopy = JSON.parse(JSON.stringify(obj));
    props.forEach(function (p) {
        delete objCopy[p]
    });
    return objCopy;
}

/**
 * Highlights selected paths on map
 */
function highlightPathsOnMap() {
    clearMapHighlights();
    d3.select('#tbodyForSelected').selectAll('tr').select(function (d) {
        highlightPaths(d);
    });
}

/**
 * Highlights one selected path on the map
 * @param {Object} data
 */
function highlightPaths(data) {
    let paths = Object.values(removeProperties(data, ["Side of Residency", "id"]));
    paths.forEach(function (path) {
        let pathId = path.toLowerCase();
        let mapId = '#map_' + pathId;
        let congestion = mapData[pathId];
        let congestionColor = getCongestionColor(congestion);
        d3.select(mapId).attr("fill", congestionColor);
    });
}

/**
 * Unhighlights the selected paths
 */
function clearMapHighlights() {
    Object.keys(mapData).forEach(function (path) {
        let pathId = path.toLowerCase();
        let mapId = '#map_' + pathId;
        d3.select(mapId).attr("fill", 'white');
    });
}

/**
 * Highlights all paths on the map
 */
function highlightAllPaths() {
    Object.keys(mapData).forEach(function (path) {
        let pathId = path.toLowerCase();
        let mapId = '#map_' + pathId;
        let congestion = mapData[pathId];
        let congestionColor = getCongestionColor(congestion);
        d3.select(mapId).attr("fill", congestionColor);
    });
}

/**
 * Highlight path on hover if no responses are selected, and display
 * data on demand tooltip
 * @param {String} path
 */
function hoverPath(path) {
    tooltipDiv.style("display", "inline");
    // if something highlighted in table, disable map highlight
    let selectedPaths = d3.select('#tbodyForSelected').node();
}

/**
 * Un-Highlight path on hover if no responses are selected, and hide
 * data on demand tooltip
 * @param {String} path
 */
function unhoverPath(path) {
    tooltipDiv.style("display", "none");
}

/**
 * On moving mouse on path, move tooltip, display details
 * @param {MouseEvent} event
 */
function hoverPathMousemove(event, id) {
    if (tooltipModel[id]) {

        let pathData = tooltipModel[id];
        tooltipDiv
            .text('Path ' + pathData['Path'])
            .style("left", event.pageX + 10 + "px")
            .style("top", event.pageY + 15 + "px");

        let tooltipData1 = tooltipDiv.append("p")
            .attr("id", "tooltip-data-1")
            .text('Level of Congestion: ' + pathData['Level of Congestion']);

        let tooltipData2 = tooltipData1.append("p")
            .attr("id", "tooltip-tooltipData1-2")
            .text('Total Pedestrians: ' + pathData['Total Number of Pedestrians']);

        let tooltipData3 = tooltipData2.append("p")
            .attr("id", "tooltip-data-3")
            .text('Average (People/Hour): ' + pathData['Average (People/Hour)']);


        let tooltipData4 = tooltipData3.append("p")
            .attr("id", "tooltip-data-4")
            .text('Most Preferable: ' + pathData['Most Preferable']);


        let tooltipData5 = tooltipData4.append("p")
            .attr("id", "tooltip-data-5")
            .text('Least Preferable: ' + pathData['Least Preferable']);
    }
}

/**
 * Returns appropriate color representing congestion
 * @param {String} congestion
 */
function getCongestionColor(congestion) {
    let congestionColor = 'white';
    switch (congestion) {
        case 'low':
            congestionColor = '#d9d9d9';
            break;
        case 'medium':
            congestionColor = '#a6a6a6';
            break;
        case 'high':
            congestionColor = '#595959';
            break;
        default:
    }
    return congestionColor;
}

/**
 * Format a single resident response object to a list of objects.
 * Each object of the list has column and value properties.
 * The "Side of Residency" entry is handled explicitly because we
 * want to replace text with an svg icon.
 * @param response is a resident response object
 * @returns [] a list of objects where each object has column and value properties
 */
function residentResponseDataProcessing(response) {
    let sideOfRes = "Side of Residency";
    let id = "id";
    let result = [{column: response[id], value: response.id}];
    if (response[sideOfRes] === neu.title) {
        result.push({
            column: response[sideOfRes],
            value: neu.icon
        })
    } else {
        result.push({
            column: response[sideOfRes],
            value: bmc.icon
        })
    }
    for (let [key, value] of Object.entries(removeProperties(response, [sideOfRes, id]))) {
        result.push({column: key, value: response[key]})
    }
    return result;
}

/**
 * Append data to the end of the table. The table can be identified through its id.
 * The data is default to be formatted using the residentResponseDataProcessing function.
 * @param tableId is the target table's id
 * @param data is a list of objects
 * @param rowDataFormatter
 */
function renderTableRows(tableId, data, rowDataFormatter = residentResponseDataProcessing) {
    removeAllRowsFromTable(tableId);
    d3.select(tableId).selectAll('tr')
        .data(data)
        .enter()
        .append('tr')
        .selectAll('td')
        .data(response => rowDataFormatter(response))
        .enter()
        .append('td')
        .html(function (d) {
            return d.value;
        });
}

/**
 * Remove all rows from the target table. The table can be identified through its id.
 * @param tableId the id of the table in html
 */
function removeAllRowsFromTable(tableId) {
    d3.select(tableId).selectAll('tr').remove();
}

/**
 * This function is called whenever a user brushes the parallel coordinates.
 * It resets the survey response table to its initial state.
 */
function clearAllSelections() {
    removeAllRowsFromTable("#tbodyForSelected");
    d3.select("#tbodyForMasterList").selectAll("tr").classed("selected", false);
    selectedRows = [];
    pc.unhighlight();
    reset = true;
}

/**
 * Create ParallelCoordinate Table using d3.parcoords
 * @param {Object} data
 * @param {Object} coordinates
 */
function createParallelCoordinates(data, coordinates) {
    let config = {
        tickValues: ['N1', 'N2', 'N3', 'N4', 'B4', 'B3', 'B2', 'B1'],
        lineWidth: 2,
        alpha: 0.5
    };
    let pc = ParCoords(config)("#parcoords-holder");
    pc.data(data)
        .hideAxis([coordinates[0], coordinates[1]]) // hide the id and the side of residency on the paracoord
        .color(d => {
            let sideOfRes = d[coordinates[1]];
            if (sideOfRes === neu.title) {
                return neu.color
            } else {
                return bmc.color
            }
        })
        .render()
        .createAxes()
        .brushMode('1D-axes')
        .on('brushend', function (brushed) {
            clearAllSelections();
            if (brushed.length !== data.length) {
                d3.select('button').classed('button-disabled', true);
                removeAllRowsFromTable('#tbodyForSelected');
                renderTableRows('#tbodyForSelected', brushed);
                highlightPathsOnMap();
            } else {
                removeAllRowsFromTable('#tbodyForSelected');
                highlightAllPaths();
            }
        });

    return pc;
}
