import React from "react";
import * as dc from "dc";
import { scaleLinear } from "d3";
import { ChartTemplate } from "./chartTemplate";
import { numberFormat } from "./cxContext";

const eventsChartFunc = (divRef, ndx) => {
    const eventsChart = dc.barChart(divRef);
    const dimension = ndx.dimension(d=> d.NumEvents);
    const group = dimension.group(function (d) { return Math.floor(d / 20) * 20; });
    eventsChart
    .dimension(dimension)
    .group(group)
    .gap(1)
    .x(scaleLinear().domain([0,400]).rangeRound([0, 10 * 20]))
    .y(scaleLinear().domain([0, 10000]))
    .valueAccessor(x=>x.value)
    .centerBar(true)
    .xUnits(function() { return 21; })
    .renderHorizontalGridLines(true)
    .filterPrinter( (filters) => {
        var filter = filters[0], s = '';
        s += numberFormat(filter[0]) + ' -> ' + numberFormat(filter[1]);
        return s;
    });

    eventsChart.xAxis().tickFormat(
        function (v) { return v; }  
    );

    eventsChart.yAxis().ticks(10).tickFormat(
        function (v) { return v / 1000 + 'K'; }
    );

    return eventsChart;
}

export const EventsChart = props => (
    <ChartTemplate chartFunction={eventsChartFunc} title="Num Events distribution" />
)