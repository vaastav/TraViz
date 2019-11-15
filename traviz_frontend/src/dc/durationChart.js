import React from "react";
import * as dc from "dc";
import { scaleLinear } from "d3";
import { ChartTemplate } from "./chartTemplate";
import { numberFormat } from "./cxContext";

const durationChartFunc = (divRef, ndx) => {
    const durationChart = dc.barChart(divRef);
    const dimension = ndx.dimension(d=> d.Duration);
    const group = dimension.group(function (d) { return Math.floor(d / 50) * 50; });
    durationChart
    .dimension(dimension)
    .group(group)
    .gap(1)
    .x(scaleLinear().domain([0,1000]).rangeRound([0, 10 * 40]))
    .y(scaleLinear().domain([0, 2000]))
    .valueAccessor(x=>x.value)
    .centerBar(true)
    .xUnits(function() { return 21; })
    .round(dc.round.floor)
    .filterPrinter( (filters) => {
        var filter = filters[0], s= '';
        s += numberFormat(filter[0]) + 'ms -> ' + numberFormat(filter[1]) + 'ms';
        return s;
    });

    durationChart.xAxis().tickFormat(
        function (v) { return v;}
    );

    durationChart.yAxis().tickFormat(
        function (v) { return v;}
    );

    return durationChart;
}

export const DurationChart = props => (
    <ChartTemplate chartFunction={durationChartFunc} title="Latency Distribution" />
)