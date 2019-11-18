import React from "react";
import * as dc from "dc";
import * as d3 from "d3";
import { ChartTemplate } from "./chartTemplate";

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const dateChartFunc = (divRef, ndx) => {
    const dateChart = dc.barChart(divRef);
    const dimension = ndx.dimension(function(d) { return d.dd;});
    const dates = dimension.group(d3.timeDay);
    var startDate = dimension.bottom(1)[0].dd;
    startDate.setDate(dimension.bottom(1)[0].dd.getDate() - 1);
    dateChart
    .dimension(dimension)
    .group(dates)
    .round(d3.timeDay.round)
    .xUnits(function() { return 21; })
    .x(d3.scaleTime()
        .domain([startDate, dimension.top(1)[0].dd])
        .rangeRound([0, 10 * 10])
    );

    dateChart.xAxis().ticks(3).tickFormat(
        function (v) { return monthNames[v.getMonth()] + " " + v.getDate(); }
    )

    dateChart.yAxis().ticks(10).tickFormat(
        function (v) { return v / 1000 + 'K'; }
    );

    return dateChart;
}

export const DateChart = props => (
    <ChartTemplate chartFunction={dateChartFunc} title="Days of Traces" />
)