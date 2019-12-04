import React from "react";
import * as dc from "dc";
import { scaleLinear, scaleSymlog } from "d3";
import { ChartTemplate } from "./chartTemplate";
import { SrcContext } from "./srcContext";
import * as reductio from "reductio";

const fileChartFunc = (divRef, ndx) => {
    console.log("Inside fileChart func")
    console.log(ndx);
    const fileChart = dc.rowChart(divRef);

    const dimension = ndx.dimension(d=> d.Fname);
    const fileGroup = dimension.group();
    const reducer = reductio().count(true);
    reducer(fileGroup);
    const group = dimension.group().reduceSum(function(d) {return d.Count;});
    const xscale = scaleSymlog().domain([0, 1000000]).range([0, 750]);
    fileChart
    .width(800)
    .height(600)
    .dimension(dimension)
    .group(group)
    .x(xscale)
    .linearColors(["#fa9ec3", "#f86da5", "#f63c86" , "#db0a5e" , "#950740" ])
    .colorAccessor(function(d) { 
        var i;
        var val;
        var vals = fileGroup.top(Infinity);
        for (i = 0; i < vals.length; i++) {
            if (vals[i].key === d.key) {
                val = vals[i].value.count;
            }
        }
        if (val <= 25) {
            return 0;
        } else if (val > 25 && val <= 50) {
            return 1;
        } else if (val > 50 && val <= 75) {
            return 2;
        } else if (val > 75 && val <= 100) {
            return 3;
        } else {
            return 4;
        }
    });

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