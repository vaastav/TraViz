import React from "react";
import * as dc from "dc";
import * as d3 from "d3";
import { ChartTemplate } from "./chartTemplate";

const dateChartFunc = (divRef, ndx) => {
    const dateChart = dc.barChart(divRef);
    const dimension = ndx.dimension(function(d) { return d.dd;});
    const dates = dimension.group(d3.timeDay);
    console.log(dimension.bottom(1));
    dateChart
    .dimension(dimension)
    .group(dates)
    .round(d3.timeDay.round)
    .x(d3.scaleTime()
        .domain([dimension.bottom(1)[0].dd, dimension.top(1)[0].dd])
        .rangeRound([0, 10 * 90])
    );

    return dateChart;
}

export const DateChart = props => (
    <ChartTemplate chartFunction={dateChartFunc} title="Days of Traces" />
)