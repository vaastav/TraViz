import React from "react";
import * as dc from "dc";
import { scaleLinear, scaleSymlog } from "d3";
import { ChartTemplate } from "./chartTemplate";
import { numberFormat } from "./cxContext";
import { CXContext } from "./cxContext";

const durationChartFunc = (divRef, ndx) => {
    const durationChart = dc.barChart(divRef);
    const dimension = ndx.dimension(d=> d.Duration);
    const group = dimension.group(function (d) { return Math.floor(d / 50) * 50; });
    durationChart
    .dimension(dimension)
    .group(group)
    .gap(1)
    .x(scaleLinear().domain([0,dimension.top(1)[0].Duration]).rangeRound([0, 10 * 40]))
    .y(scaleSymlog().domain([0, dimension.top(1)[0].Duration]))
    .valueAccessor(x=>x.value)
    .centerBar(false)
    .xUnits(function() { return 21; })
    .round(dc.round.floor)
    .filterPrinter( (filters) => {
        var filter = filters[0], s= '';
        s += numberFormat(filter[0]) + 'ms -> ' + numberFormat(filter[1]) + 'ms';
        return s;
    })
    .renderHorizontalGridLines(true)
    .width(450)
    .height(200);

    durationChart.ordinalColors(['#c6e1ec'])
    
    durationChart.xAxis().tickFormat(
        function (v) { return v;}
    );

    durationChart.yAxis().tickValues([1, 10, 100, 1000, 10000]).tickFormat(
        function (v) {             
            if((v % 1000) === 0) {
                return v/1000 + 'K'; 
            }
            return v;
        }
    );

    return durationChart;
}

export const DurationChart = props => (
    <ChartTemplate chartFunction={durationChartFunc} context={React.useContext(CXContext)} title="Latency Distribution" />
)
