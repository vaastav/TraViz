import React from "react";
import * as dc from "dc";
import { scaleLinear, scaleSymlog } from "d3";
import { ChartTemplate } from "./chartTemplate";
import { SrcContext } from "./srcContext";

const fileChartFunc = (divRef, ndx) => {
    console.log("Inside fileChart func")
    console.log(ndx);
    const fileChart = dc.rowChart(divRef);

    const dimension = ndx.dimension(d=> d.Fname);
    const group = dimension.group().reduceSum(function(d) {return d.Count;});
    const xscale = scaleSymlog().domain([0, 1000000]).range([0, 750]);
    fileChart
    .width(800)
    .height(600)
    .dimension(dimension)
    .group(group)
    .x(xscale);

    fileChart.xAxis().tickValues([1, 10, 100, 1000, 10000, 100000, 1000000]).tickFormat(
        function (v) {
            return v;
        }
    );

    return fileChart;
}

export const FileChart = props => (
    <ChartTemplate chartFunction={fileChartFunc} context={React.useContext(SrcContext)} title="Distribution of Events across files" />
)