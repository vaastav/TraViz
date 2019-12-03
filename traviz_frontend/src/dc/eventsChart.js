import React from "react";
import * as dc from "dc";
import { scaleLinear, scaleSymlog } from "d3";
import { ChartTemplate } from "./chartTemplate";
import { numberFormat } from "./cxContext";
import { CXContext } from "./cxContext";

const eventsChartFunc = (divRef, ndx) => {
    const eventsChart = dc.barChart(divRef);
    const dimension = ndx.dimension(d=> d.NumEvents);
    const group = dimension.group(function (d) { return Math.floor(d / 20) * 20; });
    var yscale = scaleSymlog().domain([0, 10000]).range([0, 1000]);
    eventsChart
    .dimension(dimension)
    .group(group)
    .gap(1)
    .x(scaleLinear().domain([0,400]).rangeRound([0, 10 * 20]))
    .y(yscale)
    .valueAccessor(x=>x.value)
    .centerBar(false)
    .xUnits(function() { return 21; })
    .renderHorizontalGridLines(true)
    .filterPrinter( (filters) => {
        var filter = filters[0], s = '';
        s += numberFormat(filter[0]) + ' -> ' + numberFormat(filter[1]);
        return s;
    });

    eventsChart.ordinalColors(['#950740'])

    eventsChart.xAxis().tickFormat(
        function (v) { return v; }  
    );

    eventsChart.yAxis().tickValues([1, 10, 100, 1000, 10000]).tickFormat(
        function (v) { 
            if((v % 1000) === 0) {
                return v/1000 + 'K'; 
            }
            return v;
        }
    );

    return eventsChart;
}

export const EventsChart = props => (
    <ChartTemplate chartFunction={eventsChartFunc} context={React.useContext(CXContext)} title="Num Events distribution" />
)