import React from "react";
import * as dc from "dc";
import { scaleLinear } from "d3";
import { ChartTemplate } from "./chartTemplate";
import { SrcContext } from "./srcContext";

const fileChartFunc = (divRef, ndx) => {
    console.log("Inside fileChart func")
    console.log(ndx);
    const fileChart = dc.rowChart(divRef);

    const dimension = ndx.dimension(d=> d.Fname);
    const group = dimension.group().reduceSum(function(d) {return d.Count;});

    fileChart
    .width(768)
    .height(480)
    .dimension(dimension)
    .group(group)
    .x(scaleLinear())
    .elasticX(true);

    return fileChart;
}

export const FileChart = props => (
    <ChartTemplate chartFunction={fileChartFunc} context={React.useContext(SrcContext)} title="Distribution of Events across files" />
)