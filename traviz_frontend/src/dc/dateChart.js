import React from "react";
import * as dc from "dc";
import * as d3 from "d3";
import { ChartTemplate } from "./chartTemplate";
import { CXContext } from "./cxContext";

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const dateChartFunc = (divRef, ndx) => {
    const dateChart = dc.barChart(divRef);
    const dimension = ndx.dimension(function(d) { return d.dd;});
    const dates = dimension.group(d3.timeDay);
    var startDate = dimension.bottom(1)[0].dd;
    startDate.setDate(dimension.bottom(1)[0].dd.getDate() - 1);
    var endDate = dimension.top(1)[0].dd;
    endDate.setDate(dimension.top(1)[0].dd.getDate() + 1)
    dateChart
    .dimension(dimension)
    .group(dates)
    .round(d3.timeDay.round)
    .xUnits(function() { return 21; })
    .x(d3.scaleTime()
        .domain([startDate, endDate])
        .rangeRound([0, 10 * 10]))
    .y(d3.scaleSymlog().domain([0, 20000]));

    dateChart.ordinalColors(['#b1de00'])

    dateChart.xAxis().ticks(2).tickFormat(
        function (v) { return monthNames[v.getMonth()] + " " + v.getDate(); }
    )

    dateChart.yAxis().tickValues([1, 10, 100, 1000, 10000]).tickFormat(
        function (v) {             
            if((v % 1000) === 0) {
                return v/1000 + 'K'; 
            }
            return v;
        }
    );

    return dateChart;
}

export const DateChart = props => (
    <ChartTemplate chartFunction={dateChartFunc} context={React.useContext(CXContext)} title="Days of Traces" />
)